import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Human-readable actor name snapshot
  actorName: { type: String, default: '' },

  action: {
    type: String,
    required: true,
    // e.g. 'created_loan', 'approved_loan', 'added_repayment', 'created_transaction', etc.
  },
  entity: {
    type: String,
    enum: ['loan', 'repayment', 'transaction', 'account', 'employee', 'company', 'user', 'settings'],
    required: true,
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  entityLabel: { type: String, default: '' }, // Human-readable summary of what changed

  // JSON snapshots (store as Mixed to avoid schema rigidity)
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },

  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, {
  timestamps: true,
});

// Newest-first audit list per company, optionally filtered by entity
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, entity: 1, createdAt: -1 });

// Audit logs are immutable — never expose update/delete routes for this collection
delete mongoose.models['AuditLog'];
export default mongoose.model('AuditLog', auditLogSchema);
