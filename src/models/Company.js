import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

if (mongoose.models.Company) {
  delete mongoose.models.Company;
  delete mongoose.connection.models.Company;
}

export default mongoose.models.Company || mongoose.model('Company', companySchema);
