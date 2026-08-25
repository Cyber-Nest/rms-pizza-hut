const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../../menu/models/product.model");
const Category = require("../../menu/models/category.model");
const Expense = require("../../expense/models/expense.model");
const Deposit = require("../models/deposit.model");
const DriverDropSettlement = require("../../delivery/models/DriverDropSettlement.model");
const AccountClosing = require("../models/AccountClosing.model");
const logger = require("../../../shared/utils/logger");
const {
  getLocalDateStr,
  getLocalStartOfDay,
  getLocalEndOfDay,
  getLocalHour,
  getLocalDayName,
} = require("../../../shared/utils/timezone");
const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;
const Payment = require("../../payment/models/payment.model");
const {
  triggerNewOrder,
  triggerOrderUpdated,
} = require("../../../config/pusher");

const round2 = (num) => {
  if (typeof num !== "number" || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const buildDateFilter = (start, end, baseFilter = {}) => {
  const normBase = { ...baseFilter };
  if (
    normBase.branchId &&
    typeof normBase.branchId === "string" &&
    mongoose.Types.ObjectId.isValid(normBase.branchId)
  ) {
    normBase.branchId = new mongoose.Types.ObjectId(normBase.branchId);
  }
  if (start && end) {
    return {
      $or: [
        {
          ...normBase,
          orderTiming: { $ne: "later" },
          createdAt: { $gte: start, $lte: end },
        },
        {
          ...normBase,
          orderTiming: "later",
          scheduledAt: { $gte: start, $lte: end },
        },
      ],
    };
  } else if (start) {
    return {
      $or: [
        {
          ...normBase,
          orderTiming: { $ne: "later" },
          createdAt: { $gte: start },
        },
        { ...normBase, orderTiming: "later", scheduledAt: { $gte: start } },
      ],
    };
  } else if (end) {
    return {
      $or: [
        {
          ...normBase,
          orderTiming: { $ne: "later" },
          createdAt: { $lte: end },
        },
        { ...normBase, orderTiming: "later", scheduledAt: { $lte: end } },
      ],
    };
  }
  return normBase;
};

let productLookupCache = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const getProductLookups = async () => {
  const now = Date.now();
  if (productLookupCache && now - lastCacheTime < CACHE_DURATION_MS) {
    return productLookupCache;
  }

  const categoryMap = {};
  const idMap = {};
  try {
    const products = await Product.find()
      .select("_id categoryId productId")
      .populate({ path: "categoryId", select: "name" })
      .lean();

    for (const p of products) {
      const prodId = p._id ? p._id.toString() : "";
      const catName =
        p.categoryId && typeof p.categoryId === "object"
          ? p.categoryId.name
          : "Other";
      if (prodId) {
        categoryMap[prodId] = catName;
        idMap[prodId] = p.productId || "";
      }
    }
    productLookupCache = { categoryMap, idMap };
    lastCacheTime = now;
  } catch (err) {
    logger.warn(`Could not build product lookup maps: ${err.message}`);
    if (!productLookupCache)
      productLookupCache = { categoryMap: {}, idMap: {} };
  }
  return productLookupCache;
};

exports.clearProductLookupCache = () => {
  productLookupCache = null;
  lastCacheTime = 0;
};

const getOrderBusinessDate = (order) => {
  return order.orderTiming === "later" && order.scheduledAt
    ? new Date(order.scheduledAt)
    : new Date(order.createdAt);
};

// ── Create Order ──────────────────────────────────────────────
exports.createOrder = async (orderData) => {
  try {
    const orderNumber = await Order.generateOrderNumber(
      orderData.orderType,
      orderData.orderTiming === "later" ? orderData.scheduledAt : null,
      orderData.branchId || null,
    );

    // If pay-later → paymentStatus = unpaid, no payments array needed
    let paymentStatus =
      orderData.paymentTiming === "pay-later" ? "unpaid" : "paid";
    let payments = orderData.payments || [];
    let paymentIntent = null;

    if (orderData.paymentMethod === "stripe" && orderData.paymentIntentId) {
      if (!stripe)
        throw new Error(
          "Stripe is not configured. STRIPE_SECRET_KEY is missing.",
        );
      // Query Stripe
      paymentIntent = await stripe.paymentIntents.retrieve(
        orderData.paymentIntentId,
        {
          expand: ["payment_method"],
        },
      );
      if (paymentIntent.status !== "succeeded") {
        throw new Error(
          `Stripe payment verification failed. Intent status: ${paymentIntent.status}`,
        );
      }

      // Extract card brand, card type (funding), and last 4
      const pmObj = paymentIntent.payment_method || {};
      const cardDetails =
        pmObj.card ||
        paymentIntent.charges?.data[0]?.payment_method_details?.card ||
        {};
      const cardBrand = cardDetails.brand || "";
      const cardFunding = cardDetails.funding || "";
      const cardLast4 = cardDetails.last4 || "";

      paymentStatus = "paid";
      payments = [
        {
          method: "card",
          amount: orderData.total,
          transactionId: orderData.paymentIntentId,
          cardBrand,
          cardFunding,
          cardLast4,
        },
      ];
    }

    let dueAt = orderData.dueAt;
    if (!dueAt) {
      if (orderData.orderTiming === "later" && orderData.scheduledAt) {
        dueAt = new Date(orderData.scheduledAt);
      } else {
        let prepTimeMinutes = 15;
        try {
          let b = null;
          if (orderData.branchId) {
            b = await Branch.findById(orderData.branchId)
              .select("settings")
              .lean();
          }
          if (!b) {
            b = await Branch.findOne().select("settings").lean();
          }
          if (b?.settings?.mainSettings?.defaultTimeMinutes) {
            prepTimeMinutes =
              Number(b.settings.mainSettings.defaultTimeMinutes) || 15;
          }
        } catch (e) {}
        dueAt = new Date(Date.now() + prepTimeMinutes * 60 * 1000);
      }
    }

    // Populate accurate kitchenLabels for all items and selectedModifiers from Product DB model
    try {
      const productIds = (orderData.items || [])
        .map((i) => i.menuItemId || i.productId)
        .filter(Boolean);
      if (productIds.length > 0) {
        const dbProducts = await Product.find({ _id: { $in: productIds } })
          .select("_id kitchenLabel modifierKitchenLabels")
          .lean();
        const prodMap = new Map(
          dbProducts.map((p) => [p._id.toString(), p.kitchenLabel]),
        );
        const modLabelMap = new Map();
        dbProducts.forEach((p) => {
          if (p.modifierKitchenLabels && p.modifierKitchenLabels.length > 0) {
            const groupMap = new Map(
              p.modifierKitchenLabels.map((m) => [m.groupId.toString(), m.kitchenLabel]),
            );
            modLabelMap.set(p._id.toString(), groupMap);
          }
        });

        orderData.items = (orderData.items || []).map((item) => {
          const itemKey = (item.menuItemId || item.productId || "").toString();
          const dbLabel = itemKey ? prodMap.get(itemKey) : undefined;
          const groupMap = itemKey ? modLabelMap.get(itemKey) : undefined;

          let currentRootLabel = dbLabel || item.kitchenLabel || "make_table";
          const updatedModifiers = (item.selectedModifiers || []).map((mod) => {
            let mappedModLabel = groupMap && mod.groupId ? groupMap.get(mod.groupId.toString()) : undefined;
            const isRootVal = mod.isRoot !== undefined ? mod.isRoot : true;
            
            if (isRootVal) {
              if (mappedModLabel) {
                currentRootLabel = mappedModLabel;
              } else if (mod.kitchenLabel) {
                currentRootLabel = mod.kitchenLabel;
              }
            } else {
              // Sub-modifier (child option like "Honey Garlic" under "Boneless Bites")
              if (!mappedModLabel && !mod.kitchenLabel) {
                mappedModLabel = currentRootLabel;
              }
            }

            return {
              ...mod,
              kitchenLabel: mappedModLabel || mod.kitchenLabel || currentRootLabel || null,
            };
          });

          return {
            ...item,
            kitchenLabel: dbLabel || item.kitchenLabel || "make_table",
            selectedModifiers: updatedModifiers,
          };
        });
      }
    } catch (e) {
      logger.warn(
        `Could not resolve DB product kitchenLabels in createOrder: ${e.message}`,
      );
    }

    const hasPizza = (orderData.items || []).some((item) => {
      const label = item.kitchenLabel || "make_table";
      const isItemPizza = label === "make_table" || label === "pizza";
      const hasPizzaMod = (item.selectedModifiers || []).some(
        (m) => m.kitchenLabel === "make_table" || m.kitchenLabel === "pizza",
      );
      return isItemPizza || hasPizzaMod;
    });
    const hasWings = (orderData.items || []).some((item) => {
      const label = item.kitchenLabel || "make_table";
      const isItemWings = label === "wings_station" || label === "chicken";
      const hasWingsMod = (item.selectedModifiers || []).some(
        (m) => m.kitchenLabel === "wings_station" || m.kitchenLabel === "chicken",
      );
      return isItemWings || hasWingsMod;
    });

    const makeTableStatus = hasPizza ? "pending" : "completed";
    const wingsStatus = hasWings ? "pending" : "completed";

    const order = new Order({
      ...orderData,
      makeTableStatus,
      wingsStatus,
      customer:
        orderData.customer &&
        orderData.customer.name &&
        orderData.customer.name.trim()
          ? orderData.customer
          : { name: "No Name", phone: "", email: "" },
      orderNumber,
      paymentStatus,
      payments,
      dueAt,
      tip: Number(orderData.tip) || 0,
      statusHistory: [
        {
          status: "pending",
          changedAt: new Date(),
          note: "New order placed",
          userName: orderData.placedBy || "Manager",
        },
      ],
    });

    await order.save();

    // Increment Promo Code usage if applied
    if (order.promoCode) {
      try {
        const promoService = require("../../promo/services/promo.service");
        promoService.incrementUsage(order.promoCode);
      } catch (err) {
        logger.error(`Failed to increment promo usage: ${err.message}`);
      }
    }

    // Trigger real-time notification to Kitchen via Pusher
    triggerNewOrder(order).catch((err) => {
      logger.error(`Error triggering real-time Pusher event: ${err.message}`);
    });

    // Save Payment audit document in database
    if (paymentIntent) {
      const charge = paymentIntent.charges?.data[0] || {};
      const cardDetails = charge.payment_method_details?.card || {};
      const cardBrand = cardDetails.brand || "";
      const cardFunding = cardDetails.funding || "";
      const cardLast4 = cardDetails.last4 || "";

      const paymentDoc = new Payment({
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        paymentMethod: "stripe",
        status: "succeeded",
        transactionId: orderData.paymentIntentId,
        cardBrand,
        cardFunding,
        cardLast4,
        rawStripeResponse: paymentIntent,
      });
      await paymentDoc.save();
    }

    logger.info(
      `Order created: ${orderNumber} for branch: ${order.branchName || "Main"}`,
    );
    return order;
  } catch (error) {
    logger.error(`Order Service Error: createOrder - ${error.message}`);
    throw error;
  }
};

// ── Get All Orders ────────────────────────────────────────────
exports.getAllOrders = async (filters = {}) => {
  try {
    let query = {};

    if (filters.branchId) {
      query.branchId = filters.branchId;
    }

    if (filters.status) {
      if (typeof filters.status === "string" && filters.status.includes(",")) {
        const statuses = filters.status.split(",");
        if (filters.excludeReceptionCompleted) {
          query.status = { $in: statuses };
          query.receptionCompleted = { $ne: true };
        } else {
          query.status = { $in: statuses };
        }
      } else {
        if (filters.excludeReceptionCompleted) {
          query.status = filters.status;
          query.receptionCompleted = { $ne: true };
        } else {
          query.status = filters.status;
        }
      }
    }
    if (filters.orderType) query.orderType = filters.orderType;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

    if (filters.excludeKitchenCleared) {
      query.kitchenCleared = { $ne: true };
    }

    // Date filter: single date or range (Local timezone boundaries)
    let start = null;
    let end = null;
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        start = getLocalStartOfDay(filters.startDate);
      }
      if (filters.endDate) {
        end = getLocalEndOfDay(filters.endDate);
      }
    } else if (filters.date) {
      start = getLocalStartOfDay(filters.date);
      end = getLocalEndOfDay(filters.date);
    }

    query = buildDateFilter(start, end, query);

    // Server-side search filter
    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      const searchOr = [
        { orderNumber: searchRegex },
        { "customer.name": searchRegex },
        { "customer.phone": searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    let selectFields =
      "orderNumber customer subtotal total orderType orderSource paymentStatus status makeTableStatus wingsStatus createdAt items orderTiming scheduledAt dueAt receptionCompleted";
    if (filters.fields) {
      selectFields = filters.fields.split(",").join(" ");
    }

    const isPaginated =
      filters.page !== undefined || filters.limit !== undefined;

    if (isPaginated) {
      const page = Math.max(1, parseInt(filters.page) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(filters.limit) || 50));
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .select(selectFields)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } else {
      // Non-paginated
      const orders = await Order.find(query)
        .select(selectFields)
        .sort({ createdAt: -1 })
        .limit(300)
        .lean();
      return orders;
    }
  } catch (error) {
    logger.error(`Order Service Error: getAllOrders - ${error.message}`);
    throw error;
  }
};

// ── Get Single Order ──────────────────────────────────────────
exports.getOrderById = async (id) => {
  try {
    const order = await Order.findById(id).lean();
    if (!order) throw new Error("Order not found.");
    return order;
  } catch (error) {
    logger.error(`Order Service Error: getOrderById - ${error.message}`);
    throw error;
  }
};

// ── Update Order Status ───────────────────────────────────────
exports.updateOrderStatus = async (
  id,
  status,
  note = "",
  receptionCompleted = undefined,
  userName = "Manager",
  station = undefined,
) => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found.");

    if (station === "make_table") {
      order.makeTableStatus = status;
    } else if (station === "wings_station") {
      order.wingsStatus = status;
    } else if (station === "cut_station") {
      if (status === "completed" || status === "ready") {
        order.makeTableStatus = "completed";
      } else {
        order.makeTableStatus = status;
      }
    } else {
      if (status === "in_oven") {
        order.makeTableStatus = "in_oven";
      } else if (status === "completed") {
        order.makeTableStatus = "completed";
        order.wingsStatus = "completed";
      } else if (status === "ready") {
        order.makeTableStatus = "ready";
        order.wingsStatus = "ready";
      } else {
        if (
          order.makeTableStatus !== "completed" &&
          order.makeTableStatus !== "in_oven" &&
          order.makeTableStatus !== "ready"
        ) {
          order.makeTableStatus = status;
        }
        if (
          order.wingsStatus !== "completed" &&
          order.wingsStatus !== "ready"
        ) {
          order.wingsStatus = status;
        }
      }
    }

    // Recalculate overall order.status
    const hasPizza = (order.items || []).some((item) => {
      const label = item.kitchenLabel || "make_table";
      const isItemPizza = label === "make_table" || label === "pizza";
      const hasPizzaMod = (item.selectedModifiers || []).some(
        (m) => m.kitchenLabel === "make_table" || m.kitchenLabel === "pizza",
      );
      return isItemPizza || hasPizzaMod;
    });
    const hasWings = (order.items || []).some((item) => {
      const label = item.kitchenLabel || "make_table";
      const isItemWings = label === "wings_station" || label === "chicken";
      const hasWingsMod = (item.selectedModifiers || []).some(
        (m) => m.kitchenLabel === "wings_station" || m.kitchenLabel === "chicken",
      );
      return isItemWings || hasWingsMod;
    });

    const isMakeDone = !hasPizza || order.makeTableStatus === "completed";
    const isWingsDone = !hasWings || order.wingsStatus === "completed";

    if (isMakeDone && isWingsDone) {
      // Delivery orders: kitchen "done" means "ready" (driver still needs to deliver)
      // Takeout / Dine-in: kitchen "done" means truly "completed"
      if (order.orderType === "delivery") {
        order.status = "ready";
      } else {
        order.status = "completed";
      }
    } else if (
      order.makeTableStatus === "in_oven" ||
      order.makeTableStatus === "preparing" ||
      order.wingsStatus === "preparing" ||
      order.wingsStatus === "ready"
    ) {
      order.status = "preparing";
    } else {
      order.status = "pending";
    }

    if (receptionCompleted !== undefined) {
      order.receptionCompleted = receptionCompleted;
    }

    order.statusHistory.push({
      status: order.status,
      changedAt: new Date(),
      note,
      userName,
    });
    await order.save();

    triggerOrderUpdated(order).catch((err) => {
      logger.error(
        `Error triggering real-time update Pusher event: ${err.message}`,
      );
    });

    logger.info(
      `Order ${order.orderNumber} updated via ${station || "general"}: makeTableStatus=${order.makeTableStatus}, wingsStatus=${order.wingsStatus}, overall=${order.status}`,
    );
    return order;
  } catch (error) {
    logger.error(`Order Service Error: updateOrderStatus - ${error.message}`);
    throw error;
  }
};

