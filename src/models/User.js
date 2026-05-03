import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: false,
  },
  position: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ['admin', 'ceo', 'csuit', 'cfo', 'accountant', 'audit'],
    default: 'accountant',
    lowercase: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  inviteToken: {
    type: String,
    default: null,
  },
  inviteExpires: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
});

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Always delete the cached model before recompiling.
// This ensures schema changes (like adding new roles) are always picked up
// in Next.js dev mode where the module re-evaluates but the mongoose
// connection persists with the old compiled model.
delete mongoose.models['User'];
export default mongoose.model('User', userSchema);
