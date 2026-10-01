import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'ceo', 'cfo', 'csuit', 'accountant', 'viewer', 'member'],
    default: 'member',
  },
  // Page keys the invited person will be able to open
  permissions: {
    type: [String],
    default: undefined,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-deletes after expiresAt
  },
  usedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

delete mongoose.models['Invite'];
export default mongoose.model('Invite', inviteSchema);
