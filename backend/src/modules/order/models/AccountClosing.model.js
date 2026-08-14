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

    // ── System Calculated (from Orders) ──
    systemCash: { type: Number, default: 0 },
    systemCard: { type: Number, default: 0 },
    systemAccountPay: { type: Number, default: 0 },
    systemGrandTotal: { type: Number, default: 0 },
    systemTips: { type: Number, default: 0 },
    systemDeliveryTotal: { type: Number, default: 0 },
    systemTaxTotal: { type: Number, default: 0 },
    systemDiscountTotal: { type: Number, default: 0 },

    // ── Manager Entered (from physical terminal/cash count) ──
    enteredCash: { type: Number, default: 0 },
    enteredVisa: { type: Number, default: 0 },
    enteredMastercard: { type: Number, default: 0 },
    enteredInterac: { type: Number, default: 0 },
    enteredAmex: { type: Number, default: 0 },
    enteredGiftCard: { type: Number, default: 0 },
    enteredOther: { type: Number, default: 0 },
    enteredCheck: { type: Number, default: 0 },

    // ── Computed at save time ──
    enteredTotalCard: { type: Number, default: 0 },   // sum of all card types
    enteredGrandTotal: { type: Number, default: 0 },  // cash + all cards

    // ── Shortage / Overage ──
    cashShortage: { type: Number, default: 0 },       // enteredCash - systemCash (negative = shortage)
    cardShortage: { type: Number, default: 0 },       // enteredCard - systemCard
    grandShortage: { type: Number, default: 0 },      // enteredGrandTotal - systemGrandTotal

    // ── Paidouts ──
    totalDriverPayout: { type: Number, default: 0 },
    totalExpensePayout: { type: Number, default: 0 },

    // ── Meta ──
    comments: { type: String, default: "" },
    closedBy: { type: String, default: "Manager" },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "closed",
    },
  },
  {
    timestamps: true,
  }
);

// One closing per branch per day
accountClosingSchema.index({ branchId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("AccountClosing", accountClosingSchema);
