'use client';
import { useState } from 'react';
import { DollarSign, FileText, Tag, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

export default function TransactionForm({ onTransactionAdded }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'revenue',
    amount: '',
    description: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/transactions', {
        ...formData,
        amount: parseFloat(formData.amount),
        userId: user._id
      });
      setFormData({
        type: 'revenue',
        amount: '',
        description: '',
        category: ''
      });
      onTransactionAdded();
      alert('Transaction submitted and awaiting approval.');
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>Submit New Transaction</h3>
      <form onSubmit={handleSubmit} className="tx-form">
        <div className="form-group">
          <label>Type</label>
          <select name="type" className="input-field" value={formData.type} onChange={handleInputChange}>
            <option value="revenue">Revenue/Income</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label>Amount ($)</label>
            <div className="input-with-icon">
              <DollarSign size={16} />
              <input 
                type="number" 
                name="amount" 
                className="input-field" 
                placeholder="0.00" 
                value={formData.amount} 
                onChange={handleInputChange} 
                required 
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="form-group flex-1">
            <label>Category</label>
            <div className="input-with-icon">
              <Tag size={16} />
              <input 
                type="text" 
                name="category" 
                className="input-field" 
                placeholder="Marketing, Rent..." 
                value={formData.category} 
                onChange={handleInputChange} 
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <div className="input-with-icon">
            <FileText size={16} />
            <input 
              type="text" 
              name="description" 
              className="input-field" 
              placeholder="What is this for?" 
              value={formData.description} 
              onChange={handleInputChange} 
              required 
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? 'Submitting...' : <><Send size={16} /> Submit for Approval</>}
        </button>
      </form>

      <style jsx>{`
        .tx-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-row { display: flex; gap: 1rem; }
        .flex-1 { flex: 1; }
        label { display: block; margin-bottom: 0.4rem; font-size: 0.8125rem; font-weight: 600; color: var(--muted-foreground); }
        .input-with-icon { position: relative; }
        .input-with-icon :global(svg) { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted-foreground); }
        .input-with-icon input { padding-left: 2.5rem; }
        .full-width { width: 100%; margin-top: 1rem; }
      `}</style>
    </div>
  );
}
