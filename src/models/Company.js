import mongoose from 'mongoose';

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
  email:    { type: String, trim: true, default: '' },
  phone:    { type: String, trim: true, default: '' },
  website:  { type: String, trim: true, default: '' },
  industry: { type: String, trim: true, default: '' },
  address:  { type: String, trim: true, default: '' },
}, {
  timestamps: true,
});

if (mongoose.models.Company) {
  delete mongoose.models.Company;
  delete mongoose.connection.models.Company;
}

export default mongoose.models.Company || mongoose.model('Company', companySchema);
