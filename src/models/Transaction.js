import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Extended type enum — backward compatible: existing 'investment', 'revenue', 'expense', 'transfer'
  // are kept; new types added for proper financial classification
  type: {
    type: String,
    required: true,
    enum: [
      // Legacy (existing data)
      'investment', 'revenue', 'expense', 'transfer',
      // New canonical types
      'inflow', 'outflow', 'transfer_in', 'transfer_out',
      'loan_disbursement', 'loan_repayment', 'adjustment',
    ],
  },
  // Can be empty while pending: general employees don't pick a bank, the approver chooses it
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function () { return this.status === 'approved'; },
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative'],
  },
  currency: { type: String, default: 'BDT' },
  description: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false,
  },

  // --- New fields ---
  category:   { type: String, default: '' },
  reference:  { type: String, default: '' },
  attachment: { type: String, default: '' },

  // For transfers: link the paired transaction
  pairedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },

  // For loans: link the loan record
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeLoan',
    default: null,
  },

  // Reversal support
  isReversed:    { type: Boolean, default: false },
  reversedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
  reversalOf:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, {
  timestamps: true,
});

if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
  delete mongoose.connection.models.Transaction;
}

export default mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
