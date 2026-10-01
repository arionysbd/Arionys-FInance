import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  // --- Existing fields (preserved) ---
  bankName:  { type: String, required: true },
  accountNo: { type: String, default: '' },
  acName:    { type: String, default: '' },
  branch:    { type: String, default: '' },
  routingNo: { type: String, default: '' },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false,
  },

  // --- New fields ---
  accountType: {
    type: String,
    enum: ['cash', 'bank', 'mobile_banking', 'digital_wallet', 'savings', 'investment', 'petty_cash', 'other'],
    default: 'bank',
  },
  openingBalance: { type: Number, default: 0 },
  description:    { type: String, default: '' },
  currency:       { type: String, default: 'BDT' },
  status:         { type: String, enum: ['active', 'inactive'], default: 'active' },
  // Whether this is the company default account (typically Cash)
  isDefault:      { type: Boolean, default: false },
}, {
  timestamps: true,
});

delete mongoose.models.Account;
export default mongoose.models.Account || mongoose.model('Account', accountSchema);
