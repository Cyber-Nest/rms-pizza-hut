const orderService = require("../services/order.service");
const receiptPdfService = require("../services/receiptPdf.service");
const reportPdfService = require("../services/reportPdf.service");
const reportExcelService = require("../services/reportExcel.service");
const silentPrintService = require("../services/silentPrint.service");
const emailService = require("../../../shared/services/email.service");
const Order = require("../models/order.model");
const { triggerPrintJob } = require("../../../config/pusher");
const fs = require("fs");
const logger = require("../../../shared/utils/logger");
const { getLocalDateStr } = require("../../../shared/utils/timezone");

const formatDateOnly = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return dateStr;
};

const handleError = (res, error, status = 400) => {
  logger.error(`Order Controller Error: ${error.message}`);
  return res.status(status).json({ success: false, message: error.message });
};

exports.createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      orderType,
      paymentStatus,
      date,
      startDate,
      endDate,
      fields,
      excludeReceptionCompleted,
      excludeKitchenCleared,
      page,
      limit,
      search,
      branchId,
    } = req.query;
    const orders = await orderService.getAllOrders({
      branchId,
      status,
      orderType,
      paymentStatus,
      date,
      startDate,
      endDate,
      fields,
      excludeReceptionCompleted: excludeReceptionCompleted === "true",
      excludeKitchenCleared: excludeKitchenCleared === "true",
      page,
      limit,
      search,
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getSalesSummary = async (req, res) => {
  try {
    const { date, startDate, endDate, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const summary = await orderService.getSalesSummary({
      date,
      startDate,
      endDate,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getReportsSummary = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const summary = await orderService.getReportsSummary({
      startDate,
      endDate,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getItemSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const summary = await orderService.getItemSalesSummary({
      startDate,
      endDate,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getHourlySalesSummary = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const summary = await orderService.getHourlySalesSummary({
      startDate,
      endDate,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getMonthlySalesSummary = async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const summary = await orderService.getMonthlySalesSummary({
      startDate,
      endDate,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const metrics = await orderService.getDashboardMetrics({
      date,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getUniqueCustomers = async (req, res) => {
  try {
    const activeBranchId = req.activeBranchId || req.query.branchId;
    const { date } = req.query;
    const customers = await orderService.getUniqueCustomers({
      date,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.searchCustomer = async (req, res) => {
  try {
    const { query, branchId } = req.query;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Query must be at least 3 characters.",
      });
    }
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const customer = await orderService.searchCustomer({
      query: query.trim(),
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error, 404);
  }
};

exports.downloadReceiptPdf = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    const itemsFilter = req.query.itemsFilter || "all"; // "wings_only" | "all"
    const paperSize = req.query.paperSize || "80mm";
    const fileLabel =
      itemsFilter === "wings_only" ? "wings-receipt" : "invoice";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileLabel}-${order.orderNumber}.pdf`,
    );
    await receiptPdfService.generateReceiptPdf(
      order,
      res,
      itemsFilter,
      paperSize,
    );
  } catch (error) {
    handleError(res, error, 500);
  }
};

// POST /:id/print  — generates PDF to temp file and sends to physical printer via pdf-to-printer
exports.silentPrintOrderReceipt = async (req, res) => {
  let tempPdfPath = null;
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const paperSize = req.body?.paperSize || req.query?.paperSize || "80mm";
    const printerName = req.body?.printerName || req.query?.printerName || null;
    const itemsFilter =
      req.body?.itemsFilter || req.query?.itemsFilter || "all";

    const cleanOrderNum = (order.orderNumber || req.params.id).replace("#", "");
    const filename = `receipt-${cleanOrderNum}-${Date.now()}.pdf`;
    tempPdfPath = silentPrintService.getTempReceiptPath(filename);

    // Generate PDF to temp file
    const fileStream = fs.createWriteStream(tempPdfPath);
    await receiptPdfService.generateReceiptPdfStream(
      order,
      fileStream,
      itemsFilter,
      paperSize,
    );
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    // Send to Windows print spooler via pdf-to-printer (SumatraPDF)
    const printResult = await silentPrintService.printPdfSilently(
      tempPdfPath,
      printerName,
    );

    // If on Vercel/Cloud: push print-job event via Pusher so Store PC agent can print locally
    if (printResult.printer === "Cloud Bypassed" && order.branchId) {
      await triggerPrintJob(order.branchId, {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        pdfUrl: `/api/orders/${order._id}/pdf?paperSize=${paperSize}&itemsFilter=${itemsFilter}`,
        paperSize,
        itemsFilter,
        printerName: printerName || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Receipt sent to printer successfully for order ${order.orderNumber}`,
      printer: printResult.printer,
    });
  } catch (error) {
    handleError(res, error, 500);
  } finally {
    if (tempPdfPath) {
      setTimeout(() => {
        if (fs.existsSync(tempPdfPath)) fs.unlink(tempPdfPath, () => {});
      }, 15000);
    }
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const {
      status,
      note,
      receptionCompleted,
      userName,
      employeeName,
      station,
    } = req.body;
    if (!status)
      return res
        .status(400)
        .json({ success: false, message: "Status is required." });
    const order = await orderService.updateOrderStatus(
      req.params.id,
      status,
      note,
      receptionCompleted,
      userName || employeeName || "Manager",
      station,
    );
    res.status(200).json({
      success: true,
      data: {
        _id: order._id,
        status: order.status,
        makeTableStatus: order.makeTableStatus,
        wingsStatus: order.wingsStatus,
        receptionCompleted: order.receptionCompleted,
      },
    });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.kitchenClear = async (req, res) => {
  try {
    const { userName, employeeName } = req.body || {};
    const order = await orderService.kitchenClear(
      req.params.id,
      userName || employeeName || "Manager",
    );
    res.status(200).json({
      success: true,
      data: {
        _id: order._id,
        status: order.status,
        kitchenCleared: order.kitchenCleared,
      },
    });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.markOrderPaid = async (req, res) => {
  try {
    const { payments } = req.body;
    const order = await orderService.markOrderPaid(req.params.id, payments);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { reason, userName, employeeName } = req.body || {};
    const order = await orderService.cancelOrder(req.params.id, {
      reason: reason || "",
      userName: userName || employeeName || "Manager",
    });
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.refundOrder = async (req, res) => {
  try {
    const { reason, userName, employeeName } = req.body || {};
    const result = await orderService.refundOrder(req.params.id, {
      reason,
      userName: userName || employeeName || "Manager",
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.getNextOrderNumber = async (req, res) => {
  try {
    const { type, branchId } = req.query;
    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "type query parameter is required." });
    }
    const nextNumber = await orderService.getNextOrderNumber(
      type,
      branchId || null,
    );
    res.status(200).json({ success: true, data: nextNumber });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.updateOrderDueTime = async (req, res) => {
  try {
    const { dueAt } = req.body;
    if (!dueAt)
      return res
        .status(400)
        .json({ success: false, message: "dueAt is required." });
    const order = await orderService.updateOrderDueTime(req.params.id, dueAt);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.updateOrderItems = async (req, res) => {
  try {
    const order = await orderService.updateOrderItems(req.params.id, req.body);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.saveDeposit = async (req, res) => {
  try {
    const { date, cashAmount, cardAmount, accountPayAmount, branchId } =
      req.body;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const deposit = await orderService.saveDeposit({
      date,
      cashAmount,
      cardAmount,
      accountPayAmount,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data: deposit });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.exportReport = async (req, res) => {
  try {
    const { type, format, startDate, endDate, search, status, branchId } =
      req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    if (!type || !format) {
      return res.status(400).json({
        success: false,
        message: "Type and format query parameters are required.",
      });
    }

    let reportData = [];
    const dateRangeStr =
      startDate === endDate
        ? formatDateOnly(startDate)
        : `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`;

    if (type === "item_sales") {
      reportData = await orderService.getItemSalesSummary({
        startDate,
        endDate,
        branchId: activeBranchId,
      });
    } else if (type === "hourly_sales") {
      reportData = await orderService.getHourlySalesSummary({
        startDate,
        endDate,
        branchId: activeBranchId,
      });
    } else if (type === "monthly_sales_summary") {
      reportData = await orderService.getMonthlySalesSummary({
        startDate,
        endDate,
        branchId: activeBranchId,
      });
    } else if (type === "cash_out_summary") {
      const allOrders = await orderService.getAllOrders({
        startDate,
        endDate,
        status: "completed",
        branchId: activeBranchId,
      });
      const groups = {};
      allOrders.forEach((order) => {
        const empName =
          order.customer?.name === "No Name" || !order.customer?.name
            ? "Manager"
            : order.customer.name;
        if (!groups[empName]) {
          groups[empName] = {
            employeeName: empName,
            orderCount: 0,
            lastCashOut: order.createdAt,
            totalAmount: 0,
          };
        }
        groups[empName].orderCount += 1;
        groups[empName].totalAmount += order.total;
        if (new Date(order.createdAt) > new Date(groups[empName].lastCashOut)) {
          groups[empName].lastCashOut = order.createdAt;
        }
      });
      reportData = Object.values(groups);
    } else if (type === "failed_transaction" || type === "refund_orders") {
      const allOrders = await orderService.getAllOrders({
        startDate,
        endDate,
        branchId: activeBranchId,
      });
      reportData = allOrders.filter((order) => {
        if (type === "failed_transaction") {
          const isFailed =
            order.status === "cancelled" || order.paymentStatus === "unpaid";
          if (!isFailed) return false;
        } else {
          const isRefunded = order.status === "cancelled";
          if (!isRefunded) return false;
        }

        if (search && search.trim() !== "") {
          const kw = search.toLowerCase().trim();
          const numMatch = order.orderNumber.toLowerCase().includes(kw);
          const nameMatch =
            order.customer?.name?.toLowerCase().includes(kw) || false;
          const phoneMatch = order.customer?.phone?.includes(kw) || false;
          if (!numMatch && !nameMatch && !phoneMatch) return false;
        }

        if (status && status !== "") {
          if (order.status !== status) return false;
        }

        return true;
      });
    }

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}-report-${startDate}-to-${endDate}.pdf`,
      );
      await reportPdfService.generateReportPdf(
        type,
        reportData,
        dateRangeStr,
        res,
        activeBranchId,
      );
    } else {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}-report-${startDate}-to-${endDate}.csv`,
      );
      reportExcelService.generateReportCsv(type, reportData, dateRangeStr, res);
    }
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.downloadSalesSummaryPdf = async (req, res) => {
  try {
    const { date, startDate, endDate, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const summary = await orderService.getSalesSummary({
      date,
      startDate,
      endDate,
      branchId: activeBranchId,
    });

    const fileDateStr = date || startDate || getLocalDateStr();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-summary-${fileDateStr}.pdf`,
    );

    await receiptPdfService.generateSalesSummaryReceiptPdf(
      summary,
      fileDateStr,
      res,
      activeBranchId,
    );
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.silentPrintSalesSummary = async (req, res) => {
  let tempPdfPath = null;
  try {
    const { date, startDate, endDate, branchId, printerName } = req.body || {};
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id || req.activeBranchId || req.query?.branchId || req.body?.branchId;
    const summary = await orderService.getSalesSummary({
      date,
      startDate,
      endDate,
      branchId: activeBranchId,
    });

    const fileDateStr = date || startDate || getLocalDateStr();
    const cleanDate = fileDateStr.replace(/[^a-zA-Z0-9-]/g, "");
    const filename = `sales-summary-${cleanDate}-${Date.now()}.pdf`;
    tempPdfPath = silentPrintService.getTempReceiptPath(filename);

    const fileStream = fs.createWriteStream(tempPdfPath);
    await receiptPdfService.generateSalesSummaryReceiptPdf(
      summary,
      fileDateStr,
      fileStream,
      activeBranchId,
    );
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    const printResult = await silentPrintService.printPdfSilently(
      tempPdfPath,
      printerName || null,
    );

    if (printResult.printer === "Cloud Bypassed" && activeBranchId) {
      const pdfUrl = `/api/orders/sales-summary/pdf?date=${fileDateStr}&branchId=${activeBranchId}`;
      await triggerPrintJob(activeBranchId, {
        orderId: "sales-summary",
        orderNumber: `Sales Summary (${fileDateStr})`,
        pdfUrl,
        paperSize: "80mm",
        type: "sales_summary",
        date: fileDateStr,
        printerName: printerName || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Sales summary sent to printer successfully.`,
      printer: printResult.printer,
    });
  } catch (error) {
    handleError(res, error, 500);
  } finally {
    if (tempPdfPath) {
      setTimeout(() => {
        if (fs.existsSync(tempPdfPath)) fs.unlink(tempPdfPath, () => {});
      }, 15000);
    }
  }
};

exports.getNextOrderNumber = async (req, res) => {
  try {
    const { type, branchId } = req.query;
    const activeBranchId = req.activeBranchId || branchId;
    const nextNumber = await orderService.getNextOrderNumber(
      type,
      activeBranchId,
    );
    res.status(200).json({ success: true, data: nextNumber });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.getAccountClosing = async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const data = await orderService.getAccountClosingData({
      date,
      branchId: activeBranchId,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.saveTerminalDeposit = async (req, res) => {
  try {
    const branchId =
      req.body.branchId || req.branch?.branchId || req.branch?._id;
    if (!branchId)
      return res
        .status(400)
        .json({ success: false, message: "branchId is required." });
    const closing = await orderService.saveTerminalDeposit({
      ...req.body,
      branchId,
    });
    res.status(200).json({ success: true, data: closing });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.voidTerminalDeposit = async (req, res) => {
  try {
    const branchId =
      req.body.branchId || req.branch?.branchId || req.branch?._id;
    if (!branchId)
      return res
        .status(400)
        .json({ success: false, message: "branchId is required." });
    const closing = await orderService.voidTerminalDeposit({
      ...req.body,
      branchId,
    });
    res.status(200).json({ success: true, data: closing });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.finalizeAccountClosing = async (req, res) => {
  try {
    const branchId =
      req.body.branchId || req.branch?.branchId || req.branch?._id;
    if (!branchId)
      return res
        .status(400)
        .json({ success: false, message: "branchId is required." });
    const closing = await orderService.finalizeAccountClosing({
      ...req.body,
      branchId,
    });
    res.status(200).json({ success: true, data: closing });
  } catch (error) {
    handleError(res, error, 400);
  }
};

exports.downloadDepositReceiptPdf = async (req, res) => {
  try {
    const { date, depositId, branchId, cash, interac, visa, mastercard, giftCard, totalDeposit, comments } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const depositData = {
      cash: parseFloat(cash) || 0,
      interac: parseFloat(interac) || 0,
      visa: parseFloat(visa) || 0,
      mastercard: parseFloat(mastercard) || 0,
      giftCard: parseFloat(giftCard) || 0,
      totalDeposit: parseFloat(totalDeposit) || 0,
      comments: comments || "",
    };

    const fileDateStr = date || getLocalDateStr();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=deposit-receipt-${fileDateStr}.pdf`,
    );

    await receiptPdfService.generateDepositReceiptPdf(
      depositData,
      fileDateStr,
      res,
      activeBranchId,
    );
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.silentPrintDepositReceipt = async (req, res) => {
  let tempPdfPath = null;
  try {
    const { date, branchId, printerName, cash, interac, visa, mastercard, giftCard, totalDeposit, comments } = req.body || {};
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id || req.activeBranchId || req.query?.branchId || req.body?.branchId;
    const depositData = {
      cash: parseFloat(cash) || 0,
      interac: parseFloat(interac) || 0,
      visa: parseFloat(visa) || 0,
      mastercard: parseFloat(mastercard) || 0,
      giftCard: parseFloat(giftCard) || 0,
      totalDeposit: parseFloat(totalDeposit) || 0,
      comments: comments || "",
    };

    const fileDateStr = date || getLocalDateStr();
    const filename = `deposit-${Date.now()}.pdf`;
    tempPdfPath = silentPrintService.getTempReceiptPath(filename);

    const fileStream = fs.createWriteStream(tempPdfPath);
    await receiptPdfService.generateDepositReceiptPdf(
      depositData,
      fileDateStr,
      fileStream,
      activeBranchId,
    );
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    const printResult = await silentPrintService.printPdfSilently(
      tempPdfPath,
      printerName || null,
    );

    if (printResult.printer === "Cloud Bypassed" && activeBranchId) {
      const depositParams = new URLSearchParams({
        date: fileDateStr,
        branchId: String(activeBranchId),
        cash: String(cash || 0),
        interac: String(interac || 0),
        visa: String(visa || 0),
        mastercard: String(mastercard || 0),
        giftCard: String(giftCard || 0),
        totalDeposit: String(totalDeposit || 0),
        comments: comments || "",
      });
      const pdfUrl = `/api/orders/account-closing/deposit/pdf?${depositParams.toString()}`;
      await triggerPrintJob(activeBranchId, {
        orderId: "deposit-receipt",
        orderNumber: `Deposit Receipt (${fileDateStr})`,
        pdfUrl,
        paperSize: "80mm",
        type: "deposit_receipt",
        date: fileDateStr,
        printerName: printerName || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Deposit receipt sent to printer successfully.`,
      printer: printResult.printer,
    });
  } catch (error) {
    handleError(res, error, 500);
  } finally {
    if (tempPdfPath) {
      setTimeout(() => {
        if (fs.existsSync(tempPdfPath)) fs.unlink(tempPdfPath, () => {});
      }, 15000);
    }
  }
};

exports.downloadAccountClosingPdf = async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id;
    const closingData = await orderService.getAccountClosingData({
      date,
      branchId: activeBranchId,
    });

    const fileDateStr = date || getLocalDateStr();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=account-closing-${fileDateStr}.pdf`,
    );

    await receiptPdfService.generateAccountClosingReceiptPdf(
      closingData,
      fileDateStr,
      res,
      activeBranchId,
    );
  } catch (error) {
    handleError(res, error, 500);
  }
};

exports.silentPrintAccountClosing = async (req, res) => {
  let tempPdfPath = null;
  try {
    const { date, branchId, printerName } = req.body || {};
    const activeBranchId = branchId || req.branch?.branchId || req.branch?._id || req.activeBranchId || req.query?.branchId || req.body?.branchId;
    const closingData = await orderService.getAccountClosingData({
      date,
      branchId: activeBranchId,
    });

    const fileDateStr = date || getLocalDateStr();
    const filename = `account-closing-${Date.now()}.pdf`;
    tempPdfPath = silentPrintService.getTempReceiptPath(filename);

    const fileStream = fs.createWriteStream(tempPdfPath);
    await receiptPdfService.generateAccountClosingReceiptPdf(
      closingData,
      fileDateStr,
      fileStream,
      activeBranchId,
    );
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    const printResult = await silentPrintService.printPdfSilently(
      tempPdfPath,
      printerName || null,
    );

    if (printResult.printer === "Cloud Bypassed" && activeBranchId) {
      const pdfUrl = `/api/orders/account-closing/pdf?date=${fileDateStr}&branchId=${activeBranchId}`;
      await triggerPrintJob(activeBranchId, {
        orderId: "account-closing",
        orderNumber: `Account Closing (${fileDateStr})`,
        pdfUrl,
        paperSize: "80mm",
        type: "account_closing",
        date: fileDateStr,
        printerName: printerName || null,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Account closing receipt sent to printer successfully.`,
      printer: printResult.printer,
    });
  } catch (error) {
    handleError(res, error, 500);
  } finally {
    if (tempPdfPath) {
      setTimeout(() => {
        if (fs.existsSync(tempPdfPath)) fs.unlink(tempPdfPath, () => {});
      }, 15000);
    }
  }
};

exports.sendEmailReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name } = req.body || {};

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    let targetEmail = (email || order.customer?.email || "").trim();
    let targetName = (name || order.customer?.name || "").trim();

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer email address is required.",
      });
    }

    // Permanently update customer info in MongoDB if updated/provided
    let isUpdated = false;
    if (!order.customer) {
      order.customer = { name: "No Name", phone: "", email: "" };
    }

    if (email && email.trim() !== (order.customer.email || "")) {
      order.customer.email = email.trim();
      isUpdated = true;
    }

    if (name && name.trim() && name.trim() !== (order.customer.name || "") && name.trim() !== "No Name") {
      order.customer.name = name.trim();
      isUpdated = true;
    }

    if (isUpdated) {
      await order.save();
    }

    await emailService.sendOrderReceiptEmail({
      order,
      recipientEmail: targetEmail,
      recipientName: targetName,
    });

    return res.status(200).json({
      success: true,
      message: `Receipt sent successfully to ${targetEmail}`,
      data: order,
    });
  } catch (error) {
    handleError(res, error, 500);
  }
};

