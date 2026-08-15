const mongoose = require("mongoose");

const accountClosingSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },

    // ── System Calculated (from Orders & Paidouts) ──
    systemCash: { type: Number, default: 0 },
    systemCard: { type: Number, default: 0 },
    systemAccountPay: { type: Number, default: 0 },
    systemGrandTotal: { type: Number, default: 0 },
    systemTips: { type: Number, default: 0 },
    systemDeliveryTotal: { type: Number, default: 0 },
    systemTaxTotal: { type: Number, default: 0 },
    systemDiscountTotal: { type: Number, default: 0 },
    totalDriverPayout: { type: Number, default: 0 },
    totalExpensePayout: { type: Number, default: 0 },

    // ── Terminal Deposits List (Multiple Deposits Entry per Day) ──
    terminalDeposits: [
      {
        cash: { type: Number, default: 0 },
        interac: { type: Number, default: 0 },
        visa: { type: Number, default: 0 },
        mastercard: { type: Number, default: 0 },
        giftCard: { type: Number, default: 0 },
        totalDeposit: { type: Number, default: 0 },
        comments: { type: String, default: "" },
        time: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // ── Cumulative Totals across all Deposits ──
    enteredCash: { type: Number, default: 0 },
    enteredInterac: { type: Number, default: 0 },
    enteredVisa: { type: Number, default: 0 },
    enteredMastercard: { type: Number, default: 0 },
    enteredGiftCard: { type: Number, default: 0 },
    enteredTotalCard: { type: Number, default: 0 },   // sum of all card types
    enteredGrandTotal: { type: Number, default: 0 },  // cash + all cards

    // ── Shortage / Overage ──
    cashShortage: { type: Number, default: 0 },       // enteredCash - systemCash
    cardShortage: { type: Number, default: 0 },       // enteredTotalCard - systemCard
    grandShortage: { type: Number, default: 0 },      // enteredGrandTotal - (systemCash + systemCard)

    // ── Status & Locking ──
    comments: { type: String, default: "" },
    closedBy: { type: String, default: "Manager" },
    closedAt: { type: Date },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

// One closing per branch per day
accountClosingSchema.index({ branchId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("AccountClosing", accountClosingSchema);
