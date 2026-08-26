const PDFDocument = require("pdfkit");
const logger = require("../../../shared/utils/logger");
const { TIMEZONE } = require("../../../shared/utils/timezone");
const Branch = require("../../company/models/branch.model");

const fmt = (val) => (typeof val === "number" && !isNaN(val) ? `$${val.toFixed(2)}` : "$0.00");
const fmtNum = (val) => (typeof val === "number" && !isNaN(val) ? val.toFixed(2) : "0.00");

exports.generateDriverDropPdf = async ({ driver, date, type = "both", settlement, orders, branchId, liveInputs }, res) => {
  try {
    const driverCode = driver.driverId || "EMP-003";
    const driverName = driver.name || "DRIVER";

    // Fetch dynamic branch info
    let branchInfo = {
      name: "Pizza Hut",
      code: "STORE",
      address: "",
      city: "",
      phone: "",
      gst: "",
    };
    try {
      const b = branchId
        ? await Branch.findById(branchId).lean()
        : await Branch.findOne().lean();
      if (b) {
        if (b.name) branchInfo.name = b.name;
        if (b.code) branchInfo.code = b.code;
        if (b.address) branchInfo.address = b.address;
        if (b.city) branchInfo.city = b.city;
        if (b.phone) branchInfo.phone = b.phone;
        const gstNum =
          b.settings?.mainSettings?.gstNumber || b.gstNumber || b.gst;
        if (gstNum) branchInfo.gst = gstNum;
      }
    } catch (err) {
      logger.warn(`Could not fetch branch for driver drop PDF: ${err.message}`);
    }

    const formattedDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", { timeZone: TIMEZONE, month: "2-digit", day: "2-digit", year: "numeric" });
    const formattedTime = new Date().toLocaleTimeString("en-US", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

    // Order Totals Breakdown
    const totalOrders = settlement ? settlement.totalOrders : orders.length;
    const totalCancels = 0;
    const totalSales = settlement ? settlement.totalSales : orders.reduce((s, o) => s + (o.total || 0), 0);
    const prepaidTips = settlement ? settlement.prepaidTips : orders.reduce((s, o) => s + (o.prepaidTip || 0), 0);
    
    // Net Prepaid Sales (excluding tip)
    const prepaidSales = settlement ? settlement.prepaidSales : orders.filter((o) => o.pd === "PP").reduce((s, o) => s + Math.max(0, (o.total || 0) - (o.prepaidTip || 0)), 0);
    const totalNewSales = settlement ? settlement.totalNewSales : Math.max(0, totalSales - prepaidSales - prepaidTips);

    // Terminal & Cash Inputs (Prioritize settlement -> liveInputs -> order defaults)
    const ordersTmSales = orders.filter((o) => o.pd === "TM").reduce((s, o) => s + (o.total || 0), 0);
    const ordersTmTips = orders.reduce((s, o) => s + (o.terminalTip || 0), 0);
    const ordersCsSales = orders.filter((o) => o.pd === "CS").reduce((s, o) => s + (o.total || 0), 0);

    const terminalSales = settlement ? settlement.terminalSales : (liveInputs?.terminalSales !== undefined ? liveInputs.terminalSales : ordersTmSales);
    const terminalTips = settlement ? settlement.terminalTips : (liveInputs?.terminalTips !== undefined ? liveInputs.terminalTips : ordersTmTips);
    const cashSales = settlement ? settlement.cashSales : (liveInputs?.cashSales !== undefined ? liveInputs.cashSales : ordersCsSales);
    const saleDue = settlement ? settlement.saleDue : (totalNewSales - terminalSales - terminalTips - cashSales);

    const driverBaseCommission = settlement ? settlement.driverBaseCommission : totalOrders * 6.0;
    const additionalCommission = settlement ? settlement.additionalCommission : (liveInputs?.additionalCommission || 0);
    const additionalReason = settlement ? settlement.additionalReason || "" : (liveInputs?.additionalReason || "");
    const driverTotalCommission = settlement ? settlement.driverTotalCommission : driverBaseCommission + additionalCommission;
    const totalTipsEarned = settlement ? settlement.totalTipsEarned : prepaidTips + terminalTips;
    const totalDriverEarning = settlement ? settlement.totalDriverEarning : driverTotalCommission + totalTipsEarned;
    const totalCommissionDue = settlement ? settlement.totalCommissionDue : driverTotalCommission;

    const doc = new PDFDocument({
      size: [226, 1800],
      margin: 10,
    });

    doc.pipe(res);

    const printableWidth = 206;
    const startX = 10;

    const drawDivider = () => {
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + printableWidth, doc.y)
        .dash(2, { space: 2 })
        .stroke("#000000")
        .undash();
      doc.moveDown(0.3);
    };

    const drawDoubleLine = () => {
      const y1 = doc.y;
      doc.moveTo(startX, y1).lineTo(startX + printableWidth, y1).strokeColor("#000000").lineWidth(1.8).stroke();
      doc.moveDown(0.3);
    };

    // Dynamic row calculation to prevent any multiline text overlap
    const drawRow = (left, right, isBold = true, indent = 0) => {
      const fontName = isBold ? "Helvetica-Bold" : "Helvetica";
      const fontSize = 11.5;
      doc.font(fontName).fontSize(fontSize);

      const leftWidth = printableWidth - 70 - indent;
      const rightWidth = 70;

      const leftHeight = doc.heightOfString(left, { width: leftWidth });
      const rightHeight = doc.heightOfString(right, { width: rightWidth });
      const rowHeight = Math.max(leftHeight, rightHeight);

      const rowY = doc.y;
      doc.text(left, startX + indent, rowY, { width: leftWidth });
      doc.text(right, startX + printableWidth - 70, rowY, { width: rightWidth, align: "right" });

      doc.y = rowY + rowHeight + 2;
    };

    // ── SLIP 1: EMPLOYEE SALES REPORT SLIP ──
    if (type === "sales" || type === "both") {
      // Header
      doc
        .font("Helvetica-Bold")
        .fontSize(17)
        .fillColor("#000000")
        .text(branchInfo.name, startX, doc.y, {
          align: "center",
          width: printableWidth,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#000000")
        .text(branchInfo.code, startX, doc.y, {
          align: "center",
          width: printableWidth,
        });
      doc.moveDown(0.4);

      // Store info box
      const boxStartY = doc.y;
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
      doc.text(branchInfo.address, startX + 5, boxStartY + 4, {
        align: "center",
        width: printableWidth - 10,
      });
      doc.text(branchInfo.city, { align: "center", width: printableWidth - 10 });
      doc.text(`Tel # : ${branchInfo.phone}`, {
        align: "center",
        width: printableWidth - 10,
      });
      doc.text(`GST# : ${branchInfo.gst}`, {
        align: "center",
        width: printableWidth - 10,
      });
      const boxEndY = doc.y + 4;
      doc
        .rect(startX + 2, boxStartY, printableWidth - 4, boxEndY - boxStartY)
        .dash(2, { space: 2 })
        .stroke("#000000")
        .undash();
      doc.y = boxEndY + 8;

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .text("EMPLOYEE SALES REPORT", startX, doc.y, {
          align: "center",
          width: printableWidth,
        });
      doc.moveDown(0.2);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(`Employee: ${driverCode} - ${driverName}`, startX, doc.y, {
          align: "center",
          width: printableWidth,
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .text(`Date: ${formattedDate}  ${formattedTime}`, startX, doc.y, {
          align: "center",
          width: printableWidth,
        });
      doc.moveDown(0.4);

      // Order Details Section
      drawDivider();
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("ORDER DETAILS", startX, doc.y);
      doc.moveDown(0.2);
      drawDivider();

      const headerY = doc.y;
      doc.font("Helvetica-Bold").fontSize(10.5);
      doc.text("TICKET NAME", startX, headerY, { width: 88 });
      doc.text("TOTAL", startX + 88, headerY, { width: 44, align: "right" });
      doc.text("DC", startX + 132, headerY, { width: 34, align: "right" });
      doc.text("PD", startX + 166, headerY, { width: 40, align: "right" });
      doc.moveDown(0.3);
      drawDivider();

      if (orders && orders.length > 0) {
        orders.forEach((o) => {
          const rowY = doc.y;
          const tName = (o.ticketName || `${o.orderNumber || ""} ${o.customerName || ""}`).trim().slice(0, 13);
          doc.font("Helvetica").fontSize(10);
          doc.text(tName, startX, rowY, { width: 88 });
          doc.text(fmt(o.total), startX + 88, rowY, { width: 44, align: "right" });
          doc.text(fmt(o.dc || 6.0), startX + 132, rowY, { width: 34, align: "right" });
          doc.font("Helvetica-Bold").text(o.pd || "PP", startX + 166, rowY, { width: 40, align: "right" });
          doc.y = rowY + 14;
        });
      } else {
        doc.font("Helvetica-Oblique").fontSize(10.5).text("No orders delivered", startX, doc.y, { align: "center", width: printableWidth });
        doc.moveDown(0.3);
      }
      drawDivider();

      // Employee Sales Summary
      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("EMPLOYEE SALES SUMMARY", startX, doc.y);
      doc.moveDown(0.2);
      drawDivider();

      drawRow("Total Orders.....:", String(totalOrders));
      drawRow("Total Cancels....:", String(totalCancels));
      doc.moveDown(0.2);

      drawRow("Total Sales......:", fmt(totalSales), true);
      drawRow("- Prepaid Sales..:", fmt(prepaidSales), false);
      drawRow("- Prepaid Tips...:", fmt(prepaidTips), false);
      drawDivider();

      drawRow("= Total New Sales:", fmt(totalNewSales), true);
      doc.moveDown(0.2);

      drawRow("- Terminal Sales.:", fmt(terminalSales), false);
      drawRow("- Terminal Tips..:", fmt(terminalTips), false);
      drawRow("- Cash Sales.....:", fmt(cashSales), false);
      drawDoubleLine();

      drawRow("= Sale Due.......:", fmt(saleDue), true);
      drawDivider();

      drawRow("Prepaid Tips Due..:", fmt(prepaidTips), true);
      drawRow("Terminal Tips Due.:", fmt(terminalTips), true);
      drawDivider();

      drawRow("Total Tips Due....:", fmt(prepaidTips + terminalTips), true);
      drawRow("Commission Due....:", fmt(totalCommissionDue), true);
      doc.moveDown(0.5);

      doc.font("Helvetica-Bold").fontSize(10.5).text("Printed for Driver Drop Reconciliation", startX, doc.y, { align: "center", width: printableWidth });
      doc.moveDown(1.5);
    }

    // ── SLIP 2: DRIVER COMMISSION SETTLEMENT SLIP ──
    if (type === "commission" || type === "both") {
      if (type === "both") {
        doc.moveDown(1);
      }

      drawDivider();
      doc.font("Helvetica-Bold").fontSize(15);
      doc.text("DRIVER EARNING REPORT", startX, doc.y, { align: "center", width: printableWidth });
      doc.moveDown(0.2);

      doc.font("Helvetica-Bold").fontSize(13.5);
      doc.text(driverName.toUpperCase(), startX, doc.y, { align: "center", width: printableWidth });
      doc.moveDown(0.2);

      doc.font("Helvetica-Bold").fontSize(10.5);
      doc.text(`${formattedDate} ${formattedTime}`, startX, doc.y, { align: "center", width: printableWidth });
      doc.moveDown(0.3);
      drawDivider();

      // TIPS SECTION
      drawRow("Prepaid Tips", fmt(prepaidTips), false);
      drawRow("Terminal Tips", fmt(terminalTips), false);
      drawDivider();
      drawRow("Total Tips", fmt(prepaidTips + terminalTips), true);
      doc.moveDown(0.4);

      // COMMISSION SECTION
      drawRow("Driver Base Commission", fmt(driverBaseCommission), false);
      if (additionalCommission > 0) {
        drawRow("Driver Addl Commission", fmt(additionalCommission), false);
      }
      drawRow("Driver Total Commission", fmt(driverTotalCommission), true);
      drawDoubleLine();

      // GRAND TOTAL
      doc.moveDown(0.3);
      const fontName = "Helvetica-Bold";
      const fontSize = 13;
      doc.font(fontName).fontSize(fontSize);

      const leftWidth = printableWidth - 75;
      const rightWidth = 75;

      const titleText = "Total Driver Earning";
      const valText = fmt(totalDriverEarning);

      const leftHeight = doc.heightOfString(titleText, { width: leftWidth });
      const rightHeight = doc.heightOfString(valText, { width: rightWidth });
      const rowHeight = Math.max(leftHeight, rightHeight);

      const totalRowY = doc.y;
      doc.text(titleText, startX, totalRowY, { width: leftWidth });
      doc.text(valText, startX + leftWidth, totalRowY, { width: rightWidth, align: "right" });

      doc.y = totalRowY + rowHeight + 4;
      drawDoubleLine();
      doc.moveDown(0.6);

      doc.font("Helvetica").fontSize(10.5).text("I have received the above amount in cash.", startX, doc.y);
      doc.moveDown(1.3);
      doc.font("Helvetica-Bold").fontSize(10.5).text("Signature: __________________________", startX, doc.y);
      doc.moveDown(0.8);
      drawDivider();
    }

    doc.end();
  } catch (error) {
    logger.error(`Error generating driver drop PDF: ${error.message}`);
    if (res && typeof res.status === "function" && !res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate driver drop PDF" });
    }
  }
};
