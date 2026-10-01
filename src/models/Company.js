import mongoose from 'mongoose';

const loanPolicySchema = new mongoose.Schema({
  maxLoanAmount: { type: Number, default: 100000 },
  maxLoanPeriodMonths: { type: Number, default: 12 },
  requireApproval: { type: Boolean, default: true },
  currency: { type: String, default: 'BDT' },
}, { _id: false });

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // --- Existing fields ---
  email:    { type: String, trim: true, default: '' },
  phone:    { type: String, trim: true, default: '' },
  website:  { type: String, trim: true, default: '' },
  industry: { type: String, trim: true, default: '' },
  address:  { type: String, trim: true, default: '' },

  // --- New fields ---
  country:          { type: String, trim: true, default: 'Bangladesh' },
  currency:         { type: String, trim: true, default: 'BDT' },
  timezone:         { type: String, trim: true, default: 'Asia/Dhaka' },
  businessType:     { type: String, trim: true, default: '' },
  logo:             { type: String, trim: true, default: '' },
  registrationNo:   { type: String, trim: true, default: '' },
  taxNo:            { type: String, trim: true, default: '' },

  loanPolicy: { type: loanPolicySchema, default: () => ({}) },
}, {
  timestamps: true,
});

if (mongoose.models.Company) {
  delete mongoose.models.Company;
  delete mongoose.connection.models.Company;
}

export default mongoose.models.Company || mongoose.model('Company', companySchema);