// ── Clear from Kitchen ────────────────────────────────────────
exports.kitchenClear = async (id, userName = "Manager") => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found.");

    if (!order.kitchenCleared) {
      order.kitchenCleared = true;
      order.statusHistory.push({
        status: order.status,
        changedAt: new Date(),
        note: "Cleared from kitchen (Handed over)",
        userName,
      });
      await order.save();

      // Trigger real-time notification via Pusher
      triggerOrderUpdated(order).catch((err) => {
        logger.error(
          `Error triggering real-time update Pusher event: ${err.message}`,
        );
      });
      logger.info(`Order ${order.orderNumber} cleared from kitchen.`);
    }

    return order;
  } catch (error) {
    logger.error(`Order Service Error: kitchenClear - ${error.message}`);
    throw error;
  }
};

// ── Mark Order as Paid (Pay Later → Paid) ─────────────────────
exports.markOrderPaid = async (id, payments) => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found.");

    if (payments && payments.length > 0) {
      order.payments = [...(order.payments || []), ...payments];

      // Batch insert Payment audit documents in DB
      const paymentDocs = payments.map((p) => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: p.amount,
        paymentMethod: p.method === "cash" ? "cash" : "card",
        status: "succeeded",
        cashGiven: p.cashGiven || 0,
        changeGiven: p.changeGiven || 0,
      }));
      await Payment.insertMany(paymentDocs);
    }

    const paymentsTotal = order.payments
      ? order.payments.reduce((sum, p) => sum + p.amount, 0)
      : 0;
    if (paymentsTotal >= order.total - 0.01) {
      order.paymentStatus = "paid";
      order.paymentTiming = "pay-now";
    } else {
      order.paymentStatus = "unpaid"; // still partially unpaid
    }

    await order.save();

    logger.info(
      `Order ${order.orderNumber} payments updated. Total paid: ${paymentsTotal}`,
    );
    return order;
  } catch (error) {
    logger.error(`Order Service Error: markOrderPaid - ${error.message}`);
    throw error;
  }
};

// ── Cancel Order ──────────────────────────────────────────────
exports.cancelOrder = async (
  id,
  { reason = "", userName = "Manager" } = {},
) => {
  try {
    const noteText = reason
      ? `Order Cancelled: ${reason.trim()}`
      : "Order Cancelled";
    const order = await Order.findOneAndUpdate(
      { _id: id, status: { $nin: ["completed", "cancelled"] } },
      {
        $set: { status: "cancelled", cancelReason: reason.trim() },
        $push: {
          statusHistory: {
            status: "cancelled",
            note: noteText,
            userName,
            changedAt: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!order) {
      // Check if order exists to give specific error
      const exists = await Order.findById(id).select("status").lean();
      if (!exists) throw new Error("Order not found.");
      throw new Error(`Order is already ${exists.status}.`);
    }

    triggerOrderUpdated(order).catch((err) => {
      logger.error(`Error triggering cancel Pusher event: ${err.message}`);
    });

    logger.info(
      `Order ${order.orderNumber} cancelled by ${userName}. Reason: ${reason}`,
    );
    return order;
  } catch (error) {
    logger.error(`Order Service Error: cancelOrder - ${error.message}`);
    throw error;
  }
};

// ── Refund Order ────────────
exports.refundOrder = async (
  id,
  { reason = "", userName = "Manager" } = {},
) => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found.");

    // Strict Check: POS Orders Only
    const isPos =
      order.orderSource === "pos" ||
      order.placedBy === "POS SYSTEM" ||
      !["online", "doordash", "skip", "ubereats"].includes(order.orderSource);
    if (!isPos) {
      throw new Error(
        "Refund is only allowed for orders placed via POS System.",
      );
    }

    if (order.paymentStatus === "refunded") {
      throw new Error("Order has already been refunded.");
    }

    if (order.status === "cancelled") {
      throw new Error("Cancelled orders cannot be refunded.");
    }

    order.status = "cancelled";
    order.paymentStatus = "refunded";
    order.refundedAt = new Date();
    order.refundedBy = userName;
    order.refundReason = reason.trim() || "Customer POS Refund";

    order.statusHistory.push({
      status: "refunded",
      changedAt: new Date(),
      note: `Order Refunded: ${reason.trim() || "POS Refund"}`,
      userName,
    });

    await order.save();

    // Real-time update via Pusher
    triggerOrderUpdated(order).catch((err) => {
      logger.error(
        `Error triggering order refund Pusher event: ${err.message}`,
      );
    });

    logger.info(`Order ${order.orderNumber} refunded by ${userName}`);

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      refundedAt: order.refundedAt,
      refundedBy: order.refundedBy,
      refundReason: order.refundReason,
      total: order.total,
    };
  } catch (error) {
    logger.error(`Order Service Error: refundOrder - ${error.message}`);
    throw error;
  }
};

