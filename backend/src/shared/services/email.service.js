const nodemailer = require("nodemailer");
const { PassThrough } = require("stream");
const logger = require("../utils/logger");
const receiptPdfService = require("../../modules/order/services/receiptPdf.service");
const Branch = require("../../modules/company/models/branch.model");

// Configure Nodemailer transporter with Gmail service
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generate PDF buffer from receiptPdf.service.js
 */
const generatePdfBuffer = (order) => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const stream = new PassThrough();

    stream.on("data", (chunk) => buffers.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
    stream.on("error", (err) => reject(err));

    receiptPdfService
      .generateReceiptPdfStream(order, stream, "all", "80mm")
      .catch(reject);
  });
};

/**
 * Send Order Receipt PDF via Email
 */
exports.sendOrderReceiptEmail = async ({ order, recipientEmail, recipientName }) => {
  try {
    if (!recipientEmail || !recipientEmail.trim()) {
      throw new Error("Recipient email address is required.");
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email credentials (EMAIL_USER / EMAIL_PASS) are missing in environment variables.");
    }

    // Resolve Branch / Restaurant Name
    let restaurantName = order.branchName || "Pizza Hut";
    try {
      if (order.branchId) {
        const branchObj =
          typeof order.branchId === "object" && order.branchId.name
            ? order.branchId
            : await Branch.findById(order.branchId).select("name").lean();
        if (branchObj?.name) {
          restaurantName = branchObj.name;
        }
      }
    } catch (err) {
      logger.warn(`Could not resolve branch name for email receipt: ${err.message}`);
    }

    // Resolve Customer Name
    const rawName = recipientName || order.customer?.name || "";
    const customerName =
      rawName.trim() && rawName.trim().toLowerCase() !== "no name"
        ? rawName.trim()
        : "Valued Customer";

    // Format Date
    let orderDateFormatted = "";
    if (order.createdAt) {
      try {
        const d = new Date(order.createdAt);
        orderDateFormatted = d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (e) {
        orderDateFormatted = String(order.createdAt);
      }
    }

    const orderNumberStr = order.orderNumber || "N/A";
    const orderTotalStr = `$${(order.total || 0).toFixed(2)}`;

    // Generate PDF receipt buffer
    logger.info(`Generating receipt PDF buffer for order ${orderNumberStr}...`);
    const pdfBuffer = await generatePdfBuffer(order);

    //Email Template
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
        <!-- Header Banner -->
        <div style="background-color: #d00000; padding: 28px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">${restaurantName}</h1>
          <div style="display: inline-block; margin-top: 8px; background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
            Order Receipt
          </div>
        </div>
        
        <!-- Body Content -->
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <h2 style="color: #111827; margin: 0 0 12px 0; font-size: 19px; font-weight: 700;">Hello ${customerName},</h2>
          
          <p style="color: #4b5563; line-height: 1.6; font-size: 14px; margin: 0 0 24px 0;">
            Thank you for ordering with <strong style="color: #111827;">${restaurantName}</strong>! Your detailed receipt is attached to this email as a PDF file for your records.
          </p>
          
          <!-- Receipt Details Card -->
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; table-layout: fixed;">
              <tbody>
                <tr>
                  <td style="color: #6b7280; padding: 10px 0; font-weight: 600; white-space: nowrap; width: 42%; border-bottom: 1px solid #e5e7eb;">Order Number</td>
                  <td style="color: #111827; padding: 10px 0; font-weight: 800; text-align: right; width: 58%; border-bottom: 1px solid #e5e7eb; font-size: 15px;">#${orderNumberStr}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 10px 0; font-weight: 600; white-space: nowrap; width: 42%; border-bottom: 1px solid #e5e7eb;">Order Date</td>
                  <td style="color: #111827; padding: 10px 0; font-weight: 700; text-align: right; width: 58%; border-bottom: 1px solid #e5e7eb; font-size: 13.5px;">${orderDateFormatted}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 10px 0; font-weight: 600; white-space: nowrap; width: 42%; border-bottom: 1px solid #e5e7eb;">Order Type</td>
                  <td style="color: #111827; padding: 10px 0; font-weight: 700; text-align: right; width: 58%; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; font-size: 13.5px;">${(order.orderType || "takeout").replace("-", " ")}</td>
                </tr>
                <tr>
                  <td style="color: #111827; padding: 14px 0 4px 0; font-weight: 800; white-space: nowrap; width: 42%; font-size: 15px;">Total Amount</td>
                  <td style="color: #d00000; padding: 14px 0 4px 0; font-weight: 900; text-align: right; width: 58%; font-size: 21px;">${orderTotalStr}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Footer Note -->
          <p style="color: #6b7280; font-size: 13.5px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
            If you have any questions, feel free to contact us at <strong>${restaurantName}</strong>.
          </p>
          
          <div style="border-top: 1px solid #f3f4f6; padding-top: 18px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12.5px; font-weight: 500; margin: 0;">
              Have a wonderful day! Visit us again soon. 🍕
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"${restaurantName}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail.trim(),
      subject: `Order Receipt #${orderNumberStr} - ${restaurantName}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Receipt-#${orderNumberStr}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    logger.info(`Sending email receipt to ${recipientEmail} for order #${orderNumberStr}...`);
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email receipt sent successfully. MessageID: ${info.messageId}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send order receipt email: ${error.message}`);
    throw error;
  }
};
