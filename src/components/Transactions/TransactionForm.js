'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { FileText, Tag, Send, User, Wallet, ArrowUpRight, TrendingDown, DollarSign, ChevronDown, Check, ArrowRightLeft, CreditCard } from 'lucide-react';

export default function TransactionForm({ onTransactionAdded }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'revenue',
    amount: '',
    description: '',
    performedBy: user?.name || '',
    otherName: '',
    account: '',
    toAccount: ''
  });
  
  const [isOther, setIsOther] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  
  // Custom Select State
  const [openSelect, setOpenSelect] = useState(null); // 'type', 'attribution', 'account', 'toAccount'
  const selectRef = useRef(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user?.companyId) return;
      try {
        const { data } = await axios.get(`/api/accounts?companyId=${user.companyId}`);
        setAccounts(data.data || []);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      }
    };

    fetchAccounts();

    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpenSelect(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  // Sync performedBy when user loads (user is null on first render due to async auth)
  useEffect(() => {
    if (user?.name && !formData.performedBy) {
      setFormData(prev => ({ ...prev, performedBy: user.name }));
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectOption = (name, value) => {
    if (name === 'type' && value === 'loan_disbursal') {
      // Redirect to the dedicated loans page to handle employee loan requests
      window.location.href = '/loans';
      return;
    }

    if (name === 'performedBy') {
      if (value === 'other') {
        setIsOther(true);
        setFormData({ ...formData, performedBy: 'other' });
      } else {
        setIsOther(false);
        setFormData({ ...formData, performedBy: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setOpenSelect(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalPerformedBy = isOther ? formData.otherName : formData.performedBy;
      
      if (!formData.account) {
        alert('Please select an account');
        setLoading(false);
        return;
      }

      if (formData.type === 'transfer' && !formData.toAccount) {
        alert('Please select a destination account for the transfer');
        setLoading(false);
        return;
      }

      await axios.post('/api/transactions', {
        ...formData,
        performedBy: finalPerformedBy,
        amount: parseFloat(formData.amount),
        userId: user._id,
        companyId: user.companyId
      });
      
      setFormData({
        type: 'revenue',
        amount: '',
        description: '',
        performedBy: user?.name || '',
        otherName: '',
        account: '',
        toAccount: ''
      });
      setIsOther(false);
      onTransactionAdded();
      alert('Transaction submitted and awaiting approval.');
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'revenue', label: 'Inflow', icon: <ArrowUpRight size={16} className="text-tx-revenue" /> },
    { value: 'expense', label: 'Outflow', icon: <TrendingDown size={16} className="text-tx-expense" /> },
    { value: 'investment', label: 'Investment', icon: <Wallet size={16} className="text-tx-investment" /> },
    { value: 'transfer', label: 'Transfer', icon: <ArrowRightLeft size={16} style={{ color: '#8b5cf6' }} /> },
    { value: 'loan_disbursal', label: 'Loan Disbursal', icon: <CreditCard size={16} style={{ color: '#eab308' }} /> }
  ];

  const attributionOptions = [
    { value: user?.name, label: `${user?.name} (Self)`, icon: <User size={16} /> },
    { value: 'other', label: 'Other Person', icon: <User size={16} /> }
  ];

  const currentType = typeOptions.find(o => o.value === formData.type);
  const currentAttribution = attributionOptions.find(o => o.value === formData.performedBy) || attributionOptions[0];

  return (
    <div className="card form-premium-card" ref={selectRef}>
      <div className="form-header">
        <div className="header-text">
          <h3>Create Transaction</h3>
          <p>Record financial transaction for approval</p>
        </div>
        <div className="header-icon">
          <Wallet size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="tx-form">
        <div className="form-grid">
          {/* Transaction Type Custom Select */}
          <div className="form-group">
            <label>Transaction Type <span style={{ color: '#ef4444' }}>*</span></label>
            <div className="custom-select-container">
              <div 
                className={`custom-select-trigger ${openSelect === 'type' ? 'active' : ''}`}
                onClick={() => setOpenSelect(openSelect === 'type' ? null : 'type')}
              >
                <div className="trigger-content">
                  {currentType?.icon}
                  <span>{currentType?.label}</span>
                </div>
                <ChevronDown size={16} className={`arrow-icon ${openSelect === 'type' ? 'rotate' : ''}`} />
              </div>
              
              {openSelect === 'type' && (
                <div className="custom-options animate-pop-in">
                  {typeOptions.map((opt) => (
                    <div 
                      key={opt.value}
                      className={`custom-option ${formData.type === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelectOption('type', opt.value)}
                    >
                      <div className="option-label">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                      {formData.type === opt.value && <Check size={14} className="check-icon" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Amount (BDT) <span style={{ color: '#ef4444' }}>*</span></label>
            <div className="input-with-icon">
              <span className="currency-label">BDT</span>
              <input 
                type="number" 
                name="amount" 
                className="input-field amount-input" 
                placeholder="0.00" 
                value={formData.amount} 
                onChange={handleInputChange} 
                required 
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Account Selection */}
          {formData.type !== 'transfer' ? (
            <div className="form-group">
              <label>Account <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="custom-select-container">
                <div 
                  className={`custom-select-trigger ${openSelect === 'account' ? 'active' : ''}`}
                  onClick={() => setOpenSelect(openSelect === 'account' ? null : 'account')}
                >
                  <div className="trigger-content">
                    <CreditCard size={16} />
                    <span>{accounts.find(a => a._id === formData.account)?.bankName || 'Select Account'}</span>
                  </div>
                  <ChevronDown size={16} className={`arrow-icon ${openSelect === 'account' ? 'rotate' : ''}`} />
                </div>
                
                {openSelect === 'account' && (
                  <div className="custom-options animate-pop-in">
                    {accounts.map((acc) => (
                      <div 
                        key={acc._id}
                        className={`custom-option ${formData.account === acc._id ? 'selected' : ''}`}
                        onClick={() => handleSelectOption('account', acc._id)}
                      >
                        <div className="option-label">
                          <CreditCard size={16} />
                          <span>{acc.bankName}</span>
                        </div>
                        {formData.account === acc._id && <Check size={14} className="check-icon" />}
                      </div>
                    ))}
                    {accounts.length === 0 && (
                      <div className="custom-option" style={{ color: '#94a3b8', cursor: 'default' }}>
                        No accounts available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>From Account <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="custom-select-container">
                  <div 
                    className={`custom-select-trigger ${openSelect === 'account' ? 'active' : ''}`}
                    onClick={() => setOpenSelect(openSelect === 'account' ? null : 'account')}
                  >
                    <div className="trigger-content">
                      <CreditCard size={16} />
                      <span>{accounts.find(a => a._id === formData.account)?.bankName || 'Select Source Account'}</span>
                    </div>
                    <ChevronDown size={16} className={`arrow-icon ${openSelect === 'account' ? 'rotate' : ''}`} />
                  </div>
                  
                  {openSelect === 'account' && (
                    <div className="custom-options animate-pop-in">
                      {accounts.map((acc) => (
                        <div 
                          key={acc._id}
                          className={`custom-option ${formData.account === acc._id ? 'selected' : ''}`}
                          onClick={() => handleSelectOption('account', acc._id)}
                        >
                          <div className="option-label">
                            <CreditCard size={16} />
                            <span>{acc.bankName}</span>
                          </div>
                          {formData.account === acc._id && <Check size={14} className="check-icon" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label>To Account <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="custom-select-container">
                  <div 
                    className={`custom-select-trigger ${openSelect === 'toAccount' ? 'active' : ''}`}
                    onClick={() => setOpenSelect(openSelect === 'toAccount' ? null : 'toAccount')}
                  >
                    <div className="trigger-content">
                      <CreditCard size={16} />
                      <span>{accounts.find(a => a._id === formData.toAccount)?.bankName || 'Select Destination Account'}</span>
                    </div>
                    <ChevronDown size={16} className={`arrow-icon ${openSelect === 'toAccount' ? 'rotate' : ''}`} />
                  </div>
                  
                  {openSelect === 'toAccount' && (
                    <div className="custom-options animate-pop-in">
                      {accounts.map((acc) => (
                        <div 
                          key={acc._id}
                          className={`custom-option ${formData.toAccount === acc._id ? 'selected' : ''}`}
                          onClick={() => handleSelectOption('toAccount', acc._id)}
                        >
                          <div className="option-label">
                            <CreditCard size={16} />
                            <span>{acc.bankName}</span>
                          </div>
                          {formData.toAccount === acc._id && <Check size={14} className="check-icon" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Attribution Custom Select */}
          <div className="form-group">
            <label>Attribution <span style={{ color: '#ef4444' }}>*</span></label>
            <div className="custom-select-container">
              <div 
                className={`custom-select-trigger ${openSelect === 'attribution' ? 'active' : ''}`}
                onClick={() => setOpenSelect(openSelect === 'attribution' ? null : 'attribution')}
              >
                <div className="trigger-content">
                  <User size={16} />
                  <span>{currentAttribution?.label}</span>
                </div>
                <ChevronDown size={16} className={`arrow-icon ${openSelect === 'attribution' ? 'rotate' : ''}`} />
              </div>
              
              {openSelect === 'attribution' && (
                <div className="custom-options animate-pop-in">
                  {attributionOptions.map((opt) => (
                    <div 
                      key={opt.value}
                      className={`custom-option ${formData.performedBy === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelectOption('performedBy', opt.value)}
                    >
                      <div className="option-label">
                        {opt.icon}
                        <span>{opt.label}</span>
                      </div>
                      {formData.performedBy === opt.value && <Check size={14} className="check-icon" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isOther && (
            <div className="form-group animate-slide-in">
              <label>Person's Name <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="input-with-icon">
                <FileText size={16} />
                <input 
                  type="text" 
                  name="otherName" 
                  className="input-field" 
                  placeholder="Full Name" 
                  value={formData.otherName} 
                  onChange={handleInputChange}
                  required={isOther}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Description <span style={{ color: '#ef4444' }}>*</span></label>
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
        </div>

        <button type="submit" className="btn-submit-premium" disabled={loading}>
          {loading ? (
            <span className="loader-dots">Processing...</span>
          ) : (
            <>
              <Send size={18} />
              <span>Submit for Verification</span>
            </>
          )}
        </button>
      </form>

      <style jsx>{`
        .form-premium-card {
          padding: 2rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          background: white;
          position: relative;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1.5rem;
        }

        .header-text h3 { font-size: clamp(1.1rem, 4vw, 1.25rem); font-weight: 800; color: #0f172a; margin: 0; }
        .header-text p { font-size: clamp(0.75rem, 3vw, 0.875rem); color: #64748b; margin-top: 0.25rem; }
        .header-icon { background: #f8fafc; padding: clamp(0.5rem, 2vw, 0.75rem); border-radius: 4px; color: #0f172a; border: 1px solid #e2e8f0; }

        .form-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        label {
          display: block;
          margin-bottom: 0.625rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        /* Custom Select Styles */
        .custom-select-container { position: relative; }
        
        .custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(0.5rem, 3vw, 0.75rem) clamp(0.75rem, 4vw, 1rem);
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: clamp(40px, 12vw, 46px);
        }
        
        .custom-select-trigger:hover { border-color: #cbd5e1; }
        .custom-select-trigger.active { 
          background: white;
          border-color: #0f172a; 
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); 
        }

        .trigger-content { display: flex; align-items: center; gap: 0.75rem; font-size: clamp(0.85rem, 3.5vw, 0.9375rem); font-weight: 700; color: #0f172a; }
        .trigger-content :global(svg) { color: #64748b; }

        .arrow-icon { color: #64748b; transition: transform 0.3s; }
        .arrow-icon.rotate { transform: rotate(180deg); }

        .custom-options {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0.5rem;
          z-index: 1000;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .custom-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .custom-option:hover { background: #f8fafc; }
        .custom-option.selected { background: #f1f5f9; }

        .option-label { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 700; color: #0f172a; }
        .option-label :global(svg) { color: #64748b; }
        .check-icon { color: #0f172a; }

        /* Standard Input Styles */
        .input-with-icon { position: relative; display: flex; align-items: center; }
        .input-with-icon :global(svg) { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }

        .input-field {
          width: 100%;
          padding: clamp(0.6rem, 3vw, 0.75rem) 1rem clamp(0.6rem, 3vw, 0.75rem) 2.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: clamp(0.85rem, 3.5vw, 0.9375rem);
          color: #0f172a;
          transition: all 0.2s;
        }

        .input-field:focus {
          background: white;
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
          outline: none;
        }

        .currency-label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 800;
          font-size: 0.75rem;
          color: #64748b;
        }


        .amount-input { padding-left: 3.25rem; font-weight: 700; font-size: 1.125rem; }

        .btn-submit-premium {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: clamp(0.75rem, 4vw, 1rem);
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: clamp(0.85rem, 3.5vw, 0.9375rem);
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
        }

        .btn-submit-premium:hover:not(:disabled) {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2);
        }

        .btn-submit-premium:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: #94a3b8;
        }

        @media (max-width: 768px) {
          .form-premium-card { padding: 1.5rem; }
        }

        .animate-pop-in {
          animation: popIn 0.2s ease-out;
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