// ── Get Next Order Number ──────────────────────────────────────
exports.getNextOrderNumber = async (orderType, branchId = null) => {
  try {
    const nextNumber = await Order.previewNextOrderNumber(orderType, branchId);
    return nextNumber;
  } catch (error) {
    logger.error(`Order Service Error: getNextOrderNumber - ${error.message}`);
    throw error;
  }
};

// ── Update Order Due Time ─────────────────────────────────────
exports.updateOrderDueTime = async (id, dueAt) => {
  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { dueAt: new Date(dueAt) } },
      { new: true },
    );
    if (!order) throw new Error("Order not found.");

    logger.info(`Order ${order.orderNumber} due time updated to ${dueAt}`);
    return order;
  } catch (error) {
    logger.error(`Order Service Error: updateOrderDueTime - ${error.message}`);
    throw error;
  }
};

// ── Update Order Items ─────────────────────────────────────────
exports.updateOrderItems = async (id, updateData) => {
  try {
    const order = await Order.findById(id);
    if (!order) throw new Error("Order not found.");

    if (updateData.items) {
      order.items = updateData.items;
    }
    if (updateData.subtotal !== undefined) order.subtotal = updateData.subtotal;
    if (updateData.tax !== undefined) order.tax = updateData.tax;
    if (updateData.discount !== undefined) order.discount = updateData.discount;
    if (updateData.total !== undefined) {
      order.total = updateData.total;

      // Recalculate payment status based on total and paid amounts
      const paymentsTotal = order.payments
        ? order.payments.reduce((sum, p) => sum + p.amount, 0)
        : 0;
      if (paymentsTotal >= updateData.total - 0.01) {
        order.paymentStatus = "paid";
      } else {
        order.paymentStatus = "unpaid";
      }
    }
    if (updateData.notes !== undefined) order.notes = updateData.notes;
    if (updateData.customer !== undefined) order.customer = updateData.customer;
    if (updateData.orderType !== undefined) order.orderType = updateData.orderType;

    await order.save();
    logger.info(
      `Order ${order.orderNumber} items updated. Payment status: ${order.paymentStatus}`,
    );
    return order;
  } catch (error) {
    logger.error(`Order Service Error: updateOrderItems - ${error.message}`);
    throw error;
  }
};

// ── Get Sales Summary Aggregation ─────────────────────────────
exports.getSalesSummary = async (filters = {}) => {
  try {
    const query = {};
    let start = null;
    let end = null;
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        start = getLocalStartOfDay(filters.startDate);
      }
      if (filters.endDate) {
        end = getLocalEndOfDay(filters.endDate);
      }
    } else if (filters.date) {
      start = getLocalStartOfDay(filters.date);
      end = getLocalEndOfDay(filters.date);
    } else {
      const todayStr = getLocalDateStr();
      start = getLocalStartOfDay(todayStr);
      end = getLocalEndOfDay(todayStr);
    }

    const baseFilter = filters.branchId ? { branchId: filters.branchId } : {};
    const dateFilter = buildDateFilter(start, end, baseFilter);
    Object.assign(query, dateFilter);

    // Compute targetDateStr for deposit lookup
    let targetDateStr = "";
    if (filters.date) {
      targetDateStr = String(filters.date).split("T")[0];
    } else if (filters.startDate) {
      targetDateStr = String(filters.startDate).split("T")[0];
    } else {
      targetDateStr = getLocalDateStr();
    }

    // ── Parallel fetch: orders + deposit + expenses + product lookups ──
    const expQuery = {};
    if (filters.branchId) {
      if (mongoose.Types.ObjectId.isValid(filters.branchId)) {
        expQuery.$or = [
          { branchId: new mongoose.Types.ObjectId(filters.branchId) },
          { branchId: filters.branchId },
        ];
      } else {
        expQuery.branchId = filters.branchId;
      }
    }
    if (start && end) {
      expQuery.expenseDate = { $gte: start, $lte: end };
    }

    try {
      const legacyExpenses = await Expense.find({
        expenseDate: { $type: "date" },
      }).lean();
      for (const exp of legacyExpenses) {
        const dt = new Date(exp.expenseDate);
        if (
          dt.getUTCHours() === 0 &&
          dt.getUTCMinutes() === 0 &&
          dt.getUTCSeconds() === 0
        ) {
          const updatedDate = new Date(dt.getTime() + 12 * 3600 * 1000);
          await Expense.updateOne(
            { _id: exp._id },
            { $set: { expenseDate: updatedDate } },
          );
        }
      }
    } catch (e) {}

    const dropQuery = {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      date: targetDateStr,
    };

    const closingQuery = {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      date: targetDateStr,
    };

    const [
      orders,
      deposit,
      expensesList,
      { categoryMap: productCategoryMap },
      driverSettlements,
      accountClosing,
    ] = await Promise.all([
      Order.find(query)
        .select(
          "status tip total subtotal tax discount orderType orderSource paymentStatus payments items.menuItemId items.categoryName items.category items.totalPrice items.basePrice items.quantity paymentMethod",
        )
        .lean(),
      Deposit.findOne({ date: targetDateStr }).lean(),
      Expense.find(expQuery)
        .select("paymentMode amount expenseType employeeName pst gst hst")
        .lean()
        .catch(() => []),
      getProductLookups(),
      DriverDropSettlement.find(dropQuery)
        .lean()
        .catch(() => []),
      AccountClosing.findOne(closingQuery)
        .lean()
        .catch(() => null),
    ]);

    //Completed & Cancelled & Refunded Orders
    let completedCount = 0;
    let completedTotal = 0;
    let cancelledCount = 0;
    let cancelledTotal = 0;
    let refundedCount = 0;
    let refundedTotal = 0;

    // Financial sums for completed/valid orders
    let grossSubtotal = 0;
    let grossTax = 0;
    let grossDiscount = 0;
    let grandTotal = 0;

    const categorySales = {};

    let takeoutTotal = 0;
    let dineInTotal = 0;
    let driveThroughTotal = 0;
    let deliveryTotal = 0;

    let onlineTotal = 0;
    let posTotal = 0;
    let doordashTotal = 0;
    let skipTotal = 0;
    let ubereatsTotal = 0;

    let cashTotal = 0;
    let cardTotal = 0;
    let accountPayTotal = 0;
    let visaTotal = 0;
    let mastercardTotal = 0;
    let interacTotal = 0;
    let creditCardTotal = 0;
    let debitCardTotal = 0;
    let unpaidTotal = 0;
    let totalTips = 0;

    for (const order of orders) {
      if (order.paymentStatus === "refunded") {
        refundedCount += 1;
        refundedTotal += order.total || 0;
      } else if (order.status === "cancelled") {
        cancelledCount += 1;
        cancelledTotal += order.total || 0;
      } else {
        completedCount += 1;
        completedTotal += order.total || 0;

        grossSubtotal += order.subtotal || 0;
        grossTax += order.tax || 0;
        grossDiscount += order.discount || 0;
        grandTotal += order.total || 0;
        totalTips += order.tip || 0;

        if (order.orderType === "takeout") takeoutTotal += order.total;
        else if (order.orderType === "dine-in") dineInTotal += order.total;
        else if (order.orderType === "drive-through")
          driveThroughTotal += order.total;
        else if (order.orderType === "delivery") deliveryTotal += order.total;

        if (order.orderSource === "online") onlineTotal += order.total;
        else if (order.orderSource === "doordash") doordashTotal += order.total;
        else if (order.orderSource === "skip") skipTotal += order.total;
        else if (order.orderSource === "ubereats") ubereatsTotal += order.total;
        else posTotal += order.total;

        if (order.paymentStatus === "unpaid") {
          unpaidTotal += order.total || 0;
        } else if (order.paymentStatus === "paid") {
          if (order.payments && order.payments.length > 0) {
            for (const p of order.payments) {
              if (
                ["online", "doordash", "skip", "ubereats"].includes(
                  order.orderSource,
                ) ||
                p.method === "stripe"
              ) {
                accountPayTotal += p.amount;
              } else if (p.method === "cash") {
                cashTotal += p.amount;
              } else {
                cardTotal += p.amount;

                const brand = p.cardBrand?.toLowerCase() || "";
                if (brand === "visa") visaTotal += p.amount;
                else if (brand === "mastercard") mastercardTotal += p.amount;
                else interacTotal += p.amount;

                const funding = p.cardFunding?.toLowerCase() || "";
                if (funding === "credit") creditCardTotal += p.amount;
                else debitCardTotal += p.amount;
              }
            }
          } else {
            if (
              ["online", "doordash", "skip", "ubereats"].includes(
                order.orderSource,
              ) ||
              order.paymentMethod === "stripe"
            ) {
              accountPayTotal += order.total;
            } else {
              cashTotal += order.total;
            }
          }
        }

        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            const itemProdId = item.menuItemId || "";
            const catName =
              item.categoryName ||
              item.category ||
              productCategoryMap[itemProdId] ||
              "Open Item";
            categorySales[catName] =
              (categorySales[catName] || 0) +
              (item.totalPrice || item.basePrice * item.quantity);
          }
        }
      }
    }

    let totalCashExpense = 0;
    const rawExpenses = [];
    for (const e of expensesList || []) {
      rawExpenses.push(e);
      if (e.paymentMode !== "card") {
        totalCashExpense += e.amount || 0;
      }
    }

    let totalDriverCashPayout = 0;
    (driverSettlements || []).forEach((ds) => {
      totalDriverCashPayout += ds.netCashPayoutToDriver || 0;
    });

    const adjustedExpectedCash =
      cashTotal - totalCashExpense - totalDriverCashPayout;
    const adjustedPosTotal = posTotal;

    let shortageOverageCash = 0;
    let shortageOverageCard = 0;
    let shortageOverageAccountPay = 0;

    if (deposit) {
      shortageOverageCash = deposit.cashAmount - adjustedExpectedCash;
      shortageOverageCard = deposit.cardAmount - cardTotal;
      shortageOverageAccountPay = deposit.accountPayAmount - accountPayTotal;
    }

    return {
      dateRange: {
        startDate: filters.startDate,
        endDate: filters.endDate || filters.date,
      },
      completedOrders: {
        count: completedCount,
        totalAmount: round2(completedTotal),
      },
      cancelledOrders: {
        count: cancelledCount,
        totalAmount: round2(cancelledTotal),
      },
      refundOrders: {
        count: refundedCount,
        totalAmount: round2(refundedTotal),
      },
      financials: {
        allCategoryTotal: round2(grossSubtotal),
        subTotal: round2(grossSubtotal),
        deliveryCharges: 0,
        debitCardCharges: 0,
        discount: round2(grossDiscount),
        tax: round2(grossTax),
        grandTotal: round2(grandTotal),
        tips: round2(totalTips),
        finalAmount: round2(grandTotal),
      },
      categorySales: Object.entries(categorySales).map(([name, total]) => ({
        name,
        total: round2(total),
      })),
      discountSummary: {
        percentageDiscount: round2(grossDiscount),
        total: round2(grossDiscount),
      },
      taxSummary: {
        pst: 0,
        gst: round2(grossTax),
        hst: 0,
        total: round2(grossTax),
      },
      salesReceived: {
        accountPay: round2(accountPayTotal),
        cash: round2(cashTotal),
        creditCardSales: round2(creditCardTotal),
        debitCardSales: round2(debitCardTotal),
        unpaidSales: round2(unpaidTotal),
        grandTotal: round2(grandTotal),
        tips: round2(totalTips),
        finalAmount: round2(grandTotal),
      },
      cardTypeReceived: {
        interac: {
          total: round2(interacTotal),
          tips: 0,
          final: round2(interacTotal),
        },
        mastercard: {
          total: round2(mastercardTotal),
          tips: 0,
          final: round2(mastercardTotal),
        },
        visa: { total: round2(visaTotal), tips: 0, final: round2(visaTotal) },
        total: { total: round2(cardTotal), tips: 0, final: round2(cardTotal) },
      },
      orderTypeSummary: {
        takeout: round2(takeoutTotal),
        dineIn: round2(dineInTotal),
        driveThrough: round2(driveThroughTotal),
        delivery: round2(deliveryTotal),
        total: round2(grandTotal),
      },
      channelSummary: {
        online: round2(onlineTotal),
        doordash: round2(doordashTotal),
        skip: round2(skipTotal),
        ubereats: round2(ubereatsTotal),
        pos: round2(adjustedPosTotal),
      },
      expense: rawExpenses.map((e) => ({
        employee:
          e.expenseType === "store"
            ? "Store Expense"
            : e.employeeName || "Manager",
        pst: round2(e.pst || 0),
        gst: round2(e.gst || 0),
        hst: round2(e.hst || 0),
        total: round2(e.amount || 0),
        paymentMode: e.paymentMode || "cash",
      })),
      shortageOverage: {
        cash: round2(shortageOverageCash),
        card: round2(shortageOverageCard),
        accountPay: round2(shortageOverageAccountPay),
      },
      moneyToBeCollected: {
        cash: round2(adjustedExpectedCash),
        card: round2(cardTotal),
        accountPay: round2(accountPayTotal),
      },
      driverReport: (driverSettlements || []).map((ds) => ({
        driverName: ds.driverName,
        deliveryCount: ds.totalOrders,
        prepaidSales: round2(ds.prepaidSales),
        cashSales: round2(ds.cashSales),
        cardSales: round2(ds.terminalSales),
        prepaidTip: round2(ds.prepaidTips),
        terminalTip: round2(ds.terminalTips),
        totalTip: round2(ds.totalTipsEarned),
        totalSales: round2(ds.totalSales),
        driverEarning: round2(ds.totalDriverEarning),
        expectedPayout: round2(ds.netCashPayoutToDriver),
      })),
      deposit: deposit
        ? {
            cashAmount: round2(deposit.cashAmount),
            cardAmount: round2(deposit.cardAmount),
            accountPayAmount: round2(deposit.accountPayAmount),
          }
        : null,
      accountClosing: accountClosing || null,
    };
  } catch (error) {
    logger.error(`Order Service Error: getSalesSummary - ${error.message}`);
    throw error;
  }
};

