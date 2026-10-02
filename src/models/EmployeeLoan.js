import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
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
    index: true,
  },
  // Snapshot of employee name at time of loan creation for audit trail
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, default: '' },

  amount: {
    type: Number,
    required: true,
    min: [1, 'Loan amount must be greater than 0'],
  },
  currency: { type: String, default: 'BDT' },

  // Account from which money was disbursed
  paidFromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: false,
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  status: {
    type: String,
    enum: [
      'draft',
      'pending_approval',
      'approved',
      'disbursed',
      'active',
      'partially_repaid',
      'overdue',
      'completed',
      'cancelled',
      'rejected',
    ],
    default: 'pending_approval',
    index: true,
  },

  // Repayment tracking (updated on every repayment)
  totalRepaid: { type: Number, default: 0 },
  outstandingAmount: { type: Number, default: 0 }, // Set to `amount` on creation

  // People
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  approvedAt: { type: Date, default: null },
  disbursedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rejectedAt: { type: Date, default: null },

  notes: { type: String, default: '' },

  // 'request' = employee asked for a loan for themselves; 'issued' = created by CEO/CFO/Admin for an employee
  origin: {
    type: String,
    enum: ['request', 'issued'],
    default: 'issued',
    index: true,
  },

  // Track if initial disbursement transaction was created
  disbursementTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },

  // Reminder tracking: avoid duplicate emails
  remindersSent: {
    days30: { type: Boolean, default: false },
    days14: { type: Boolean, default: false },
    days7: { type: Boolean, default: false },
    days3: { type: Boolean, default: false },
    days1: { type: Boolean, default: false },
    overdue: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

// Loan lists per company by status and per employee
loanSchema.index({ companyId: 1, status: 1, createdAt: -1 });
loanSchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });

delete mongoose.models['EmployeeLoan'];
export default mongoose.model('EmployeeLoan', loanSchema);
