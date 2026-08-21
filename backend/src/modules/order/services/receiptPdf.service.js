const PDFDocument = require("pdfkit");
const logger = require("../../../shared/utils/logger");
const Branch = require("../../company/models/branch.model");

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER RECEIPT
// ═══════════════════════════════════════════════════════════════════════════════
exports.generateReceiptPdfStream = async (order, outputStream, itemsFilter = "all", paperSize = "58mm") => {
  try {
    // ── Branch info ──────────────────────────────────────────────────────────
    let branchInfo = {
      name:  order.branchName || "Pizza Hut",
      code:  order.branchCode || "DELIGHT",
      phone: "(587) 365-5401",
      gst:   "123456789",
    };

    if (order.branchId) {
      try {
        const b = typeof order.branchId === "object" && order.branchId.name
          ? order.branchId
          : await Branch.findById(order.branchId).lean();
        if (b) {
          if (b.name) branchInfo.name = b.name;
          if (b.code) branchInfo.code = b.code;
          if (b.phone) branchInfo.phone = b.phone;
          if (b.settings?.mainSettings?.gstNumber) branchInfo.gst = b.settings.mainSettings.gstNumber;
        }
      } catch (err) {
        logger.warn(`Could not fetch branch info for receipt PDF: ${err.message}`);
      }
    }

    // ── Page setup ───────────────────────────────────────────────────────────
    const is58mm        = paperSize === "58mm";
    const pageWidth     = is58mm ? 164 : 226;
    const margin        = is58mm ? 5   : 8;
    const printableWidth = pageWidth - 2 * margin;
    const startX        = margin;

    // ── Items to render ──────────────────────────────────────────────────────
    const itemsToRender = (order.items && Array.isArray(order.items))
      ? (itemsFilter === "wings_only"
          ? order.items.filter(i => i.kitchenLabel === "wings_station" || i.kitchenLabel === "chicken")
          : order.items)
      : [];

    // ── Customer info — only show if real data ───────────────────────────────
    const rawName  = order.customerName  || order.customer?.name  || "";
    const rawPhone = order.customerPhone || order.customer?.phone || "";
    const custName  = (rawName.trim().toLowerCase() === "no name" || rawName.trim() === "") ? "" : rawName.trim();
    const custPhone = rawPhone.trim();
    const showCustomer = custName !== "" || custPhone !== "";

    // ── Totals computation ───────────────────────────────────────────────────
    let subtotal, discount, tax, taxRate, deliveryFee, total;
    if (itemsFilter === "wings_only" && itemsToRender.length > 0) {
      const ws = itemsToRender.reduce(
        (s, i) => s + (i.totalPrice !== undefined ? i.totalPrice : ((i.basePrice || 0) * (i.quantity || 1))),
        0
      );
      taxRate = order.taxRate || 0.05;
      tax = ws * taxRate;
      subtotal = ws; discount = 0; deliveryFee = 0; total = ws + tax;
    } else {
      subtotal    = order.subtotal    || 0;
      discount    = order.discount    || 0;
      tax         = order.tax         || 0;
      taxRate     = order.taxRate     || 0.05;
      deliveryFee = order.deliveryFee || 0;
      total       = order.total       || 0;
    }
    const tip = order.tip || 0;

    // ── Payment detection ────────────────────────────────────────────────────
    let isAccountPay  = ["doordash", "skip", "ubereats"].includes(order.orderSource);
    let isCardPayment = false;
    let cardInfo = { acct: "CARD", cardNum: "N/A", transNum: order.paymentIntentId || "N/A" };
    let cashInfo = { cashGiven: total, changeGiven: 0 };

    if (!isAccountPay && (order.orderSource === "online" || order.paymentMethod === "stripe")) {
      isCardPayment = true;
      cardInfo.acct = "STRIPE CARD";
    }
    if (order.payments && Array.isArray(order.payments) && order.payments.length > 0) {
      const p = order.payments[0];
      if (!isAccountPay && ["card","interac","debit","credit"].includes(p.method?.toLowerCase())) {
        isCardPayment     = true;
        cardInfo.acct     = p.cardBrand ? p.cardBrand.toUpperCase() : (order.orderSource === "online" ? "STRIPE CARD" : "INTERAC");
        cardInfo.cardNum  = p.cardLast4 ? `************${p.cardLast4}` : "N/A";
        cardInfo.transNum = p.transactionId || order.paymentIntentId || "N/A";
      } else if (p.method?.toLowerCase() === "cash") {
        cashInfo.cashGiven   = p.cashGiven   || total;
        cashInfo.changeGiven = p.changeGiven || 0;
      }
    } else if (!isAccountPay && order.paymentType &&
               ["card","interac","debit","credit"].includes(order.paymentType.toLowerCase())) {
      isCardPayment = true;
    }

    // ── Dynamic page height estimation (tight fit for thermal paper roll cut) ─
    const lineH = is58mm ? 8.5 : 9.5;
    let h = margin;
    h += lineH * 3 + 2;   // promo header (3 lines)
    h += lineH * 4 + 4;   // store asterisk block (4 lines)
    h += lineH * 4 + 4;   // order info (4 lines)
    h += 4;               // divider

    let sourceLabel = {
      online:   "ONLINE ORDER",
      doordash: "DOORDASH ORDER",
      skip:     "SKIP ORDER",
      ubereats: "UBER EATS ORDER",
    }[order.orderSource];
    h += lineH * (sourceLabel ? 2 : 1) + 4;   // order type
    if (showCustomer) h += lineH + 3;
    h += 4;               // divider

    itemsToRender.forEach(item => {
      h += lineH + 3;     // item line
      if (item.selectedModifiers?.length) h += item.selectedModifiers.length * (lineH + 1);
      if (item.note) h += lineH + 1;
      h += 3;
    });
    h += 4;               // divider

    // totals breakdown
    let totalLines = 3; // subtotal, tax, gst
    if (discount > 0) totalLines++;
    if (deliveryFee > 0) totalLines++;
    h += totalLines * lineH + 4;
    h += lineH * 3 + 8;   // Tot.w/coupon, Tip, TOTAL
    h += 4;               // divider

    // payment
    let payLines = isAccountPay ? 2 : (isCardPayment ? 3 : 3);
    h += payLines * lineH + 4;
    h += 4;               // divider

    // footer slogans & disclaimer
    h += lineH * 2 + 18;  // 2 slogans + 2-line disclaimer
    h += 12;              // tight tear/cut padding

    const pageHeight = Math.max(150, Math.ceil(h));

    // ── Create PDF doc ───────────────────────────────────────────────────────
    const doc = new PDFDocument({ size: [pageWidth, pageHeight], margin: 0 });
    doc.pipe(outputStream);

    // ── Helper: compact date ─────────────────────────────────────────────────
    const fmtDate = (dateStr) => {
      if (!dateStr) return "";
      try {
        const d  = new Date(dateStr);
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const da = String(d.getDate()).padStart(2, "0");
        const yr = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${mo}/${da}/${yr} ${hh}:${mi}`;
      } catch { return ""; }
    };

    // ── Drawing helpers ──────────────────────────────────────────────────────
    const drawDash = () => {
      doc.moveTo(startX, doc.y).lineTo(startX + printableWidth, doc.y)
         .dash(2, { space: 2 }).stroke("#000000").undash();
      doc.moveDown(0.25);
    };

    const ctext = (text, fontSize, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica")
         .fontSize(fontSize).fillColor("#000000")
         .text(text, startX, doc.y, { align: "center", width: printableWidth });
    };

    const ltext = (text, fontSize, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica")
         .fontSize(fontSize).fillColor("#000000")
         .text(text, startX, doc.y, { width: printableWidth });
    };

    const rowLR = (left, right, fontSize, leftBold = false, rightBold = true) => {
      const fs = fontSize || (is58mm ? 7.5 : 8);
      const ry = doc.y;
      doc.font(leftBold ? "Helvetica-Bold" : "Helvetica").fontSize(fs).fillColor("#000000")
         .text(left, startX, ry, { width: printableWidth * 0.6 });
      const afterLeft = doc.y;
      doc.font(rightBold ? "Helvetica-Bold" : "Helvetica").fontSize(fs).fillColor("#000000")
         .text(right, startX + printableWidth * 0.6, ry, { width: printableWidth * 0.4, align: "right" });
      if (doc.y < afterLeft) doc.y = afterLeft;
      doc.moveDown(0.15);
    };

    // ════════════════════════════════════════════════════════════════════════
    // START DRAWING — tight top margin
    // ════════════════════════════════════════════════════════════════════════
    doc.y = margin;

    // ── 1. PROMO HEADER ──────────────────────────────────────────────────────
    const promoFs = is58mm ? 6.5 : 7;
    ctext("Tell us About Your Visit To", promoFs);
    ctext("Receive a Great Offer!", promoFs);
    ctext("See Details Below", promoFs);
    doc.moveDown(0.25);

    // ── 2. ASTERISK STORE BLOCK ──────────────────────────────────────────────
    const starFs = is58mm ? 6.5 : 7;
    const nameFs = is58mm ? 8   : 9;
    const phFs   = is58mm ? 7   : 7.5;

    // Calculate how many * actually fill the printable width in Helvetica
    doc.font("Helvetica").fontSize(starFs);
    const oneStarW = doc.widthOfString("*");
    const starCount = Math.floor(printableWidth / oneStarW);
    const stars = "*".repeat(starCount);

    ctext(stars, starFs);

    // Store name line: ** flush left, name centered, ** flush right
    {
      const ry = doc.y;
      const sw = doc.font("Helvetica").fontSize(nameFs).widthOfString("**");
      doc.font("Helvetica").fontSize(nameFs).fillColor("#000000")
         .text("**", startX, ry, { width: sw + 4 });
      const afterStar = doc.y;
      doc.font("Helvetica").fontSize(nameFs)
         .text(branchInfo.name, startX + sw + 4, ry, { width: printableWidth - (sw + 4) * 2, align: "center" });
      const afterName = doc.y;
      doc.font("Helvetica").fontSize(nameFs)
         .text("**", startX + printableWidth - sw, ry, { width: sw });
      doc.y = Math.max(afterStar, afterName, doc.y);
    }

    // Phone line: ** flush left, phone centered, ** flush right
    {
      const ry = doc.y;
      const sw = doc.font("Helvetica").fontSize(phFs).widthOfString("**");
      doc.font("Helvetica").fontSize(phFs).fillColor("#000000")
         .text("**", startX, ry, { width: sw + 4 });
      const afterStar = doc.y;
      doc.font("Helvetica").fontSize(phFs)
         .text(branchInfo.phone, startX + sw + 4, ry, { width: printableWidth - (sw + 4) * 2, align: "center" });
      const afterPhone = doc.y;
      doc.font("Helvetica").fontSize(phFs)
         .text("**", startX + printableWidth - sw, ry, { width: sw });
      doc.y = Math.max(afterStar, afterPhone, doc.y);
    }

    ctext(stars, starFs);
    doc.moveDown(0.35);


    // ── 3. ORDER INFO ────────────────────────────────────────────────────────
    const infoFs = is58mm ? 7 : 7.5;
    const orderNumStr = order.orderNumber
      ? order.orderNumber.replace(/^[#A-Za-z\-]+/, "")
      : "000";
    const extId   = String(order._id || order.id || "").slice(-9).toUpperCase();
    const takenBy = order.orderSource === "online"   ? "WEB SITE"
      : order.orderSource === "doordash"             ? "DOORDASH"
      : order.orderSource === "skip"                 ? "SKIP"
      : order.orderSource === "ubereats"             ? "UBER EATS"
      : (order.staffName || "POS STAFF");

    doc.font("Helvetica-Bold").fontSize(infoFs).fillColor("#000000")
       .text(`Order:   ${orderNumStr}`, startX, doc.y, { width: printableWidth });
    doc.font("Helvetica").fontSize(infoFs)
       .text(`Store: ${branchInfo.code}  ${fmtDate(order.createdAt)}`, startX, doc.y, { width: printableWidth });
    doc.font("Helvetica").fontSize(infoFs)
       .text(`Order taken by...: ${takenBy}`, startX, doc.y, { width: printableWidth });
    doc.font("Helvetica").fontSize(infoFs)
       .text(`ETA: --          Ext. Id: ${extId}`, startX, doc.y, { width: printableWidth });
    doc.moveDown(0.3);
    drawDash();

    const typeStr = (order.orderType || "takeout").replace(/-/g, " ").toUpperCase();
    const typeFs  = is58mm ? 9.5 : 10.5;
    ctext(`**   ${typeStr}   **`, typeFs, false);

    sourceLabel = {
      online:   "ONLINE ORDER",
      doordash: "DOORDASH ORDER",
      skip:     "SKIP ORDER",
      ubereats: "UBER EATS ORDER",
    }[order.orderSource];
    if (sourceLabel) {
      const srcFs = is58mm ? 8 : 9;
      doc.moveDown(0.2);
      ctext(`**   ${sourceLabel}   **`, srcFs, false);
    }
    doc.moveDown(0.3);

    // ── 5. CUSTOMER — only if real name/phone ────────────────────────────────
    if (showCustomer) {
      const custFs = is58mm ? 7.5 : 8;
      if (custName && custPhone) {
        const ry = doc.y;
        doc.font("Helvetica").fontSize(custFs).fillColor("#000000")
           .text(custName, startX, ry, { width: printableWidth * 0.55 });
        const afterLeft = doc.y;
        doc.font("Helvetica").fontSize(custFs)
           .text(custPhone, startX + printableWidth * 0.55, ry, { width: printableWidth * 0.45, align: "right" });
        if (doc.y < afterLeft) doc.y = afterLeft;
      } else {
        ltext(custName || custPhone, custFs);
      }
      doc.moveDown(0.2);
    }

    drawDash();

    // ── 6. ITEMS ─────────────────────────────────────────────────────────────
    const itemFs = is58mm ? 8   : 9;
    const modFs  = is58mm ? 7.5 : 8;
    const noteFs = is58mm ? 6.5 : 7;

    itemsToRender.forEach((item) => {
      const itemTotal = (item.totalPrice !== undefined
        ? item.totalPrice
        : ((item.basePrice || 0) * (item.quantity || 1))) || 0;
      const mods     = Array.isArray(item.selectedModifiers) ? item.selectedModifiers : [];
      const qty      = item.quantity || 1;
      const name     = item.name || "Item";
      const priceStr = `$${itemTotal.toFixed(2)}`;

      if (mods.length === 0) {
        // No modifiers — qty + name left, price right, same line
        const ry = doc.y;
        doc.font("Helvetica").fontSize(itemFs).fillColor("#000000")
           .text(`${qty}  ${name}`, startX, ry, { width: printableWidth - 45 });
        const afterName = doc.y;
        doc.font("Helvetica").fontSize(itemFs)
           .text(priceStr, startX, ry, { width: printableWidth, align: "right" });
        if (doc.y < afterName) doc.y = afterName;
      } else {
        // Item name line (no price)
        doc.font("Helvetica").fontSize(itemFs).fillColor("#000000")
           .text(`${qty}  ${name}`, startX, doc.y, { width: printableWidth });

        // Modifier lines indented — price on LAST modifier line only
        mods.forEach((mod, idx) => {
          const isLast   = idx === mods.length - 1;
          const modLabel = `   ${mod.optionName || mod.name || ""}`;
          if (isLast) {
            const ry = doc.y;
            doc.font("Helvetica").fontSize(modFs).fillColor("#000000")
               .text(modLabel, startX, ry, { width: printableWidth - 45 });
            const afterMod = doc.y;
            doc.font("Helvetica").fontSize(modFs)
               .text(priceStr, startX, ry, { width: printableWidth, align: "right" });
            if (doc.y < afterMod) doc.y = afterMod;
          } else {
            doc.font("Helvetica").fontSize(modFs).fillColor("#000000")
               .text(modLabel, startX, doc.y, { width: printableWidth });
          }
        });
      }

      if (item.note) {
        doc.font("Helvetica-Oblique").fontSize(noteFs).fillColor("#555555")
           .text(`   Note: ${item.note}`, startX, doc.y, { width: printableWidth });
        doc.fillColor("#000000");
      }

      doc.moveDown(0.4);
    });

    drawDash();

    // ── 7. TOTALS ────────────────────────────────────────────────────────────
    const totFs = is58mm ? 7.5 : 8;

    // Right-aligned: Sub Total, Tax, GST
    doc.font("Helvetica").fontSize(totFs).fillColor("#000000")
       .text(`Sub Total:  $${subtotal.toFixed(2)}`, startX, doc.y, { width: printableWidth, align: "right" });

    if (discount > 0) {
      doc.font("Helvetica").fontSize(totFs)
         .text(`Discount:  -$${discount.toFixed(2)}`, startX, doc.y, { width: printableWidth, align: "right" });
    }

    doc.font("Helvetica").fontSize(totFs)
       .text(`Tax...:  $${(0).toFixed(2)}`, startX, doc.y, { width: printableWidth, align: "right" });

    // GST row: ID on left, amount on right
    {
      const ry = doc.y;
      doc.font("Helvetica").fontSize(totFs).fillColor("#000000")
         .text(`GST ID[#:R1 ${branchInfo.gst}`, startX, ry, { width: printableWidth * 0.55 });
      const afterLeft = doc.y;
      doc.font("Helvetica").fontSize(totFs)
         .text(`GST...:  $${tax.toFixed(2)}`, startX + printableWidth * 0.55, ry, { width: printableWidth * 0.45, align: "right" });
      if (doc.y < afterLeft) doc.y = afterLeft;
    }

    if (deliveryFee > 0) {
      doc.font("Helvetica").fontSize(totFs)
         .text(`Delivery Fee:  $${deliveryFee.toFixed(2)}`, startX, doc.y, { width: printableWidth, align: "right" });
    }

    doc.moveDown(0.5);

    // Left-aligned: Tot.w/coupon, Tip, TOTAL — regular weight like reference
    const bigFs = is58mm ? 8 : 9;
    doc.font("Helvetica").fontSize(bigFs).fillColor("#000000")
       .text(`Tot.w/coupon:  $${total.toFixed(2)}`, startX, doc.y, { width: printableWidth });
    doc.moveDown(0.3);

    if (tip > 0) {
      doc.font("Helvetica").fontSize(bigFs)
         .text(`   Tip....:  $${tip.toFixed(2)}`, startX, doc.y, { width: printableWidth });
    } else {
      doc.font("Helvetica").fontSize(bigFs)
         .text(`   Tip....:  _________`, startX, doc.y, { width: printableWidth });
    }
    doc.moveDown(0.3);

    const totalFs = is58mm ? 8.5 : 9.5;
    doc.font("Helvetica").fontSize(totalFs)
       .text(`   TOTAL...:  $${(total + tip).toFixed(2)}`, startX, doc.y, { width: printableWidth });
    doc.moveDown(0.5);

    drawDash();

    // ── 8. PAYMENT ───────────────────────────────────────────────────────────
    const payFs = is58mm ? 7.5 : 8;
    if (isAccountPay) {
      rowLR("TYPE:", "ACCOUNT PAY", payFs);
      rowLR("PLATFORM:", (order.orderSource || "").toUpperCase(), payFs);
    } else if (isCardPayment) {
      rowLR("TYPE:", cardInfo.acct, payFs);
      if (cardInfo.cardNum  !== "N/A") rowLR("CARD:",   cardInfo.cardNum,  payFs);
      if (cardInfo.transNum !== "N/A") rowLR("TRANS #:", cardInfo.transNum, payFs);
    } else {
      rowLR("TYPE:",       "CASH",                              payFs);
      rowLR("CASH GIVEN:", `$${cashInfo.cashGiven.toFixed(2)}`, payFs);
      rowLR("CHANGE:",     `$${cashInfo.changeGiven.toFixed(2)}`, payFs);
    }

    doc.moveDown(0.3);
    drawDash();

    // ── 9. FOOTER ────────────────────────────────────────────────────────────
    doc.font("Helvetica-BoldOblique").fontSize(is58mm ? 7.5 : 8).fillColor("#000000")
       .text('"Don\'t Cook Tonight, Call Pizza Hut!"', startX, doc.y, { align: "center", width: printableWidth });
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(is58mm ? 7 : 7.5).fillColor("#000000")
       .text("Have a nice day, Visit us again!", startX, doc.y, { align: "center", width: printableWidth });
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(6).fillColor("#888888")
       .text(
         "We are implementing new POS systems. If you see any discrepancy in the invoice, please email the invoice to accounting@pizzahut.com",
         startX, doc.y, { align: "center", width: printableWidth }
       );

    doc.end();

  } catch (error) {
    logger.error(`Error generating receipt PDF stream: ${error.message}`);
    if (outputStream && typeof outputStream.headersSent !== "undefined" && !outputStream.headersSent) {
      outputStream.status(500).json({ success: false, message: "Failed to generate receipt PDF" });
    }
  }
};

exports.generateReceiptPdf = async (order, res, itemsFilter = "all", paperSize = "58mm") => {
  return exports.generateReceiptPdfStream(order, res, itemsFilter, paperSize);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY SALES SUMMARY RECEIPT
// ═══════════════════════════════════════════════════════════════════════════════
exports.generateSalesSummaryReceiptPdf = async (
  summary,
  dateStr,
  res,
  branchId = null,
) => {
  try {
    let branchInfo = {
      name:    summary.branchName || "Pizza Hut",
      code:    summary.branchCode || "DELIGHT",
      address: "231 Edgefield Pl , Strathmore,",
      city:    "Alberta, T1P 0E8, Canada",
      phone:   "(587) 365-5401",
      gst:     "123456789",
    };

    const targetBranchId = branchId || summary.branchId;
    if (targetBranchId) {
      try {
        const b = typeof targetBranchId === "object" && targetBranchId.name
          ? targetBranchId
          : await Branch.findById(targetBranchId).lean();
        if (b) {
          if (b.name)    branchInfo.name    = b.name;
          if (b.code)    branchInfo.code    = b.code;
          if (b.address) branchInfo.address = b.address;
          if (b.city)    branchInfo.city    = b.city;
          if (b.phone)   branchInfo.phone   = b.phone;
        }
      } catch (err) {
        logger.warn(`Could not fetch branch info for sales summary receipt: ${err.message}`);
      }
    }

    const doc = new PDFDocument({ size: [226, 1200], margin: 10 });
    doc.pipe(res);

    const printableWidth = 206;
    const startX = 10;

    const formatDate = (dateVal) => {
      if (!dateVal) return "";
      try {
        const d = new Date(dateVal);
        const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()}`;
      } catch { return dateVal; }
    };

    // Header
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000000")
       .text(branchInfo.name, startX, doc.y, { align: "center", width: printableWidth });
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
       .text(branchInfo.code, startX, doc.y, { align: "center", width: printableWidth });
    doc.moveDown(0.5);

    // Store info box
    const boxStartY = doc.y;
    doc.font("Helvetica").fontSize(7.5).fillColor("#000000");
    doc.text(branchInfo.address, startX + 5, boxStartY + 4, { align: "center", width: printableWidth - 10 });
    doc.text(branchInfo.city,   { align: "center", width: printableWidth - 10 });
    doc.text(`Tel # : ${branchInfo.phone}`, { align: "center", width: printableWidth - 10 });
    doc.text(`GST# : ${branchInfo.gst}`,   { align: "center", width: printableWidth - 10 });
    const boxEndY = doc.y + 4;
    doc.rect(startX + 2, boxStartY, printableWidth - 4, boxEndY - boxStartY)
       .dash(2, { space: 2 }).stroke("#000000").undash();
    doc.y = boxEndY + 8;

    doc.font("Helvetica-Bold").fontSize(12)
       .text("DAILY SALES SUMMARY", startX, doc.y, { align: "center", width: printableWidth });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(8)
       .text(`Date Filter: ${formatDate(dateStr)}`, startX, doc.y, { align: "center", width: printableWidth });
    doc.moveDown(0.5);

    const drawDivider = () => {
      doc.moveTo(startX, doc.y).lineTo(startX + printableWidth, doc.y)
         .dash(2, { space: 2 }).stroke("#000000").undash();
      doc.moveDown(0.3);
    };

    const fmt = (num) => `$${(num || 0).toFixed(2)}`;

    const drawRow = (left, right, isBold = false, indent = 0) => {
      const rowY = doc.y;
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      doc.text(left,  startX + indent,              rowY, { width: printableWidth - 60 - indent });
      doc.text(right, startX + printableWidth - 60, rowY, { width: 60, align: "right" });
      doc.moveDown(0.2);
    };

    // Section 1: Category
    drawDivider();
    doc.font("Helvetica-Bold").fontSize(8.5).text("SALES BY CATEGORY", startX, doc.y);
    doc.moveDown(0.2);
    drawDivider();
    if (summary.categorySales && Array.isArray(summary.categorySales)) {
      summary.categorySales.forEach((cat) => drawRow(cat.name || "Uncategorized", fmt(cat.total)));
      doc.moveDown(0.2);
      drawRow("ALL CATEGORY TOTAL", fmt(summary.financials?.allCategoryTotal || 0), true);
    }
    doc.moveDown(0.4);

    // Section 2: Accounting
    drawDivider();
    doc.font("Helvetica-Bold").fontSize(8.5).text("SALES ACCOUNTING", startX, doc.y);
    doc.moveDown(0.2);
    drawDivider();
    const accounting = summary.financials || {};
    drawRow("Sub Total :",          fmt(accounting.subTotal));
    drawRow("Delivery Charges :",   fmt(accounting.deliveryCharges));
    drawRow("Debit Card Charges :", fmt(accounting.debitCardCharges));
    drawRow("Discount :",           `(${fmt(accounting.discount)})`);
    drawRow("Tax (GST) :",          fmt(accounting.tax));
    doc.moveDown(0.2);
    drawRow("GRAND TOTAL :",  fmt(accounting.grandTotal),  true);
    drawRow("Tips :",         fmt(accounting.tips));
    doc.moveDown(0.2);
    drawRow("FINAL AMOUNT :", fmt(accounting.finalAmount), true);
    doc.moveDown(0.4);

    // Section 3: Sales Received
    drawDivider();
    doc.font("Helvetica-Bold").fontSize(8.5).text("SALES RECEIVED", startX, doc.y);
    doc.moveDown(0.2);
    drawDivider();
    const payments = summary.salesReceived || {};
    drawRow("Cash :",               fmt(payments.cash));
    drawRow("Account Pay :",        fmt(payments.accountPay));
    drawRow("Credit Card - Sales :", fmt(payments.creditCardSales));
    drawRow("Debit Card - Sales :",  fmt(payments.debitCardSales));
    if (payments.unpaidSales && payments.unpaidSales > 0) {
      drawRow("Unpaid / Pay Later :", fmt(payments.unpaidSales));
    }
    doc.moveDown(0.2);
    drawRow("GRAND TOTAL :",       fmt(payments.grandTotal), true);
    drawRow("Credit Card - Tips :", fmt(payments.tips));
    drawRow("Debit Card - Tips :",  fmt(payments.tips));
    doc.moveDown(0.2);
    drawRow("FINAL AMOUNT :", fmt(payments.finalAmount), true);
    doc.moveDown(0.4);

    // Section 4: Order Type
    drawDivider();
    doc.font("Helvetica-Bold").fontSize(8.5).text("ORDER TYPE", startX, doc.y);
    doc.moveDown(0.2);
    drawDivider();
    const orderType = summary.orderTypeSummary || {};
    drawRow("Take-Out :",     fmt(orderType.takeout));
    drawRow("Dine-In :",      fmt(orderType.dineIn));
    drawRow("Drive Through :", fmt(orderType.driveThrough));
    if (orderType.delivery !== undefined && orderType.delivery > 0) {
      drawRow("Delivery :", fmt(orderType.delivery));
    }
    doc.moveDown(0.2);
    drawRow("TOTAL :", fmt(orderType.total), true);
    doc.moveDown(0.4);

    // Section 5: Expenses
    if (summary.expense && Array.isArray(summary.expense) && summary.expense.length > 0) {
      drawDivider();
      doc.font("Helvetica-Bold").fontSize(8.5).text("EXPENSES", startX, doc.y);
      doc.moveDown(0.2);
      drawDivider();
      summary.expense.forEach((exp) => {
        const emp  = exp.employee   || "Manager";
        const mode = exp.paymentMode || "cash";
        drawRow(`${emp} (${mode})`, fmt(exp.total));
        if (exp.pst || exp.gst || exp.hst) {
          doc.font("Helvetica").fontSize(7).fillColor("#444444");
          doc.text(`   PST: ${fmt(exp.pst)} | GST: ${fmt(exp.gst)} | HST: ${fmt(exp.hst)}`, startX, doc.y);
          doc.fillColor("#000000");
          doc.moveDown(0.15);
        }
      });
      doc.moveDown(0.2);
      const expenseTotal = summary.expense.reduce((sum, e) => sum + (e.total || 0), 0);
      drawRow("TOTAL EXPENSES :", fmt(expenseTotal), true);
      doc.moveDown(0.4);
    }

    // Footer
    drawDivider();
    doc.font("Helvetica-BoldOblique").fontSize(8)
       .text('"Don\'t Cook Tonight, Call Pizza Hut!"', startX, doc.y, { align: "center", width: printableWidth });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(7.5)
       .text("Have a nice day, Visit us again!", startX, doc.y, { align: "center", width: printableWidth });

    doc.end();
  } catch (error) {
    logger.error(`Error generating sales summary PDF receipt: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate sales summary PDF" });
    }
  }
};



//old printer code
// exports.generateReceiptPdfStream = async (order, outputStream, itemsFilter = "all", paperSize = "58mm") => {
//   try {
//     let branchInfo = {
//       name: order.branchName || "Pizza Hut",
//       code: order.branchCode || "DELIGHT",
//       address: "231 Edgefield Pl , Strathmore,",
//       city: "Alberta, T1P 0E8, Canada",
//       phone: "(587) 365-5401",
//       gst: "123456789",
//     };

//     if (order.branchId) {
//       try {
//         const b =
//           typeof order.branchId === "object" && order.branchId.name
//             ? order.branchId
//             : await Branch.findById(order.branchId).lean();
//         if (b) {
//           if (b.name) branchInfo.name = b.name;
//           if (b.code) branchInfo.code = b.code;
//           if (b.address) branchInfo.address = b.address;
//           if (b.city) branchInfo.city = b.city;
//           if (b.phone) branchInfo.phone = b.phone;
//           if (b.settings?.mainSettings?.gstNumber) {
//             branchInfo.gst = b.settings.mainSettings.gstNumber;
//           }
//         }
//       } catch (err) {
//         logger.warn(
//           `Could not fetch branch info for receipt PDF: ${err.message}`,
//         );
//       }
//     }

//     const is58mm = paperSize === "58mm";
//     const pageWidth = is58mm ? 164 : 226;
//     const margin = is58mm ? 6 : 10;
//     const printableWidth = pageWidth - 2 * margin;
//     const startX = margin;

//     const itemsToRender = (order.items && Array.isArray(order.items))
//       ? (itemsFilter === "wings_only"
//           ? order.items.filter(item => item.kitchenLabel === "wings_station" || item.kitchenLabel === "chicken")
//           : order.items)
//       : [];

//     // Calculate dynamic page height to avoid blank paper waste on thermal printer rolls
//     let estimatedContentHeight = 35 + 55 + 65 + 30; // Headers & store info box
//     itemsToRender.forEach((item) => {
//       const nameLength = (item.name || "").length;
//       const wrappedLines = Math.ceil(nameLength / (is58mm ? 16 : 22)) || 1;
//       estimatedContentHeight += wrappedLines * (is58mm ? 14 : 16);
//       if (item.selectedModifiers && Array.isArray(item.selectedModifiers)) {
//         estimatedContentHeight += item.selectedModifiers.length * (is58mm ? 10 : 12);
//       }
//       if (item.note) estimatedContentHeight += (is58mm ? 12 : 14);
//       estimatedContentHeight += 6;
//     });
//     estimatedContentHeight += 90; // Totals breakdown
//     estimatedContentHeight += 70; // Transaction record
//     estimatedContentHeight += 65; // Footer slogans & disclaimer
//     estimatedContentHeight += 35; // Bottom padding for paper tear/cut

//     const pageHeight = Math.max(250, Math.ceil(estimatedContentHeight));

//     const doc = new PDFDocument({
//       size: [pageWidth, pageHeight],
//       margin: margin,
//     });

//     // Pipe PDF
//     doc.pipe(outputStream);

//     // Helper functions for formatting
//     const formatDate = (dateStr) => {
//       if (!dateStr) return "Mon, Jun 29, 2026 06:52 PM";
//       try {
//         const d = new Date(dateStr);
//         const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
//         const months = [
//           "Jan",
//           "Feb",
//           "Mar",
//           "Apr",
//           "May",
//           "Jun",
//           "Jul",
//           "Aug",
//           "Sep",
//           "Oct",
//           "Nov",
//           "Dec",
//         ];

//         const dayName = days[d.getDay()];
//         const monthName = months[d.getMonth()];
//         const dayNum = String(d.getDate()).padStart(2, "0");
//         const year = d.getFullYear();

//         let hours = d.getHours();
//         const ampm = hours >= 12 ? "PM" : "AM";
//         hours = hours % 12;
//         hours = hours ? hours : 12;
//         const strHours = String(hours).padStart(2, "0");
//         const minutes = String(d.getMinutes()).padStart(2, "0");

//         return `${dayName}, ${monthName} ${dayNum}, ${year} ${strHours}:${minutes} ${ampm}`;
//       } catch {
//         return String(dateStr);
//       }
//     };

//     // 1. Header & Store Info Box
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(13)
//       .text(branchInfo.name, startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(8)
//       .text(branchInfo.code, startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc.moveDown(0.5);

//     // Dashed Store Info Box
//     const boxStartY = doc.y;
//     doc.font("Helvetica").fontSize(7.5);
//     doc.text(branchInfo.address, startX + 5, boxStartY + 4, {
//       align: "center",
//       width: printableWidth - 10,
//     });
//     doc.text(branchInfo.city, {
//       align: "center",
//       width: printableWidth - 10,
//     });
//     doc.text(`Tel # : ${branchInfo.phone}`, {
//       align: "center",
//       width: printableWidth - 10,
//     });
//     doc.text(`GST# : ${branchInfo.gst}`, {
//       align: "center",
//       width: printableWidth - 10,
//     });
//     const boxEndY = doc.y + 4;

//     doc
//       .rect(startX + 2, boxStartY, printableWidth - 4, boxEndY - boxStartY)
//       .dash(2, { space: 2 })
//       .stroke("#666666")
//       .undash();
//     doc.y = boxEndY + 8;

//     // 2. Order Header
//     const orderNumStr = order.orderNumber
//       ? order.orderNumber.replace(/^[#A-Za-z\-]+/, "")
//       : "104";
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(14)
//       .text(`ORDER # : ${orderNumStr}`, startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc.moveDown(0.2);
//     doc
//       .font("Helvetica")
//       .fontSize(8)
//       .text(formatDate(order.createdAt), startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(8)
//       .text(
//         `ORDER SUMMARY (${order.paymentStatus === "paid" ? "PAID" : "UNPAID"})`,
//         startX,
//         doc.y,
//         { align: "center", width: printableWidth },
//       );
//     let typeStr = order.orderType
//       ? order.orderType.replace("-", " ").toUpperCase()
//       : "TAKEOUT";
//     const platformPrefixMap = {
//       doordash: "DOORDASH",
//       skip: "SKIP",
//       ubereats: "UBER EATS",
//       online: "ONLINE",
//     };
//     if (platformPrefixMap[order.orderSource]) {
//       typeStr = `${platformPrefixMap[order.orderSource]} ${typeStr}`;
//     }
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(9)
//       .text(typeStr, startX, doc.y, { align: "center", width: printableWidth });
//     doc.moveDown(0.4);

//     // Dynamic Layout Geometry (Supports both 58mm and 80mm without clipping)
//     const colItemWidth = Math.floor(printableWidth * 0.55);
//     const colQtyWidth = Math.floor(printableWidth * 0.15);
//     const colAmtWidth = printableWidth - colItemWidth - colQtyWidth;
//     const colQtyX = startX + colItemWidth;
//     const colAmtX = colQtyX + colQtyWidth;

//     const labelWidth = Math.floor(printableWidth * 0.45);
//     const valueWidth = printableWidth - labelWidth;
//     const valueX = startX + labelWidth;

//     // 3. Items Table Header
//     doc
//       .moveTo(startX, doc.y)
//       .lineTo(startX + printableWidth, doc.y)
//       .dash(2, { space: 2 })
//       .stroke("#333333")
//       .undash();
//     doc.moveDown(0.3);
//     const headerY = doc.y;
//     doc.font("Helvetica-Bold").fontSize(is58mm ? 7.5 : 8);
//     doc.text("ITEMS", startX, headerY, { width: colItemWidth });
//     doc.text("QTY", colQtyX, headerY, { width: colQtyWidth, align: "center" });
//     doc.text("AMT", colAmtX, headerY, { width: colAmtWidth, align: "right" });
//     doc.moveDown(0.4);
//     doc
//       .moveTo(startX, doc.y)
//       .lineTo(startX + printableWidth, doc.y)
//       .dash(2, { space: 2 })
//       .stroke("#333333")
//       .undash();
//     doc.moveDown(0.4);

//     // 4. Items Loop (filtered by station if needed)
//     if (itemsToRender.length > 0) {
//       itemsToRender.forEach((item) => {
//         const itemY = doc.y;
//         const itemTotal =
//           (item.totalPrice !== undefined
//             ? item.totalPrice
//             : item.basePrice * item.quantity) || 0;

//         doc.font("Helvetica-Bold").fontSize(is58mm ? 7.5 : 8.5);
//         doc.text(item.name || "Item", startX, itemY, { width: colItemWidth });
//         const afterNameY = doc.y;

//         doc.font("Helvetica").fontSize(is58mm ? 7.5 : 8.5);
//         doc.text(String(item.quantity || 1), colQtyX, itemY, {
//           width: colQtyWidth,
//           align: "center",
//         });
//         doc.text(`$${itemTotal.toFixed(2)}`, colAmtX, itemY, {
//           width: colAmtWidth,
//           align: "right",
//         });

//         doc.y = Math.max(doc.y, afterNameY);
//         doc.moveDown(0.2);

//         // Modifiers / Sub-items
//         if (
//           item.selectedModifiers &&
//           Array.isArray(item.selectedModifiers) &&
//           item.selectedModifiers.length > 0
//         ) {
//           doc.font("Helvetica").fontSize(is58mm ? 6.5 : 7.5).fillColor("#444444");
//           item.selectedModifiers.forEach((mod) => {
//             const modPriceStr =
//               mod.price > 0 ? ` (+$${mod.price.toFixed(2)})` : "";
//             doc.text(`   ${mod.optionName}${modPriceStr}`, startX, doc.y, {
//               width: printableWidth - 5,
//             });
//           });
//           doc.fillColor("#000000");
//         }
//         if (item.note) {
//           doc
//             .font("Helvetica-Oblique")
//             .fontSize(is58mm ? 6.5 : 7.5)
//             .text(`   Note : ${item.note}`, startX, doc.y, {
//               width: printableWidth - 5,
//             });
//         }
//         doc.moveDown(0.3);
//       });
//     }

//     // 5. Totals Section
//     doc
//       .moveTo(startX, doc.y)
//       .lineTo(startX + printableWidth, doc.y)
//       .dash(2, { space: 2 })
//       .stroke("#333333")
//       .undash();
//     doc.moveDown(0.4);

//     // Compute totals — for wings_only filter, recalculate from filtered items
//     let subtotal, discount, tax, taxRate, deliveryFee, total;
//     if (itemsFilter === "wings_only" && itemsToRender.length > 0) {
//       const wingsSubtotal = itemsToRender.reduce((sum, item) => {
//         const itemTotal = item.totalPrice !== undefined ? item.totalPrice : (item.basePrice * item.quantity);
//         return sum + (itemTotal || 0);
//       }, 0);
//       taxRate = order.taxRate || 0.05;
//       tax = wingsSubtotal * taxRate;
//       subtotal = wingsSubtotal;
//       discount = 0; // no discount split for partial
//       deliveryFee = 0;
//       total = wingsSubtotal + tax;
//     } else {
//       subtotal = order.subtotal || 0;
//       discount = order.discount || 0;
//       tax = order.tax || 0;
//       taxRate = order.taxRate || 0.05;
//       deliveryFee = order.deliveryFee || 0;
//       total = order.total || 0;
//     }

//     doc.font("Helvetica").fontSize(is58mm ? 8 : 8.5);
//     let rowY = doc.y;
//     doc.text("Subtotal :", startX, rowY, { width: labelWidth });
//     doc
//       .font("Helvetica-Bold")
//       .text(`$${subtotal.toFixed(2)}`, valueX, rowY, {
//         width: valueWidth,
//         align: "right",
//       });
//     doc.moveDown(0.3);

//     if (discount > 0) {
//       rowY = doc.y;
//       doc.font("Helvetica").text("Discount :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(`-$${discount.toFixed(2)}`, valueX, rowY, {
//           width: valueWidth,
//           align: "right",
//         });
//       doc.moveDown(0.3);
//     }

//     rowY = doc.y;
//     doc.font("Helvetica").text(`GST :`, startX, rowY, { width: labelWidth });
//     doc
//       .font("Helvetica-Bold")
//       .text(
//         `$${tax.toFixed(2)} (${(taxRate * 100).toFixed(0)}%)`,
//         valueX,
//         rowY,
//         { width: valueWidth, align: "right" },
//       );
//     doc.moveDown(0.3);

//     if (deliveryFee > 0) {
//       rowY = doc.y;
//       doc
//         .font("Helvetica")
//         .text("Delivery Fee :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(`$${deliveryFee.toFixed(2)}`, valueX, rowY, {
//           width: valueWidth,
//           align: "right",
//         });
//       doc.moveDown(0.4);
//     }

//     const tip = order.tip || 0;
//     if (tip > 0) {
//       rowY = doc.y;
//       doc
//         .font("Helvetica")
//         .text("Tip :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(`$${tip.toFixed(2)}`, valueX, rowY, {
//           width: valueWidth,
//           align: "right",
//         });
//       doc.moveDown(0.4);
//     }

//     rowY = doc.y;
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(is58mm ? 9 : 10)
//       .text("Total :", startX, rowY, { width: labelWidth });
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(is58mm ? 9 : 10)
//       .text(`$${total.toFixed(2)}`, valueX, rowY, {
//         width: valueWidth,
//         align: "right",
//       });
//     doc.moveDown(0.5);

//     // 6. Transaction Record (Conditional for Card vs Cash)
//     doc
//       .moveTo(startX, doc.y)
//       .lineTo(startX + printableWidth, doc.y)
//       .dash(2, { space: 2 })
//       .stroke("#333333")
//       .undash();
//     doc.moveDown(0.4);

//     // Check payment history or payment method
//     let isAccountPay = ["doordash", "skip", "ubereats"].includes(
//       order.orderSource,
//     );
//     let isCardPayment = false;
//     let cardInfo = {
//       acct: "CARD",
//       cardNum: "N/A",
//       type: "CARD",
//       transNum: order.paymentIntentId || "N/A",
//       aid: "N/A",
//     };
//     let cashInfo = { cashGiven: total, changeGiven: 0 };

//     if (
//       !isAccountPay &&
//       (order.orderSource === "online" || order.paymentMethod === "stripe")
//     ) {
//       isCardPayment = true;
//       cardInfo.acct = "STRIPE CARD";
//       cardInfo.aid = "ONLINE_STRIPE";
//     }

//     if (
//       order.payments &&
//       Array.isArray(order.payments) &&
//       order.payments.length > 0
//     ) {
//       const p = order.payments[0];
//       if (
//         !isAccountPay &&
//         ["card", "interac", "debit", "credit"].includes(p.method?.toLowerCase())
//       ) {
//         isCardPayment = true;
//         cardInfo.acct = p.cardBrand
//           ? p.cardBrand.toUpperCase()
//           : order.orderSource === "online"
//             ? "STRIPE CARD"
//             : "INTERAC";
//         cardInfo.cardNum = p.cardLast4 ? `************${p.cardLast4}` : "N/A";
//         cardInfo.type = p.cardFunding ? p.cardFunding.toUpperCase() : "CARD";
//         cardInfo.transNum = p.transactionId
//           ? p.transactionId
//           : order.paymentIntentId || "N/A";
//         cardInfo.aid =
//           order.orderSource === "online"
//             ? "ONLINE_STRIPE"
//             : p.cardBrand
//               ? "CARD_PAYMENT"
//               : "0THB2O87P7ZOBIK";
//       } else if (p.method?.toLowerCase() === "cash") {
//         isCardPayment = false;
//         cashInfo.cashGiven = p.cashGiven || total;
//         cashInfo.changeGiven = p.changeGiven || 0;
//       }
//     } else if (
//       !isAccountPay &&
//       order.paymentType &&
//       ["card", "interac", "debit", "credit"].includes(
//         order.paymentType.toLowerCase(),
//       )
//     ) {
//       isCardPayment = true;
//     }

//     doc
//       .font("Helvetica-Bold")
//       .fontSize(is58mm ? 7.5 : 8.5)
//       .text("TRANSACTION RECORD", startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc.moveDown(0.3);
//     doc.font("Helvetica").fontSize(is58mm ? 7.5 : 8);

//     if (isAccountPay) {
//       rowY = doc.y;
//       doc.text("TYPE :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text("ACCOUNT PAY", valueX, rowY, { width: valueWidth, align: "right" });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("PLATFORM :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(
//           order.orderSource === "online"
//             ? "WEBSITE"
//             : order.orderSource.toUpperCase(),
//           valueX,
//           rowY,
//           { width: valueWidth, align: "right" },
//         );
//       doc.font("Helvetica").moveDown(0.2);
//     } else if (isCardPayment) {
//       rowY = doc.y;
//       doc.text("ACCT :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(cardInfo.acct, valueX, rowY, { width: valueWidth, align: "right" });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("CARD NUMBER :", startX, rowY, { width: labelWidth });
//       doc.font("Helvetica-Bold").text(cardInfo.cardNum, valueX, rowY, {
//         width: valueWidth,
//         align: "right",
//       });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("Type :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(cardInfo.type, valueX, rowY, { width: valueWidth, align: "right" });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("TRANS # :", startX, rowY, { width: labelWidth });
//       doc.font("Helvetica-Bold").text(cardInfo.transNum, valueX, rowY, {
//         width: valueWidth,
//         align: "right",
//       });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("AID :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(cardInfo.aid, valueX, rowY, { width: valueWidth, align: "right" });
//       doc.font("Helvetica").moveDown(0.2);
//     } else {
//       // Cash payment details
//       rowY = doc.y;
//       doc.text("TYPE :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text("CASH", valueX, rowY, { width: valueWidth, align: "right" });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("CASH GIVEN :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(`$${cashInfo.cashGiven.toFixed(2)}`, valueX, rowY, {
//           width: valueWidth,
//           align: "right",
//         });
//       doc.font("Helvetica").moveDown(0.2);
//       rowY = doc.y;
//       doc.text("CHANGE :", startX, rowY, { width: labelWidth });
//       doc
//         .font("Helvetica-Bold")
//         .text(`$${cashInfo.changeGiven.toFixed(2)}`, valueX, rowY, {
//           width: valueWidth,
//           align: "right",
//         });
//       doc.font("Helvetica").moveDown(0.2);
//     }
//     doc.moveDown(0.3);

//     doc
//       .moveTo(startX, doc.y)
//       .lineTo(startX + printableWidth, doc.y)
//       .dash(2, { space: 2 })
//       .stroke("#333333")
//       .undash();
//     doc.moveDown(0.5);

//     // 7. Footer Slogans
//     doc
//       .font("Helvetica-BoldOblique")
//       .fontSize(8)
//       .text('"Don\'t Cook Tonight, Call Pizza Hut!"', startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc.moveDown(0.3);
//     doc
//       .font("Helvetica")
//       .fontSize(7.5)
//       .text("Have a nice day, Visit us again!", startX, doc.y, {
//         align: "center",
//         width: printableWidth,
//       });
//     doc.moveDown(0.3);
//     doc
//       .font("Helvetica")
//       .fontSize(6.5)
//       .fillColor("#555555")
//       .text(
//         "We are implementing new POS systems. If you see any discrepancy in the invoice, please email the invoice to accounting@pizzahut.com",
//         startX,
//         doc.y,
//         { align: "center", width: printableWidth },
//       );

//     // End PDF generation
//     doc.end();
//   } catch (error) {
//     logger.error(`Error generating receipt PDF stream: ${error.message}`);
//     if (outputStream && typeof outputStream.headersSent !== "undefined" && !outputStream.headersSent) {
//       outputStream
//         .status(500)
//         .json({ success: false, message: "Failed to generate receipt PDF" });
//     }
//   }
// };

// exports.generateReceiptPdf = async (order, res, itemsFilter = "all", paperSize = "58mm") => {
//   return exports.generateReceiptPdfStream(order, res, itemsFilter, paperSize);
// };