exports.saveDeposit = async (depositData) => {
  try {
    const { date, cashAmount, cardAmount, accountPayAmount, branchId } =
      depositData;
    if (!date) throw new Error("Deposit date is required.");

    const query = { date, ...(branchId ? { branchId } : {}) };
    const deposit = await Deposit.findOneAndUpdate(
      query,
      {
        cashAmount: cashAmount !== undefined ? cashAmount : 0,
        cardAmount: cardAmount !== undefined ? cardAmount : 0,
        accountPayAmount: accountPayAmount !== undefined ? accountPayAmount : 0,
        ...(branchId ? { branchId } : {}),
      },
      { returnDocument: "after", upsert: true },
    );
    return deposit;
  } catch (error) {
    logger.error(`Order Service Error: saveDeposit - ${error.message}`);
    throw error;
  }
};

exports.getDashboardMetrics = async (filters = {}) => {
  try {
    const targetDateStr = filters.date || getLocalDateStr();
    const TIMEZONE = "America/Edmonton";

    // Use local timezone day boundaries
    const todayStart = getLocalStartOfDay(targetDateStr);
    const todayEnd = getLocalEndOfDay(targetDateStr);

    // Calculate 30 days ago in local timezone
    const targetDate = new Date(targetDateStr);
    const past30Date = new Date(targetDate);
    past30Date.setDate(past30Date.getDate() - 30);
    const past30DateStr = past30Date.toISOString().slice(0, 10);
    const past30DaysStart = getLocalStartOfDay(past30DateStr);

    const branchIdFilter = filters.branchId
      ? { branchId: new mongoose.Types.ObjectId(filters.branchId) }
      : {};

    const dateMatchFilter = buildDateFilter(
      past30DaysStart,
      todayEnd,
      branchIdFilter,
    );
    const todayDateFilter = buildDateFilter(
      todayStart,
      todayEnd,
      branchIdFilter,
    );

    // Single aggregation for today's metrics, popular days, and popular food
    const [aggResult] = await Order.aggregate([
      { $match: dateMatchFilter },
      {
        $facet: {
          // Today's orders: count + earnings
          todayMetrics: [
            { $match: todayDateFilter },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalEarnings: {
                  $sum: {
                    $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0],
                  },
                },
              },
            },
          ],
          // Popular days (30-day, non-cancelled)
          popularDays: [
            { $match: { status: { $ne: "cancelled" } } },
            {
              $addFields: {
                businessDate: {
                  $cond: [
                    { $eq: ["$orderTiming", "later"] },
                    "$scheduledAt",
                    "$createdAt",
                  ],
                },
              },
            },
            {
              $group: {
                _id: {
                  $dayOfWeek: { date: "$businessDate", timezone: TIMEZONE },
                },
                count: { $sum: 1 },
              },
            },
          ],
          // Popular food items (30-day, non-cancelled)
          popularFood: [
            { $match: { status: { $ne: "cancelled" } } },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.name",
                value: { $sum: "$items.quantity" },
              },
            },
            { $sort: { value: -1 } },
            { $limit: 7 },
          ],
          // Customer tracking — minimal fields for new/returning detection
          customerData: [
            { $match: todayDateFilter },
            {
              $project: {
                phone: "$customer.phone",
                email: "$customer.email",
                orderTiming: 1,
                scheduledAt: 1,
                createdAt: 1,
              },
            },
          ],
          // All customer earliest dates (30 days) for new/returning logic
          allCustomerDates: [
            {
              $project: {
                phone: "$customer.phone",
                email: "$customer.email",
                orderTiming: 1,
                scheduledAt: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ]);

    // Today metrics
    const todayMetrics = aggResult?.todayMetrics?.[0] || {
      totalOrders: 0,
      totalEarnings: 0,
    };

    // Popular days
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const popularDaysData = (aggResult?.popularDays || [])
      .map((d) => ({ name: dayNames[d._id - 1] || "Unknown", value: d.count }))
      .filter((d) => d.value > 0);

    // Popular food
    let popularFoodData = aggResult?.popularFood || [];
    if (popularFoodData.length > 6) {
      const top6 = popularFoodData.slice(0, 6);
      const otherVal = popularFoodData
        .slice(6)
        .reduce((sum, item) => sum + item.value, 0);
      popularFoodData = [...top6, { _id: "Other Items", value: otherVal }];
    }
    popularFoodData = popularFoodData.map((f) => ({
      name: f._id || f.name || "Unknown",
      value: f.value,
    }));
    if (popularFoodData.length === 0) {
      popularFoodData = [{ name: "No Menu Items Sold", value: 0 }];
    }

    // New vs returning customers (lightweight JS — only today's orders)
    let newCustomers = 0;
    let returningCustomers = 0;
    const phoneToEarliestDate = new Map();
    const emailToEarliestDate = new Map();

    for (const order of aggResult?.allCustomerDates || []) {
      const orderDate = getOrderBusinessDate(order);
      const phone = order.phone?.trim();
      const email = order.email?.trim();
      if (phone) {
        const existing = phoneToEarliestDate.get(phone);
        if (!existing || orderDate < existing) {
          phoneToEarliestDate.set(phone, orderDate);
        }
      }
      if (email) {
        const existing = emailToEarliestDate.get(email);
        if (!existing || orderDate < existing) {
          emailToEarliestDate.set(email, orderDate);
        }
      }
    }

    const seenCustomers = new Set();
    for (const order of aggResult?.customerData || []) {
      const phone = order.phone?.trim();
      const email = order.email?.trim();
      const customerKey = phone || email;
      if (!customerKey) continue;

      if (seenCustomers.has(customerKey)) continue;
      seenCustomers.add(customerKey);

      let hasPrev = false;
      if (phone && phoneToEarliestDate.has(phone)) {
        if (new Date(phoneToEarliestDate.get(phone)) < todayStart)
          hasPrev = true;
      }
      if (!hasPrev && email && emailToEarliestDate.has(email)) {
        if (new Date(emailToEarliestDate.get(email)) < todayStart)
          hasPrev = true;
      }
      if (hasPrev) returningCustomers += 1;
      else newCustomers += 1;
    }

    return {
      totalOrders: todayMetrics.totalOrders,
      totalEarnings: round2(todayMetrics.totalEarnings),
      newCustomers,
      returningCustomers,
      popularDaysData,
      popularFoodData,
    };
  } catch (error) {
    logger.error(`Order Service Error: getDashboardMetrics - ${error.message}`);
    throw error;
  }
};

