const mongoose = require('mongoose');

const dealSizePriceSchema = new mongoose.Schema({
  sizeCode: {
    type: String,
    required: true,
  },
  sizeName: {
    type: String,
    default: '',
  },
  originalPrice: {
    type: Number,
    default: 0,
  },
  dealPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const dealOfTheDaySchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    lowercase: true,
    trim: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  sizes: [dealSizePriceSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

dealOfTheDaySchema.virtual('id').get(function() {
  return this._id.toHexString();
});
dealOfTheDaySchema.set('toJSON', { virtuals: true });
dealOfTheDaySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DealOfTheDay', dealOfTheDaySchema);
