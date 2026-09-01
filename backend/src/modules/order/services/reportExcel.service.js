const logger = require("../../../shared/utils/logger");

const escapeCSVCell = (val) => {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const formatRow = (cells) => {
  return cells.map(escapeCSVCell).join(",") + "\r\n";
};

exports.generateReportCsv = (type, data, dateRangeStr, res) => {
  try {
    const titleMap = {
      item_sales: "Item Sales Report",
      hourly_sales: "Hourly Sales Report",
      cash_out_summary: "Cash Out By Employee Summary",
      monthly_sales_summary: "Monthly Sales Summary (Accounting)",
      failed_transaction: "Failed Transactions Report",
      refund_orders: "Refund Orders Report",
    };

    const reportTitle = titleMap[type] || "Sales Report";

    
    let csvContent = "\uFEFF";

    
    csvContent += formatRow(["Pizza Hut"]);
    csvContent += formatRow([reportTitle]);
    csvContent += formatRow([`Period: ${dateRangeStr}`]);
    csvContent += formatRow([]); 

    if (type === "item_sales") {
      csvContent += formatRow(["Item Name", "Product ID", "# Sold", "Sales", "% Sales"]);
      
      data.forEach((group) => {
        
        csvContent += formatRow([group.categoryName.toUpperCase()]);
        
        group.items.forEach((item) => {
          csvContent += formatRow([
            item.name,
            item.productId || "M----",
            item.quantitySold,
            item.totalSales.toFixed(2),
            `${item.percentageSales.toFixed(2)}%`,
          ]);
        });

        
        csvContent += formatRow([
          `Subtotal (${group.categoryName})`,
          "",
          group.subtotalSold,
          group.subtotalSales.toFixed(2),
          "",
        ]);
        csvContent += formatRow([]); 
      });

    } else if (type === "hourly_sales") {
      csvContent += formatRow(["Time Slot", "# Orders", "Total Sales"]);

      const activeSlots = data.filter((slot) => slot.orderCount > 0 || (slot.startHour >= 10 && slot.startHour <= 21));
      let grandOrders = 0;
      let grandSales = 0;

      activeSlots.forEach((slot) => {
        grandOrders += slot.orderCount;
        grandSales += slot.totalSales;
        csvContent += formatRow([slot.label, slot.orderCount, slot.totalSales.toFixed(2)]);
      });

      csvContent += formatRow([]);
      csvContent += formatRow(["TOTAL", grandOrders, grandSales.toFixed(2)]);

    } else if (type === "cash_out_summary") {
      csvContent += formatRow(["Employee Name", "# of Orders", "Last Cash Out Date", "Total Cash Out Amount"]);

      let grandTotal = 0;
      let grandOrders = 0;

      const formatDate = (dateStr) => {
        try {
          const d = new Date(dateStr);
          return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        } catch {
          return dateStr;
        }
      };

      data.forEach((item) => {
        grandOrders += item.orderCount;
        grandTotal += item.totalAmount;
        csvContent += formatRow([
          item.employeeName,
          item.orderCount,
          formatDate(item.lastCashOut),
          item.totalAmount.toFixed(2),
        ]);
      });

      csvContent += formatRow([]);
      csvContent += formatRow(["TOTAL", grandOrders, "", grandTotal.toFixed(2)]);

    } else if (type === "monthly_sales_summary") {
      // Row 1: Super Category Header Row
      csvContent += formatRow([
        "",
        "SALES SUMMARY", "", "", "", "", "", "",
        "PAYMENT TYPE", "", "", "", "", "", "", "",
        "ORDER TYPE", "", "", "", "",
        "ORDERS COUNT", "", "", "", "",
        "TAX BREAKDOWN", "", "", "",
        "CARD TYPE BREAKDOWN", "", "", "",
        "ONLINE CHANNELS", "", "", "", "",
        "POS", "",
        "STORE EXPENSES",
        "SHORTAGE / OVERAGE", "",
        "DEPOSITS", "", "",
        "MONEY TO BE COLLECTED", "", ""
      ]);

      // Row 2: Sub Category Header Row
      csvContent += formatRow([
        "Date",
        "Sub Total", "Delivery Charges", "Discount", "Tax (GST)", "Grand Total", "Tips", "Final Amount",
        "Cash Sales", "Account Pay", "Credit Card Sales", "Debit Card Sales", "Grand Total", "Debit Card Tips", "Credit Card Tips", "Final Amount",
        "Take-Out", "Dine-in", "Delivery", "Drive Through", "Total Order Type",
        "Completed", "Paid Cancelled", "Unpaid Cancelled", "Refund Orders", "Refund Amount",
        "PST", "GST", "HST", "Total Tax",
        "INTERAC / DEBIT", "VISA", "MASTERCARD", "GIFT CARD",
        "Website", "Uber Eats", "Skip The Dishes", "DoorDash", "Total Online",
        "POS Sales", "Total POS",
        "Expense",
        "Shortage Amount", "Overage Amount",
        "Cash Deposit", "Card Deposit", "Account Pay Deposit",
        "Cash (Net Register)", "Card", "Account Pay"
      ]);

      const grand = {
        subtotal: 0, deliveryCharges: 0, discount: 0, tax: 0, grandTotal: 0, tips: 0, finalAmount: 0,
        cash: 0, accountPay: 0, creditSales: 0, debitSales: 0, paymentGrand: 0, debitTips: 0, creditTips: 0, paymentFinal: 0,
        takeout: 0, dineIn: 0, delivery: 0, driveThrough: 0, orderTypeTotal: 0,
        completed: 0, paidCancelled: 0, unpaidCancelled: 0, refund: 0, refundAmount: 0,
        pst: 0, gst: 0, hst: 0, taxTotal: 0,
        interac: 0, visa: 0, mastercard: 0, giftCard: 0,
        website: 0, uber: 0, skip: 0, doordash: 0, onlineTotal: 0,
        posSales: 0, posTotal: 0,
        expense: 0, shortage: 0, overage: 0,
        depCash: 0, depCard: 0, depAccountPay: 0,
        collCash: 0, collCard: 0, collAccountPay: 0,
      };

      data.forEach((row) => {
        grand.subtotal += row.salesSummary.subtotal;
        grand.deliveryCharges += row.salesSummary.deliveryCharges;
        grand.discount += row.salesSummary.discount;
        grand.tax += row.salesSummary.tax;
        grand.grandTotal += row.salesSummary.grandTotal;
        grand.tips += row.salesSummary.tips;
        grand.finalAmount += row.salesSummary.finalAmount;

        grand.cash += row.paymentType.cash;
        grand.accountPay += row.paymentType.accountPay;
        grand.creditSales += row.paymentType.creditCardSales;
        grand.debitSales += row.paymentType.debitCardSales;
        grand.paymentGrand += row.paymentType.grandTotal;
        grand.debitTips += row.paymentType.debitTips;
        grand.creditTips += row.paymentType.creditTips;
        grand.paymentFinal += row.paymentType.finalAmount;

        grand.takeout += row.orderType.takeout;
        grand.dineIn += row.orderType.dineIn;
        grand.delivery += row.orderType.delivery;
        grand.driveThrough += row.orderType.driveThrough;
        grand.orderTypeTotal += row.orderType.total;

        grand.completed += row.orders.completed;
        grand.paidCancelled += row.orders.paidCancelled;
        grand.unpaidCancelled += row.orders.unpaidCancelled;
        grand.refund += row.orders.refund;
        grand.refundAmount += row.orders.refundAmount;

        grand.pst += row.taxBreakdown.pst;
        grand.gst += row.taxBreakdown.gst;
        grand.hst += row.taxBreakdown.hst;
        grand.taxTotal += row.taxBreakdown.total;

        grand.interac += row.cardType.interac;
        grand.visa += row.cardType.visa;
        grand.mastercard += row.cardType.mastercard;
        grand.giftCard += row.cardType.giftCard || 0;

        grand.website += row.online.website;
        grand.uber += row.online.uber;
        grand.skip += row.online.skip;
        grand.doordash += row.online.doordash;
        grand.onlineTotal += row.online.total;

        grand.posSales += row.pos.posSales;
        grand.posTotal += row.pos.total;

        grand.expense += row.expense.amount;
        grand.shortage += row.shortage?.shortage || 0;
        grand.overage += row.shortage?.overage || 0;

        grand.depCash += row.deposit.cash;
        grand.depCard += row.deposit.card;
        grand.depAccountPay += row.deposit.accountPay;

        grand.collCash += row.moneyToBeCollected.cash;
        grand.collCard += row.moneyToBeCollected.card;
        grand.collAccountPay += row.moneyToBeCollected.accountPay;

        csvContent += formatRow([
          "\t" + row.date,
          // 1. Sales Summary (7)
          row.salesSummary.subtotal.toFixed(2),
          row.salesSummary.deliveryCharges.toFixed(2),
          `(${row.salesSummary.discount.toFixed(2)})`,
          row.salesSummary.tax.toFixed(2),
          row.salesSummary.grandTotal.toFixed(2),
          row.salesSummary.tips.toFixed(2),
          row.salesSummary.finalAmount.toFixed(2),
          // 2. Payment Type (8)
          row.paymentType.cash.toFixed(2),
          row.paymentType.accountPay.toFixed(2),
          row.paymentType.creditCardSales.toFixed(2),
          row.paymentType.debitCardSales.toFixed(2),
          row.paymentType.grandTotal.toFixed(2),
          row.paymentType.debitTips.toFixed(2),
          row.paymentType.creditTips.toFixed(2),
          row.paymentType.finalAmount.toFixed(2),
          // 3. Order Type (5)
          row.orderType.takeout.toFixed(2),
          row.orderType.dineIn.toFixed(2),
          row.orderType.delivery.toFixed(2),
          row.orderType.driveThrough.toFixed(2),
          row.orderType.total.toFixed(2),
          // 4. Orders Count (5)
          row.orders.completed,
          row.orders.paidCancelled,
          row.orders.unpaidCancelled,
          row.orders.refund,
          row.orders.refundAmount.toFixed(2),
          // 5. Tax Breakdown (4)
          row.taxBreakdown.pst.toFixed(2),
          row.taxBreakdown.gst.toFixed(2),
          row.taxBreakdown.hst.toFixed(2),
          row.taxBreakdown.total.toFixed(2),
          // 6. Card Type Breakdown (4)
          row.cardType.interac.toFixed(2),
          row.cardType.visa.toFixed(2),
          row.cardType.mastercard.toFixed(2),
          (row.cardType.giftCard || 0).toFixed(2),
          // 7. Online Channels (5)
          row.online.website.toFixed(2),
          row.online.uber.toFixed(2),
          row.online.skip.toFixed(2),
          row.online.doordash.toFixed(2),
          row.online.total.toFixed(2),
          // 8. POS (2)
          row.pos.posSales.toFixed(2),
          row.pos.total.toFixed(2),
          // 9. Store Expenses (1)
          row.expense.amount.toFixed(2),
          // 10. Shortage / Overage (2)
          (row.shortage?.shortage || 0).toFixed(2),
          (row.shortage?.overage || 0).toFixed(2),
          // 11. Deposits (3)
          row.deposit.cash.toFixed(2),
          row.deposit.card.toFixed(2),
          row.deposit.accountPay.toFixed(2),
          // 12. Money To Be Collected (3)
          row.moneyToBeCollected.cash.toFixed(2),
          row.moneyToBeCollected.card.toFixed(2),
          row.moneyToBeCollected.accountPay.toFixed(2),
        ]);
      });

      csvContent += formatRow([]);
      csvContent += formatRow([
        "TOTAL",
        grand.subtotal.toFixed(2),
        grand.deliveryCharges.toFixed(2),
        `(${grand.discount.toFixed(2)})`,
        grand.tax.toFixed(2),
        grand.grandTotal.toFixed(2),
        grand.tips.toFixed(2),
        grand.finalAmount.toFixed(2),

        grand.cash.toFixed(2),
        grand.accountPay.toFixed(2),
        grand.creditSales.toFixed(2),
        grand.debitSales.toFixed(2),
        grand.paymentGrand.toFixed(2),
        grand.debitTips.toFixed(2),
        grand.creditTips.toFixed(2),
        grand.paymentFinal.toFixed(2),

        grand.takeout.toFixed(2),
        grand.dineIn.toFixed(2),
        grand.delivery.toFixed(2),
        grand.driveThrough.toFixed(2),
        grand.orderTypeTotal.toFixed(2),

        grand.completed,
        grand.paidCancelled,
        grand.unpaidCancelled,
        grand.refund,
        grand.refundAmount.toFixed(2),

        grand.pst.toFixed(2),
        grand.gst.toFixed(2),
        grand.hst.toFixed(2),
        grand.taxTotal.toFixed(2),

        grand.interac.toFixed(2),
        grand.visa.toFixed(2),
        grand.mastercard.toFixed(2),
        grand.giftCard.toFixed(2),

        grand.website.toFixed(2),
        grand.uber.toFixed(2),
        grand.skip.toFixed(2),
        grand.doordash.toFixed(2),
        grand.onlineTotal.toFixed(2),

        grand.posSales.toFixed(2),
        grand.posTotal.toFixed(2),

        grand.expense.toFixed(2),
        grand.shortage.toFixed(2),
        grand.overage.toFixed(2),

        grand.depCash.toFixed(2),
        grand.depCard.toFixed(2),
        grand.depAccountPay.toFixed(2),

        grand.collCash.toFixed(2),
        grand.collCard.toFixed(2),
        grand.collAccountPay.toFixed(2),
      ]);

    } else if (type === "failed_transaction" || type === "refund_orders") {
      csvContent += formatRow(["Order #", "Customer Name", "Subtotal", "Grand Total", "Type", "Payment Status", "Order Status"]);

      let grandTotal = 0;

      data.forEach((order) => {
        grandTotal += order.total;
        csvContent += formatRow([
          order.orderNumber,
          order.customer?.name || "No Name",
          order.subtotal.toFixed(2),
          order.total.toFixed(2),
          order.orderType,
          order.paymentStatus,
          order.status,
        ]);
      });

      csvContent += formatRow([]);
      csvContent += formatRow(["TOTAL", "", "", grandTotal.toFixed(2), "", "", ""]);
    }

    res.write(Buffer.from(csvContent, "utf-8"));
    res.end();
  } catch (error) {
    logger.error(`Error generating report Excel/CSV: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate report Excel" });
    }
  }
};
