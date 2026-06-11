import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  bankName: { type: String, required: true },
  accountNo: { type: String, default: '' },
  acName: { type: String, default: '' },
  branch: { type: String, default: '' },
  routingNo: { type: String, default: '' },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false, // Make it false for existing records
  },
}, {
  timestamps: true,
});

delete mongoose.models.Account;
export default mongoose.models.Account || mongoose.model('Account', accountSchema);
