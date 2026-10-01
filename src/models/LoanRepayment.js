import mongoose from 'mongoose';

const loanRepaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeLoan',
    required: true,
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Repayment amount must be greater than 0'],
  },
  currency: { type: String, default: 'BDT' },
  date: { type: Date, required: true, default: Date.now },

  // Account that received the repayment money
  receivedIntoAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_banking', 'cheque', 'other'],
    default: 'cash',
  },
  reference: { type: String, default: '' },
  notes: { type: String, default: '' },

  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Linked transaction for this repayment
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
}, {
  timestamps: true,
});

delete mongoose.models['LoanRepayment'];
export default mongoose.model('LoanRepayment', loanRepaymentSchema);