exports.getUniqueCustomers = async (filters = {}) => {
  try {
    const pipeline = [];

    let matchQuery = {
      "customer.name": { $exists: true, $nin: ["", null] },
      $or: [
        {
          "customer.phone": {
            $exists: true,
            $nin: ["", "No phone", "No Phone", null],
          },
        },
        {
          "customer.email": {
            $exists: true,
            $nin: ["", "No email", "No Email", null],
          },
        },
      ],
    };

    if (filters.date) {
      const start = getLocalStartOfDay(filters.date);
      const end = getLocalEndOfDay(filters.date);
      matchQuery = buildDateFilter(start, end, {
        "customer.name": { $exists: true, $nin: ["", null] },
        $or: [
          {
            "customer.phone": {
              $exists: true,
              $nin: ["", "No phone", "No Phone", null],
            },
          },
          {
            "customer.email": {
              $exists: true,
              $nin: ["", "No email", "No Email", null],
            },
          },
        ],
      });
    }

    if (filters.branchId) {
      matchQuery.branchId = new mongoose.Types.ObjectId(filters.branchId);
    }

    pipeline.push({ $match: matchQuery });

    pipeline.push({ $sort: { createdAt: -1 } });

    pipeline.push({
      $group: {
        _id: {
          $cond: [
            {
              $and: [
                { $ifNull: ["$customer.phone", false] },
                { $ne: ["$customer.phone", ""] },
              ],
            },
            "$customer.phone",
            "$customer.email",
          ],
        },
        firstName: { $first: "$customer.name" },
        phone: { $first: "$customer.phone" },
        email: { $first: "$customer.email" },
        address: { $first: "$customer.address" },
        postalCode: { $first: "$customer.postalCode" },
        updatedDate: { $first: "$updatedAt" },
        lastOrderDate: { $first: "$createdAt" },
      },
    });

    pipeline.push({ $sort: { lastOrderDate: -1 } });

    let results = await Order.aggregate(pipeline);

    let customers = results.map((c) => {
      const nameParts = (c.firstName || "").trim().split(/\s+/);
      const fName = nameParts[0] || "";
      const lName = nameParts.slice(1).join(" ") || "";
      return {
        firstName: fName,
        lastName: lName,
        phone: c.phone || "",
        email: c.email || "",
        updatedDate: c.updatedDate || c.lastOrderDate,
        lastOrderDate: c.lastOrderDate,
        address: c.address || "",
        postalCode: c.postalCode || "",
      };
    });

    return customers;
  } catch (error) {
    logger.error(`Order Service Error: getUniqueCustomers - ${error.message}`);
    throw error;
  }
};

exports.searchCustomer = async ({ query, branchId } = {}) => {
  try {
    if (!query || query.trim().length < 3) {
      return null;
    }

    const cleanQuery = query.trim();
    const isPhone = /^\d+$/.test(cleanQuery);

    const searchConditions = [];
    if (isPhone) {
      // Phone lookup: prefix match on indexed customer.phone field
      searchConditions.push({
        "customer.phone": { $regex: `^${cleanQuery}`, $options: "i" },
      });
    } else {
      // Email lookup: exact or prefix match on indexed customer.email field
      searchConditions.push({
        "customer.email": { $regex: `^${escapeRegex(cleanQuery)}`, $options: "i" },
      });
      // Also allow partial name search if it looks like a name
      searchConditions.push({
        "customer.name": { $regex: escapeRegex(cleanQuery), $options: "i" },
      });
    }

    const matchQuery = {
      $or: searchConditions,
      "customer.name": { $exists: true, $nin: ["", null, "No Name"] },
    };

    if (branchId) {
      matchQuery.branchId = new mongoose.Types.ObjectId(branchId);
    }

    // Find the most recent order for this customer — index ensures this is fast
    const order = await Order.findOne(matchQuery)
      .sort({ createdAt: -1 })
      .select("customer createdAt")
      .lean();

    if (!order || !order.customer) return null;

    const c = order.customer;
    const nameParts = (c.name || "").trim().split(/\s+/);
    return {
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      postalCode: c.postalCode || "",
      lastOrderDate: order.createdAt,
    };
  } catch (error) {
    logger.error(`Order Service Error: searchCustomer - ${error.message}`);
    throw error;
  }
};

// Utility: escape special regex characters for safe use in $regex queries
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.getReportsSummary = async (filters = {}) => {
  try {
    let start = null;
    let end = null;
    if (filters.startDate || filters.endDate) {
      if (filters.startDate) {
        start = getLocalStartOfDay(filters.startDate);
      }
      if (filters.endDate) {
        end = getLocalEndOfDay(filters.endDate);
      }
    }
    const baseFilter = filters.branchId
      ? { branchId: new mongoose.Types.ObjectId(filters.branchId) }
      : {};
    const dateFilter = buildDateFilter(start, end, baseFilter);

    // Get cached product lookup maps
    const { categoryMap: productCategoryMap } = await getProductLookups();

    const pipeline = [];
    if (Object.keys(dateFilter).length > 0) {
      pipeline.push({ $match: dateFilter });
    }
    pipeline.push({
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              completedCount: {
                $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, 1, 0] },
              },
              completedTotal: {
                $sum: {
                  $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0],
                },
              },
              cancelledCount: {
                $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
              },
              cancelledTotal: {
                $sum: {
                  $cond: [{ $eq: ["$status", "cancelled"] }, "$total", 0],
                },
              },
              grossSubtotal: {
                $sum: {
                  $cond: [{ $ne: ["$status", "cancelled"] }, "$subtotal", 0],
                },
              },
              grossTax: {
                $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$tax", 0] },
              },
              grossDiscount: {
                $sum: {
                  $cond: [{ $ne: ["$status", "cancelled"] }, "$discount", 0],
                },
              },
              takeoutTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderType", "takeout"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              dineInTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderType", "dine-in"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              driveThroughTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderType", "drive-through"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              deliveryTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderType", "delivery"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              onlineTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderSource", "online"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              posTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderSource", "pos"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              doordashTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderSource", "doordash"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              skipTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderSource", "skip"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
              ubereatsTotal: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "cancelled"] },
                        { $eq: ["$orderSource", "ubereats"] },
                      ],
                    },
                    "$total",
                    0,
                  ],
                },
              },
            },
          },
        ],
        payments: [
          {
            $match: {
              status: { $ne: "cancelled" },
              paymentStatus: "paid",
            },
          },
          {
            $project: {
              total: 1,
              orderSource: 1,
              payments: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$payments", []] } }, 0] },
                  "$payments",
                  [{ method: "cash", amount: "$total" }],
                ],
              },
            },
          },
          { $unwind: "$payments" },
          {
            $group: {
              _id: {
                method: "$payments.method",
                brand: "$payments.cardBrand",
                funding: "$payments.cardFunding",
                orderSource: "$orderSource",
              },
              amount: { $sum: "$payments.amount" },
            },
          },
        ],
        items: [
          { $match: { status: { $ne: "cancelled" } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.menuItemId",
              total: {
                $sum: {
                  $ifNull: [
                    "$items.totalPrice",
                    { $multiply: ["$items.basePrice", "$items.quantity"] },
                  ],
                },
              },
            },
          },
        ],
      },
    });
    const [summaryResult] = await Order.aggregate(pipeline);

    const totals = summaryResult?.totals?.[0] || {
      completedCount: 0,
      completedTotal: 0,
      cancelledCount: 0,
      cancelledTotal: 0,
      grossSubtotal: 0,
      grossTax: 0,
      grossDiscount: 0,
      takeoutTotal: 0,
      dineInTotal: 0,
      driveThroughTotal: 0,
      onlineTotal: 0,
      posTotal: 0,
      doordashTotal: 0,
      skipTotal: 0,
      ubereatsTotal: 0,
    };

    const categorySalesMap = {};
    if (summaryResult?.items) {
      for (const itemGroup of summaryResult.items) {
        const prodId = itemGroup._id || "";
        const catName = productCategoryMap[prodId] || "Open Item";
        const val = itemGroup.total || 0;
        categorySalesMap[catName] = (categorySalesMap[catName] || 0) + val;
      }
    }

    const categorySales = Object.entries(categorySalesMap).map(
      ([name, total]) => ({
        name,
        total: round2(total),
      }),
    );

    let cashTotal = 0;
    let cardTotal = 0;
    let accountPayTotal = 0;
    let visaTotal = 0;
    let mastercardTotal = 0;
    let interacTotal = 0;
    let creditCardTotal = 0;
    let debitCardTotal = 0;

    if (summaryResult?.payments) {
      for (const p of summaryResult.payments) {
        const method = p._id?.method;
        const brand = p._id?.brand?.toLowerCase() || "";
        const funding = p._id?.funding?.toLowerCase() || "";
        const orderSource = p._id?.orderSource;

        if (
          ["online", "doordash", "skip", "ubereats"].includes(orderSource) ||
          method === "stripe"
        ) {
          accountPayTotal += p.amount;
        } else if (method === "cash") {
          cashTotal += p.amount;
        } else {
          cardTotal += p.amount;
          if (brand === "visa") visaTotal += p.amount;
          else if (brand === "mastercard") mastercardTotal += p.amount;
          else interacTotal += p.amount;

          if (funding === "credit") creditCardTotal += p.amount;
          else debitCardTotal += p.amount;
        }
      }
    }

    let totalCashExpense = 0;
    const rawExpenses = [];
    try {
      const expQuery = {};
      if (filters.branchId) expQuery.branchId = filters.branchId;
      if (start && end) {
        expQuery.expenseDate = { $gte: start, $lte: end };
      } else if (start) {
        expQuery.expenseDate = { $gte: start };
      } else if (end) {
        expQuery.expenseDate = { $lte: end };
      }
      const expensesList = await Expense.find(expQuery)
        .select("paymentMode amount expenseType employeeName pst gst hst")
        .lean();

      for (const e of expensesList) {
        rawExpenses.push({
          employee:
            e.expenseType === "store"
              ? "Store Expense"
              : e.employeeName || "Manager",
          pst: round2(e.pst || 0),
          gst: round2(e.gst || 0),
          hst: round2(e.hst || 0),
          total: round2(e.amount || 0),
          paymentMode: e.paymentMode || "cash",
        });
        if (e.paymentMode !== "card") {
          totalCashExpense += e.amount || 0;
        }
      }
    } catch (err) {
      logger.warn(`Could not query expenses for reports: ${err.message}`);
    }

    const adjustedPosTotal = Math.max(0, totals.posTotal - totalCashExpense);

    return {
      completedOrders: {
        count: totals.completedCount,
        totalAmount: round2(totals.completedTotal),
      },
      cancelledOrders: {
        count: totals.cancelledCount,
        totalAmount: round2(totals.cancelledTotal),
      },
      refundOrders: { count: 0, totalAmount: 0 },
      financials: {
        allCategoryTotal: round2(totals.grossSubtotal),
        subTotal: round2(totals.grossSubtotal),
        deliveryCharges: 0,
        debitCardCharges: 0,
        discount: round2(totals.grossDiscount),
        tax: round2(totals.grossTax),
        grandTotal: round2(totals.completedTotal),
        tips: 0,
        finalAmount: round2(totals.completedTotal),
      },
      categorySales,
      discountSummary: {
        percentageDiscount: round2(totals.grossDiscount),
        total: round2(totals.grossDiscount),
      },
      taxSummary: {
        pst: 0,
        gst: round2(totals.grossTax),
        hst: 0,
        total: round2(totals.grossTax),
      },
      salesReceived: {
        accountPay: round2(accountPayTotal),
        cash: round2(cashTotal),
        creditCardSales: round2(creditCardTotal),
        debitCardSales: round2(debitCardTotal),
        grandTotal: round2(totals.completedTotal),
        tips: 0,
        finalAmount: round2(totals.completedTotal),
      },
      cardTypeReceived: {
        interac: {
          total: round2(interacTotal),
          tips: 0,
          final: round2(interacTotal),
        },
        mastercard: {
          total: round2(mastercardTotal),
          tips: 0,
          final: round2(mastercardTotal),
        },
        visa: { total: round2(visaTotal), tips: 0, final: round2(visaTotal) },
        total: { total: round2(cardTotal), tips: 0, final: round2(cardTotal) },
      },
      orderTypeSummary: {
        takeout: round2(totals.takeoutTotal),
        dineIn: round2(totals.dineInTotal),
        driveThrough: round2(totals.driveThroughTotal),
        delivery: round2(totals.deliveryTotal),
        total: round2(totals.completedTotal),
      },
      channelSummary: {
        online: round2(totals.onlineTotal),
        doordash: round2(totals.doordashTotal),
        skip: round2(totals.skipTotal),
        ubereats: round2(totals.ubereatsTotal),
        pos: round2(adjustedPosTotal),
      },
      expense: rawExpenses,
    };
  } catch (error) {
    logger.error(`Order Service Error: getReportsSummary - ${error.message}`);
    throw error;
  }
};

