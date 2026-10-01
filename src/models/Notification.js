import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  // null = broadcast to all company members with appropriate role
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'loan_due_soon',
      'loan_overdue',
      'loan_created',
      'loan_approved',
      'loan_rejected',
      'loan_repayment',
      'loan_completed',
      'large_transaction',
      'new_employee',
      'new_transaction',
      'transfer_completed',
      'account_balance_low',
      'system_alert',
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedEntity: {
    type: String,
    enum: ['loan', 'transaction', 'employee', 'account', 'system'],
    default: 'system',
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  isRead: { type: Boolean, default: false, index: true },
}, {
  timestamps: true,
});

delete mongoose.models['Notification'];
export default mongoose.model('Notification', notificationSchema);
