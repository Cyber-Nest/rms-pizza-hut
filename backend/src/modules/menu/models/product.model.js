const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required'],
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  image: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Price cannot be negative'],
  },
  badge: {
    type: String,
    enum: ['Popular', 'Best Seller', 'New', null],
    default: null,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  itemType: {
    type: String,
    enum: ['simple', 'combo'],
    default: 'combo',
  },
  isHalfAndHalf: {
    type: Boolean,
    default: false,
  },
  hasVariants: {
    type: Boolean,
    default: false,
  },
  variants: [{
    sizeCode: { type: String, required: true },
    sizeName: { type: String, required: true },
    price: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: true },
  }],
  includedToppings: [{
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ModifierGroup' },
    optionId: { type: mongoose.Schema.Types.ObjectId },
  }],
  modifierGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModifierGroup',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isOutOfStock: {
    type: Boolean,
    default: false,
  },
  kitchenLabel: {
    type: String,
    enum: ['make_table', 'wings_station', 'pizza', 'chicken'],
    default: 'make_table',
  },
  modifierKitchenLabels: [{
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ModifierGroup'
    },
    kitchenLabel: {
      type: String,
      enum: ['make_table', 'wings_station', 'pizza', 'chicken'],
      default: 'make_table',
    }
  }],
  modifierSizeCodes: [{
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ModifierGroup'
    },
    sizeCode: {
      type: String,
      default: 'medium',
    }
  }],
  displayOrder: {
    type: Number,
    default: 0,
  },
  productId: {
    type: String,
    unique: true,
    sparse: true,
  },
  disabledBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  outOfStockBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }]
}, {
  timestamps: true
});


const ProductCounterSchema = new mongoose.Schema({
  _id: { type: String }, 
  count: { type: Number, default: 2000 },
});
const ProductCounter = mongoose.model("ProductCounter", ProductCounterSchema);

productSchema.pre('save', async function() {
  if (this.isNew && !this.productId) {
    const counter = await ProductCounter.findOneAndUpdate(
      { _id: "productId" },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    this.productId = `M${counter.count}`;
  }
});


productSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 1 });
productSchema.index({ isActive: 1, categoryId: 1 });
productSchema.index({ categoryId: 1, displayOrder: 1 });
productSchema.index({ disabledBranches: 1 });
productSchema.index({ outOfStockBranches: 1 });

module.exports = mongoose.model('Product', productSchema);