exports.getItemSalesSummary = async ({ startDate, endDate, branchId } = {}) => {
  try {
    // Get cached product lookup maps
    const { categoryMap: productCategoryMap, idMap: productIDMap } =
      await getProductLookups();

    const baseFilter = {
      status: { $ne: "cancelled" },
      ...(branchId ? { branchId } : {}),
    };
    let start, end;
    if (startDate && endDate) {
      start = getLocalStartOfDay(startDate);
      end = getLocalEndOfDay(endDate);
    } else {
      const todayStr = getLocalDateStr();
      start = getLocalStartOfDay(todayStr);
      end = getLocalEndOfDay(todayStr);
    }
    const matchQuery = buildDateFilter(start, end, baseFilter);

    const aggregatedItems = await Order.aggregate([
      { $match: matchQuery },
      { $project: { items: 1 } },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            menuItemId: "$items.menuItemId",
            name: "$items.name",
          },
          quantitySold: { $sum: "$items.quantity" },
          totalSales: { $sum: "$items.totalPrice" },
        },
      },
    ]);

    const categoriesMap = {};

    for (const item of aggregatedItems) {
      const menuItemId = item._id.menuItemId;
      const name = item._id.name;
      const quantitySold = item.quantitySold;
      const totalSales = round2(item.totalSales);

      const categoryName = productCategoryMap[menuItemId] || "Other";

      if (!categoriesMap[categoryName]) {
        categoriesMap[categoryName] = {
          categoryName,
          items: [],
          subtotalSold: 0,
          subtotalSales: 0,
        };
      }

      categoriesMap[categoryName].items.push({
        name,
        menuItemId,
        productId: productIDMap[menuItemId] || "",
        quantitySold,
        totalSales,
        percentageSales: 0,
      });

      categoriesMap[categoryName].subtotalSold += quantitySold;
      categoriesMap[categoryName].subtotalSales += totalSales;
    }

    const result = [];
    for (const catName of Object.keys(categoriesMap)) {
      const catData = categoriesMap[catName];
      catData.subtotalSales = round2(catData.subtotalSales);

      for (const item of catData.items) {
        if (catData.subtotalSales > 0) {
          item.percentageSales = round2(
            (item.totalSales / catData.subtotalSales) * 100,
          );
        } else {
          item.percentageSales = 0;
        }
      }

      catData.items.sort((a, b) => b.totalSales - a.totalSales);

      result.push(catData);
    }

    // Sort categories by subtotal sales descending
    result.sort((a, b) => b.subtotalSales - a.subtotalSales);

    return result;
  } catch (error) {
    logger.error(`Order Service Error: getItemSalesSummary - ${error.message}`);
    throw error;
  }
};

// Get Hourly Sales Summary Report  ───────
exports.getHourlySalesSummary = async ({
  startDate,
  endDate,
  branchId,
} = {}) => {
  try {
    const TIMEZONE = "America/Edmonton";
    const baseFilter = {
      status: { $in: ["pending", "preparing", "ready", "completed"] },
      ...(branchId ? { branchId } : {}),
    };
    let start, end;
    if (startDate && endDate) {
      start = getLocalStartOfDay(startDate);
      end = getLocalEndOfDay(endDate);
    } else {
      const todayStr = getLocalDateStr();
      start = getLocalStartOfDay(todayStr);
      end = getLocalEndOfDay(todayStr);
    }
    const matchQuery = buildDateFilter(start, end, baseFilter);

    // Aggregation: group by hour in local timezone
    const hourlyData = await Order.aggregate([
      { $match: matchQuery },
      {
        $project: {
          total: 1,
          businessHour: {
            $hour: {
              date: {
                $cond: [
                  { $eq: ["$orderTiming", "later"] },
                  "$scheduledAt",
                  "$createdAt",
                ],
              },
              timezone: TIMEZONE,
            },
          },
        },
      },
      {
        $group: {
          _id: "$businessHour",
          orderCount: { $sum: 1 },
          totalSales: { $sum: "$total" },
        },
      },
    ]);

    // Build hour lookup map from aggregation results
    const hourMap = new Map();
    for (const row of hourlyData) {
      hourMap.set(row._id, {
        orderCount: row.orderCount,
        totalSales: row.totalSales,
      });
    }

    // Define hourly slots dynamically for all 24 hours of the day
    const hourlySlots = [];
    for (let h = 0; h < 24; h++) {
      let label = "";
      if (h === 0) {
        label = "12 AM to 1 AM";
      } else if (h === 12) {
        label = "12 PM to 1 PM";
      } else if (h < 12) {
        label = `${h} AM to ${h + 1 === 12 ? "12 PM" : h + 1 + " AM"}`;
      } else {
        const hr12 = h - 12;
        label = `${hr12} PM to ${hr12 + 1 === 12 ? "12 AM" : hr12 + 1 + " PM"}`;
      }
      hourlySlots.push({
        label,
        startHour: h,
        endHour: (h + 1) % 24,
        orderCount: 0,
        totalSales: 0,
      });
    }

    // Map aggregation results to slots
    for (const slot of hourlySlots) {
      const data = hourMap.get(slot.startHour);
      if (data) {
        slot.orderCount = data.orderCount;
        slot.totalSales = round2(data.totalSales);
      }
    }

    return hourlySlots;
  } catch (error) {
    logger.error(
      `Order Service Error: getHourlySalesSummary - ${error.message}`,
    );
    throw error;
  }
};

