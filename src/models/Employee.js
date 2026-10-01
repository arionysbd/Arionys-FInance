import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true, default: '' },
  employeeId: { type: String, trim: true, default: '' },
  department: { type: String, trim: true, default: '' },
  designation: { type: String, trim: true, default: '' },
  joiningDate: { type: Date, default: null },
  salary: { type: Number, default: 0 },
  loanLimit: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active',
  },
  profilePhoto: { type: String, default: '' },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  // Optional link to a User account (if the employee also has login access)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

// Compound index: email must be unique within a company
employeeSchema.index({ email: 1, companyId: 1 }, { unique: true });

delete mongoose.models['Employee'];
export default mongoose.model('Employee', employeeSchema);