// ── Get Monthly Sales Summary Report ───────
exports.getMonthlySalesSummary = async ({
  startDate,
  endDate,
  branchId,
} = {}) => {
  try {
    const TIMEZONE = "America/Edmonton";
    let start, end;
    if (startDate && endDate) {
      start = getLocalStartOfDay(startDate);
      end = getLocalEndOfDay(endDate);
    } else {
      // Default to current month in local timezone
      const todayStr = getLocalDateStr();
      const parts = todayStr.split("-");
      const firstOfMonth = `${parts[0]}-${parts[1]}-01`;
      start = getLocalStartOfDay(firstOfMonth);
      end = getLocalEndOfDay(todayStr);
    }

    const baseFilter = branchId ? { branchId } : {};
    const dateFilter = buildDateFilter(start, end, baseFilter);

    //group all orders by business date with all needed metrics
    const [ordersByDayAgg, expensesRaw, depositsRaw] = await Promise.all([
      Order.aggregate([
        { $match: dateFilter },
        {
          $addFields: {
            businessDate: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: {
                  $cond: [
                    { $eq: ["$orderTiming", "later"] },
                    "$scheduledAt",
                    "$createdAt",
                  ],
                },
                timezone: TIMEZONE,
              },
            },
          },
        },
        {
          $group: {
            _id: { date: "$businessDate", status: "$status" },
            count: { $sum: 1 },
            subtotal: { $sum: "$subtotal" },
            tax: { $sum: "$tax" },
            discount: { $sum: "$discount" },
            total: { $sum: "$total" },
            // Payment breakdowns via conditional sums
            cashTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      { $in: ["$orderSource", ["pos"]] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            // Order types
            takeoutTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      { $eq: ["$orderType", "takeout"] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            dineInTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      { $in: ["$orderType", ["dine-in", "dinein"]] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            deliveryTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      { $eq: ["$orderType", "delivery"] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            driveThroughTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      {
                        $in: ["$orderType", ["drive-through", "drivethrough"]],
                      },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            // Source breakdowns
            onlineTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      { $eq: ["$orderSource", "online"] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            posTotal: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "cancelled"] },
                      { $eq: ["$orderSource", "pos"] },
                    ],
                  },
                  "$total",
                  0,
                ],
              },
            },
            // Cancelled breakdowns
            paidCancelled: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "cancelled"] },
                      { $eq: ["$paymentStatus", "paid"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            unpaidCancelled: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "cancelled"] },
                      { $ne: ["$paymentStatus", "paid"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            // Payment details — flatten payments array and aggregate
            orders: {
              $push: {
                total: "$total",
                payments: "$payments",
                orderSource: "$orderSource",
                status: "$status",
                discount: "$discount",
                discountType: "$discountType",
                promoCode: "$promoCode",
              },
            },
          },
        },
      ]),
      Expense.find({
        expenseDate: { $gte: start, $lte: end },
        ...(branchId ? { branchId } : {}),
      }).lean(),
      Deposit.find({
        date: {
          $gte: startDate || getLocalDateStr(start),
          $lte: endDate || getLocalDateStr(end),
        },
        ...(branchId ? { branchId } : {}),
      }).lean(),
    ]);

    // Build date-keyed Maps
    const dayDataMap = new Map(); // date -> { active: {...}, cancelled: {...} }

    for (const row of ordersByDayAgg) {
      const dateStr = row._id.date;
      if (!dayDataMap.has(dateStr)) {
        dayDataMap.set(dateStr, {
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          takeout: 0,
          dineIn: 0,
          delivery: 0,
          driveThrough: 0,
          online: 0,
          pos: 0,
          completedCount: 0,
          paidCancelledCount: 0,
          unpaidCancelledCount: 0,
          cashSales: 0,
          cardSales: 0,
          accountPaySales: 0,
          orders: [],
        });
      }
      const day = dayDataMap.get(dateStr);

      if (row._id.status !== "cancelled") {
        day.subtotal += row.subtotal;
        day.tax += row.tax;
        day.discount += row.discount;
        day.total += row.total;
        day.takeout += row.takeoutTotal;
        day.dineIn += row.dineInTotal;
        day.delivery += row.deliveryTotal;
        day.driveThrough += row.driveThroughTotal;
        day.online += row.onlineTotal;
        day.pos += row.posTotal;
        if (row._id.status === "completed") day.completedCount += row.count;
        day.orders.push(...row.orders);
      } else {
        day.paidCancelledCount += row.paidCancelled;
        day.unpaidCancelledCount += row.unpaidCancelled;
      }
    }

    // Process payment & promo breakdowns per day from pushed orders
    for (const [, day] of dayDataMap) {
      let cashSales = 0,
        cardSales = 0,
        accountPaySales = 0;
      const promoMap = new Map();

      for (const o of day.orders) {
        if (o.status === "cancelled") continue;

        if (o.promoCode) {
          const codeKey = String(o.promoCode).toUpperCase();
          if (!promoMap.has(codeKey)) {
            promoMap.set(codeKey, {
              code: codeKey,
              count: 0,
              totalDiscount: 0,
            });
          }
          const pData = promoMap.get(codeKey);
          pData.count += 1;
          pData.totalDiscount += Number(o.discount || 0);
        }

        const orderPayments =
          o.payments && o.payments.length > 0
            ? o.payments
            : [{ method: "cash", amount: o.total || 0 }];
        for (const p of orderPayments) {
          const method = p.method ? p.method.toLowerCase() : "cash";
          if (method === "cash") cashSales += p.amount;
          else if (
            method === "credit" ||
            method === "card" ||
            method === "debit"
          )
            cardSales += p.amount;
          else accountPaySales += p.amount;
        }
      }
      day.cashSales = cashSales;
      day.cardSales = cardSales;
      day.accountPaySales = accountPaySales;
      day.promoSummary = Array.from(promoMap.values()).map((p) => ({
        code: p.code,
        count: p.count,
        totalDiscount: Math.round(p.totalDiscount * 100) / 100,
      }));
      delete day.orders; // Free memory
    }

    const expenseMap = new Map();
    for (const e of expensesRaw) {
      const dateStr = e.expenseDate
        ? getLocalDateStr(new Date(e.expenseDate))
        : null;
      if (dateStr) {
        if (!expenseMap.has(dateStr)) expenseMap.set(dateStr, []);
        expenseMap.get(dateStr).push(e);
      }
    }
    const depositMap = new Map();
    for (const d of depositsRaw) {
      depositMap.set(d.date, d);
    }

    // Iterate day by day — now just Map lookups
    const result = [];
    const startDateStr = startDate || getLocalDateStr(start);
    const endDateStr = endDate || getLocalDateStr(end);
    const currentDate = new Date(startDateStr);
    const stopDate = new Date(endDateStr);

    while (currentDate <= stopDate) {
      const dateStr = getLocalDateStr(currentDate);
      const dateParts = dateStr.split("-");
      const reportDateFormatted = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;

      const day = dayDataMap.get(dateStr) || {
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        takeout: 0,
        dineIn: 0,
        delivery: 0,
        driveThrough: 0,
        online: 0,
        pos: 0,
        completedCount: 0,
        paidCancelledCount: 0,
        unpaidCancelledCount: 0,
        cashSales: 0,
        cardSales: 0,
        accountPaySales: 0,
      };
      const dayExpenses = expenseMap.get(dateStr) || [];
      const dayDeposit = depositMap.get(dateStr) || {
        cashAmount: 0,
        cardAmount: 0,
        accountPayAmount: 0,
      };

      const grandTotal = day.total;
      const tips = grandTotal > 0 ? round2(grandTotal * 0.02) : 0;
      const finalAmount = round2(grandTotal + tips);

      const debitCardSales = round2(day.cardSales * 0.4);
      const creditCardSales = round2(day.cardSales * 0.6);
      const finalCashSales = round2(day.cashSales);
      const finalAccountPaySales = round2(day.accountPaySales);
      const paymentGrandTotal = round2(
        finalCashSales +
          debitCardSales +
          creditCardSales +
          finalAccountPaySales,
      );

      const debitTips = round2(tips * 0.4);
      const creditTips = round2(tips * 0.6);
      const paymentFinalAmount = round2(
        paymentGrandTotal + debitTips + creditTips,
      );

      const orderTypeTotal = round2(
        day.takeout + day.dineIn + day.delivery + day.driveThrough,
      );

      const gst = round2(day.tax);
      const amexFinalAmount = round2(creditCardSales * 0.1);
      const interacFinalAmount = round2(debitCardSales);
      const mastercardFinalAmount = round2(creditCardSales * 0.4);
      const visaFinalAmount = round2(creditCardSales * 0.5);

      const onlineTotal = round2(day.online);
      const posTotal = round2(day.pos);

      const totalExpense = dayExpenses.reduce(
        (sum, e) => sum + (e.amount || 0),
        0,
      );

      const depositCash = dayDeposit.cashAmount || 0;
      const depositCard = dayDeposit.cardAmount || 0;
      const depositAccountPay = dayDeposit.accountPayAmount || 0;
      const expectedCash = Math.max(0, finalCashSales - totalExpense);
      const shortageCash = round2(depositCash - expectedCash);

      result.push({
        date: reportDateFormatted,
        rawDate: dateStr,
        salesSummary: {
          subtotal: round2(day.subtotal),
          deliveryCharges: 0,
          debitCharges: 0,
          discount: round2(day.discount),
          tax: round2(day.tax),
          grandTotal: round2(grandTotal),
          tips: round2(tips),
          finalAmount: round2(finalAmount),
          promoSummary: day.promoSummary || [],
        },
        paymentType: {
          cash: finalCashSales,
          accountPay: finalAccountPaySales,
          creditCardSales,
          debitCardSales,
          grandTotal: paymentGrandTotal,
          debitTips,
          creditTips,
          finalAmount: paymentFinalAmount,
        },
        orderType: {
          takeout: round2(day.takeout),
          dineIn: round2(day.dineIn),
          delivery: round2(day.delivery),
          driveThrough: round2(day.driveThrough),
          total: orderTypeTotal,
        },
        orders: {
          completed: day.completedCount,
          paidCancelled: day.paidCancelledCount,
          unpaidCancelled: day.unpaidCancelledCount,
          refund: 0,
          refundAmount: 0,
        },
        taxBreakdown: { pst: 0, gst, hst: 0, total: gst },
        cardType: {
          amex: amexFinalAmount,
          interac: interacFinalAmount,
          mastercard: mastercardFinalAmount,
          visa: visaFinalAmount,
        },
        online: {
          website: round2(day.online),
          uber: 0,
          skip: 0,
          doordash: 0,
          total: onlineTotal,
        },
        pos: { posSales: posTotal, total: posTotal },
        expense: { amount: round2(totalExpense) },
        shortage: { cash: shortageCash, card: 0, accountPay: 0 },
        deposit: {
          cash: round2(depositCash),
          card: round2(depositCard),
          accountPay: round2(depositAccountPay),
        },
        moneyToBeCollected: {
          cash: round2(depositCash),
          card: round2(depositCard),
          accountPay: round2(depositAccountPay),
        },
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  } catch (error) {
    logger.error(
      `Order Service Error: getMonthlySalesSummary - ${error.message}`,
    );
    throw error;
  }
};

// ── Helper to calculate dynamic day system totals ──
const calculateDaySystemTotals = async (targetDateStr, branchId) => {
  const start = getLocalStartOfDay(targetDateStr);
  const end = getLocalEndOfDay(targetDateStr);
  const baseFilter = branchId ? { branchId } : {};
  const dateFilter = buildDateFilter(start, end, baseFilter);

  const expQuery = {};
  if (branchId) {
    if (mongoose.Types.ObjectId.isValid(branchId)) {
      expQuery.$or = [
        { branchId: new mongoose.Types.ObjectId(branchId) },
        { branchId },
      ];
    } else {
      expQuery.branchId = branchId;
    }
  }
  if (start && end) expQuery.expenseDate = { $gte: start, $lte: end };

  const dropQuery = {
    ...(branchId ? { branchId } : {}),
    date: targetDateStr,
  };

  const [orders, expensesList, driverSettlements] = await Promise.all([
    Order.find(dateFilter)
      .select(
        "status paymentStatus total subtotal tax discount tip orderType orderSource payments paymentMethod",
      )
      .lean(),
    Expense.find(expQuery)
      .select("paymentMode amount category description expenseType employeeName createdAt")
      .lean()
      .catch(() => []),
    DriverDropSettlement.find(dropQuery)
      .lean()
      .catch(() => []),
  ]);

  let systemCash = 0;
  let systemCard = 0;
  let systemAccountPay = 0;
  let systemGrandTotal = 0;
  let systemTips = 0;
  let systemDeliveryTotal = 0;
  let systemTaxTotal = 0;
  let systemDiscountTotal = 0;

  for (const order of orders) {
    if (order.status === "cancelled" || order.paymentStatus === "refunded")
      continue;
    systemGrandTotal += order.total || 0;
    systemTips += order.tip || 0;
    systemTaxTotal += order.tax || 0;
    systemDiscountTotal += order.discount || 0;
    if (order.orderType === "delivery")
      systemDeliveryTotal += order.total || 0;

    const isOnlinePrepaid =
      ["online", "doordash", "skip", "ubereats"].includes(
        order.orderSource,
      ) || order.paymentMethod === "stripe";

    if (isOnlinePrepaid) {
      systemAccountPay += order.total || 0;
    } else if (order.payments && order.payments.length > 0) {
      for (const p of order.payments) {
        if (
          ["online", "doordash", "skip", "ubereats"].includes(
            order.orderSource,
          ) ||
          p.method === "stripe"
        ) {
          systemAccountPay += p.amount || 0;
        } else if (p.method === "cash") {
          systemCash += p.amount || 0;
        } else {
          systemCard += p.amount || 0;
        }
      }
    } else {
      if (order.paymentMethod === "cash") {
        systemCash += order.total || 0;
      } else {
        systemCard += order.total || 0;
      }
    }
  }

  let totalExpensePayout = 0;
  for (const e of expensesList || []) {
    if (e.paymentMode !== "card") totalExpensePayout += e.amount || 0;
  }

  let totalDriverPayout = 0;
  for (const ds of driverSettlements || []) {
    totalDriverPayout += ds.netCashPayoutToDriver || 0;
  }

  const adjustedSystemCash = round2(
    systemCash - totalExpensePayout - totalDriverPayout,
  );
  const expectedNetDeposit = round2(adjustedSystemCash + systemCard);

  const driverReport = (driverSettlements || []).map((ds) => ({
    driverName: ds.driverName,
    deliveryCount: ds.totalOrders,
    totalSales: round2(ds.totalSales),
    cashSales: round2(ds.cashSales),
    cardSales: round2(ds.terminalSales),
    prepaidSales: round2(ds.prepaidSales),
    totalTips: round2(ds.totalTipsEarned),
    driverEarning: round2(ds.totalDriverEarning),
    expectedPayout: round2(ds.netCashPayoutToDriver),
  }));

  const expenseReport = (expensesList || []).map((exp) => ({
    id: exp._id,
    expenseType: exp.expenseType || "store",
    employeeName: exp.employeeName || "Manager",
    typeLabel: exp.expenseType === "employee" ? `EMPLOYEE (${(exp.employeeName || "MANAGER").toUpperCase()})` : "STORE",
    category: exp.category || "General",
    description: exp.description || "-",
    paymentMode: exp.paymentMode || "cash",
    amount: round2(exp.amount || 0),
    time: exp.createdAt
      ? new Date(exp.createdAt).toLocaleTimeString("en-US", {
          timeZone: "America/Edmonton",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "",
  }));

  return {
    systemCash: adjustedSystemCash,
    rawSystemCash: round2(systemCash),
    systemCard: round2(systemCard),
    systemAccountPay: round2(systemAccountPay),
    systemGrandTotal: round2(systemGrandTotal),
    systemTips: round2(systemTips),
    systemDeliveryTotal: round2(systemDeliveryTotal),
    systemTaxTotal: round2(systemTaxTotal),
    systemDiscountTotal: round2(systemDiscountTotal),
    totalDriverPayout: round2(totalDriverPayout),
    totalExpensePayout: round2(totalExpensePayout),
    expectedNetDeposit,
    driverReport,
    expenseReport,
  };
};

// ── Get Account Closing Data ──
exports.getAccountClosingData = async (filters = {}) => {
  try {
    const targetDateStr = filters.date
      ? String(filters.date).split("T")[0]
      : getLocalDateStr();

    const closingQuery = {
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      date: targetDateStr,
    };

    const totals = await calculateDaySystemTotals(targetDateStr, filters.branchId);
    let existingClosing = await AccountClosing.findOne(closingQuery).lean().catch(() => null);

    if (existingClosing) {
      // Keep existing closing's cumulative calculations up to date
      const closingDoc = await AccountClosing.findOne(closingQuery);
      if (closingDoc) {
        existingClosing = await updateCumulativeClosing(closingDoc, filters.branchId, targetDateStr);
      }
    }

    return {
      date: targetDateStr,
      systemData: {
        cash: totals.systemCash,
        card: totals.systemCard,
        accountPay: totals.systemAccountPay,
        grandTotal: totals.systemGrandTotal,
        tips: totals.systemTips,
        deliveryTotal: totals.systemDeliveryTotal,
        taxTotal: totals.systemTaxTotal,
        discountTotal: totals.systemDiscountTotal,
        totalDriverPayout: totals.totalDriverPayout,
        totalExpensePayout: totals.totalExpensePayout,
        expectedNetDeposit: totals.expectedNetDeposit,
      },
      driverReport: totals.driverReport,
      expenseReport: totals.expenseReport,
      existingClosing: existingClosing || null,
      isClosed: existingClosing ? existingClosing.status === "closed" : false,
    };
  } catch (error) {
    logger.error(
      `Order Service Error: getAccountClosingData - ${error.message}`,
    );
    throw error;
  }
};

// ── Helper to recalculate & sync cumulative totals ──
const updateCumulativeClosing = async (closing, branchId, dateStr) => {
  const totals = await calculateDaySystemTotals(dateStr, branchId);

  closing.systemCash = totals.systemCash;
  closing.systemCard = totals.systemCard;
  closing.systemAccountPay = totals.systemAccountPay;
  closing.systemGrandTotal = totals.systemGrandTotal;
  closing.totalDriverPayout = totals.totalDriverPayout;
  closing.totalExpensePayout = totals.totalExpensePayout;

  const deposits = closing.terminalDeposits || [];
  let enteredCash = 0;
  let enteredInterac = 0;
  let enteredVisa = 0;
  let enteredMastercard = 0;
  let enteredGiftCard = 0;

  for (const d of deposits) {
    enteredCash += d.cash || 0;
    enteredInterac += d.interac || 0;
    enteredVisa += d.visa || 0;
    enteredMastercard += d.mastercard || 0;
    enteredGiftCard += d.giftCard || 0;
  }

  enteredCash = round2(enteredCash);
  enteredInterac = round2(enteredInterac);
  enteredVisa = round2(enteredVisa);
  enteredMastercard = round2(enteredMastercard);
  enteredGiftCard = round2(enteredGiftCard);

  const enteredTotalCard = round2(
    enteredInterac + enteredVisa + enteredMastercard + enteredGiftCard,
  );
  const enteredGrandTotal = round2(enteredCash + enteredTotalCard);

  const cashShortage = round2(enteredCash - totals.systemCash);
  const cardShortage = round2(enteredTotalCard - totals.systemCard);
  const grandShortage = round2(enteredGrandTotal - totals.expectedNetDeposit);

  closing.enteredCash = enteredCash;
  closing.enteredInterac = enteredInterac;
  closing.enteredVisa = enteredVisa;
  closing.enteredMastercard = enteredMastercard;
  closing.enteredGiftCard = enteredGiftCard;
  closing.enteredTotalCard = enteredTotalCard;
  closing.enteredGrandTotal = enteredGrandTotal;
  closing.cashShortage = cashShortage;
  closing.cardShortage = cardShortage;
  closing.grandShortage = grandShortage;

  await closing.save();

  // Auto-sync Deposit model for Sales Summary
  await Deposit.findOneAndUpdate(
    { date: dateStr, ...(branchId ? { branchId } : {}) },
    {
      cashAmount: enteredCash,
      cardAmount: enteredTotalCard,
      accountPayAmount: round2(totals.systemAccountPay),
      ...(branchId ? { branchId } : {}),
    },
    { upsert: true, new: true },
  ).catch((e) => logger.warn(`Auto-deposit sync warning: ${e.message}`));

  return closing;
};

// ── Save or Update a Terminal Deposit ──
exports.saveTerminalDeposit = async (data) => {
  try {
    const {
      date,
      branchId,
      depositId = null,
      cash = 0,
      interac = 0,
      visa = 0,
      mastercard = 0,
      giftCard = 0,
      comments = "",
      time = "",
    } = data;

    if (!date) throw new Error("Date is required.");
    if (!branchId) throw new Error("BranchId is required.");

    const targetDateStr = String(date).split("T")[0];
    const totalDeposit = round2(
      Number(cash) +
        Number(interac) +
        Number(visa) +
        Number(mastercard) +
        Number(giftCard),
    );

    if (totalDeposit <= 0)
      throw new Error("Deposit total must be greater than 0");

    let closing = await AccountClosing.findOne({
      date: targetDateStr,
      branchId,
    });

    if (!closing) {
      const totals = await calculateDaySystemTotals(targetDateStr, branchId);
      closing = new AccountClosing({
        branchId,
        date: targetDateStr,
        systemCash: totals.systemCash,
        systemCard: totals.systemCard,
        systemGrandTotal: totals.systemGrandTotal,
        systemAccountPay: totals.systemAccountPay,
        status: "open",
        terminalDeposits: [],
      });
    }

    if (closing.status === "closed") {
      throw new Error(
        "Day account is already closed. Re-open required to make changes.",
      );
    }

    if (depositId) {
      // Update existing deposit entry
      const existing = closing.terminalDeposits.id(depositId);
      if (!existing) throw new Error("Deposit entry not found.");
      existing.cash = round2(cash);
      existing.interac = round2(interac);
      existing.visa = round2(visa);
      existing.mastercard = round2(mastercard);
      existing.giftCard = round2(giftCard);
      existing.totalDeposit = totalDeposit;
      existing.comments = comments;
      if (time) existing.time = time;
    } else {
      // Add new deposit entry
      closing.terminalDeposits.push({
        cash: round2(cash),
        interac: round2(interac),
        visa: round2(visa),
        mastercard: round2(mastercard),
        giftCard: round2(giftCard),
        totalDeposit,
        comments,
        time:
          time ||
          new Date().toLocaleTimeString("en-US", {
            timeZone: "America/Edmonton",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
      });
    }

    const updated = await updateCumulativeClosing(
      closing,
      branchId,
      targetDateStr,
    );
    logger.info(
      `Terminal deposit saved for ${targetDateStr} (Total: $${totalDeposit})`,
    );
    return updated;
  } catch (error) {
    logger.error(`Order Service Error: saveTerminalDeposit - ${error.message}`);
    throw error;
  }
};

// ── Void / Delete a Terminal Deposit ──
exports.voidTerminalDeposit = async (data) => {
  try {
    const { date, branchId, depositId } = data;
    if (!date) throw new Error("Date is required.");
    if (!branchId) throw new Error("BranchId is required.");
    if (!depositId) throw new Error("DepositId is required.");

    const targetDateStr = String(date).split("T")[0];
    const closing = await AccountClosing.findOne({
      date: targetDateStr,
      branchId,
    });
    if (!closing) throw new Error("Account closing record not found.");
    if (closing.status === "closed")
      throw new Error("Day account is already closed.");

    closing.terminalDeposits.pull(depositId);
    const updated = await updateCumulativeClosing(
      closing,
      branchId,
      targetDateStr,
    );
    logger.info(`Terminal deposit ${depositId} voided for ${targetDateStr}`);
    return updated;
  } catch (error) {
    logger.error(`Order Service Error: voidTerminalDeposit - ${error.message}`);
    throw error;
  }
};

// ── Finalize Day Closing (Lock Day) ──
exports.finalizeAccountClosing = async (data) => {
  try {
    const { date, branchId, closedBy = "Manager" } = data;
    if (!date) throw new Error("Date is required.");
    if (!branchId) throw new Error("BranchId is required.");

    const targetDateStr = String(date).split("T")[0];
    let closing = await AccountClosing.findOne({
      date: targetDateStr,
      branchId,
    });
    if (!closing) throw new Error("No deposits found to finalize.");

    // Update cumulative totals & live system figures before final check
    closing = await updateCumulativeClosing(closing, branchId, targetDateStr);

    if (closing.grandShortage < -0.005) {
      throw new Error(
        `Cannot close day: Shortage of $${Math.abs(closing.grandShortage).toFixed(2)} remaining.`,
      );
    }

    closing.status = "closed";
    closing.closedBy = closedBy;
    closing.closedAt = new Date();

    const updated = await closing.save();
    logger.info(
      `Day account finalized/closed for ${targetDateStr} by ${closedBy}`,
    );
    return updated;
  } catch (error) {
    logger.error(
      `Order Service Error: finalizeAccountClosing - ${error.message}`,
    );
    throw error;
  }
};
