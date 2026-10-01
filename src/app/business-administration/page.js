'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { hasPermission } from '@/lib/permissions';
import CustomSelect from '@/components/UI/CustomSelect';
import axios from 'axios';
import { 
  Building2, Save, Plus, X, Loader2, Mail, Phone, Globe, MapPin, AlertCircle, CheckCircle, Factory, ShieldCheck, Flag, Coins, Clock
} from 'lucide-react';

export default function BusinessAdministration() {
  const { user, loading: authLoading } = useAuth();
  
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', website: '', industry: '', address: '',
    country: '', currency: '', timezone: '', businessType: '', registrationNo: '', taxNo: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  
  const [designations, setDesignations] = useState([]);
  const [newDesignation, setNewDesignation] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      fetchCompany();
    }
  }, [authLoading, user]);

  const fetchCompany = async () => {
    try {
      const res = await axios.get('/api/company');
      if (res.data.success) {
        const c = res.data.data;
        setCompany(c);
        setFormData({
          name: c.name || '', email: c.email || '', phone: c.phone || '',
          website: c.website || '', industry: c.industry || '', address: c.address || '',
          country: c.country || 'Bangladesh', currency: c.currency || 'BDT',
          timezone: c.timezone || 'Asia/Dhaka', businessType: c.businessType || '',
          registrationNo: c.registrationNo || '', taxNo: c.taxNo || ''
        });
        setDepartments(c.departments || []);
        setDesignations(c.designations || []);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load company details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
      setNewDepartment('');
    }
  };

  const handleRemoveDepartment = (dept) => {
    setDepartments(departments.filter(d => d !== dept));
  };

  const handleAddDesignation = () => {
    if (newDesignation.trim() && !designations.includes(newDesignation.trim())) {
      setDesignations([...designations, newDesignation.trim()]);
      setNewDesignation('');
    }
  };

  const handleRemoveDesignation = (desig) => {
    setDesignations(designations.filter(d => d !== desig));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        ...formData,
        departments,
        designations
      };
      const res = await axios.patch('/api/company', payload);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Business settings updated successfully.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update settings.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const isManager = hasPermission(user, 'business_admin');

  // Business Administration is restricted to administrator accounts
  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="access-denied">
          <AlertCircle size={40} />
          <h3>Access Restricted</h3>
          <p>Business Administration is only available to administrator accounts.</p>
        </div>
        <style jsx>{`
          .access-denied { max-width: 420px; margin: 4rem auto; padding: 2.5rem 2rem; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #94a3b8; }
          .access-denied h3 { margin: 1rem 0 0.5rem; font-size: 1.125rem; font-weight: 800; color: #0f172a; }
          .access-denied p { margin: 0; font-size: 0.875rem; color: #64748b; }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="admin-container animate-fade-in">
        <div className="admin-header">
          <div className="title-area">
            <div className="icon-slate"><Building2 size={28} /></div>
            <div>
              <h2>Business Administration</h2>
              <p>Manage company details, departments, and configuration</p>
            </div>
          </div>
          {isManager && (
            <button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Changes</span>
            </button>
          )}
        </div>

        {message && (
          <div className={`message-banner ${message.type}`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="admin-grid">
          {/* Left Column: Form */}
          <div className="form-col">
            <div className="card form-card">
              <h3 className="card-title">Company Profile</h3>
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Company Name *</label>
                  <div className="input-with-icon">
                    <Building2 size={16} className="field-icon" />
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-icon" />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Phone Number</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="field-icon" />
                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field full-width">
                  <label>Address</label>
                  <div className="input-with-icon">
                    <MapPin size={16} className="field-icon" />
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Website</label>
                  <div className="input-with-icon">
                    <Globe size={16} className="field-icon" />
                    <input type="url" name="website" value={formData.website} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Industry</label>
                  <div className="input-with-icon">
                    <Factory size={16} className="field-icon" />
                    <input type="text" name="industry" value={formData.industry} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card form-card">
              <h3 className="card-title">Localization & Legal</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Country</label>
                  <div className="input-with-icon">
                    <Flag size={16} className="field-icon" />
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <CustomSelect
                    name="currency"
                    icon={<Coins size={16} />}
                    disabled={!isManager}
                    value={formData.currency}
                    onChange={(val) => handleInputChange({ target: { name: 'currency', value: val } })}
                    options={[
                      { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
                      { value: 'USD', label: 'USD - US Dollar' },
                      { value: 'EUR', label: 'EUR - Euro' },
                      { value: 'GBP', label: 'GBP - British Pound' },
                    ]}
                  />
                </div>
                <div className="form-field">
                  <label>Registration Number</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={16} className="field-icon" />
                    <input type="text" name="registrationNo" value={formData.registrationNo} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Tax ID (TIN/VAT)</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={16} className="field-icon" />
                    <input type="text" name="taxNo" value={formData.taxNo} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Departments & Designations */}
          <div className="lists-col">
            <div className="card list-card">
              <h3 className="card-title">Departments</h3>
              <p className="card-desc">Configure departments used during employee registration.</p>
              
              {isManager && (
                <div className="add-item-row">
                  <input 
                    type="text" 
                    placeholder="E.g., Engineering, HR..." 
                    value={newDepartment} 
                    onChange={e => setNewDepartment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                  />
                  <button onClick={handleAddDepartment} className="btn-add"><Plus size={16}/></button>
                </div>
              )}
              
              {departments.length === 0 ? (
                <span className="empty-text">No departments added.</span>
              ) : (
                <ul className="item-list">
                  {departments.map((dept, i) => (
                    <li key={dept} className="list-row">
                      <span className="list-index">{i + 1}</span>
                      <span className="list-name">{dept}</span>
                      {isManager && (
                        <button type="button" className="list-remove" onClick={() => handleRemoveDepartment(dept)} title={`Remove ${dept}`}>
                          <X size={14}/>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card list-card">
              <h3 className="card-title">Designations</h3>
              <p className="card-desc">Configure job titles and designations for employees.</p>
              
              {isManager && (
                <div className="add-item-row">
                  <input 
                    type="text" 
                    placeholder="E.g., Software Engineer, Manager..." 
                    value={newDesignation} 
                    onChange={e => setNewDesignation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddDesignation()}
                  />
                  <button onClick={handleAddDesignation} className="btn-add"><Plus size={16}/></button>
                </div>
              )}
              
              {designations.length === 0 ? (
                <span className="empty-text">No designations added.</span>
              ) : (
                <ul className="item-list">
                  {designations.map((desig, i) => (
                    <li key={desig} className="list-row">
                      <span className="list-index">{i + 1}</span>
                      <span className="list-name">{desig}</span>
                      {isManager && (
                        <button type="button" className="list-remove" onClick={() => handleRemoveDesignation(desig)} title={`Remove ${desig}`}>
                          <X size={14}/>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .admin-container { padding-bottom: 2rem; }
          .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
          .title-area { display: flex; align-items: center; gap: 1rem; }
          .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
          .title-area p { color: #64748b; font-size: 0.875rem; margin: 0.25rem 0 0 0; font-weight: 500; }
          .icon-slate { width: 48px; height: 48px; background: linear-gradient(135deg, #e2e8f0, #cbd5e1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #475569; }

          .message-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.875rem; }
          .message-banner.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .message-banner.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

          .admin-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start; }
          .form-col, .lists-col { display: flex; flex-direction: column; gap: 1.5rem; min-width: 0; }
          @media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
          
          .card { background: #fff; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .card-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; }
          .form-card { padding: 1.75rem; }
          
          .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 1.5rem; }
          .form-field { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
          .full-width { grid-column: 1 / -1; }
          @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
          
          .form-field label { font-size: 0.8125rem; font-weight: 700; color: #334155; }
          .input-with-icon { position: relative; }
          .input-with-icon :global(.field-icon) { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; z-index: 1; }
          .input-with-icon:focus-within :global(.field-icon) { color: #4f46e5; }
          .input-with-icon input, .input-with-icon select { width: 100%; padding: 0.6875rem 1rem 0.6875rem 2.625rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.875rem; font-family: inherit; font-weight: 500; color: #0f172a; outline: none; transition: all 0.2s; background: #fff; }
          .input-with-icon select {
            appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 2.5rem;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 0.875rem center; background-size: 16px;
          }
          .input-with-icon select:disabled { background-color: #f8fafc; color: #64748b; cursor: not-allowed; }
          .input-with-icon input:focus, .input-with-icon select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
          .input-with-icon input[readonly] { background: #f8fafc; color: #64748b; cursor: not-allowed; }

          .list-card { padding: 1.75rem; }
          .card-desc { font-size: 0.8125rem; color: #64748b; margin-top: -1rem; margin-bottom: 1.5rem; }
          
          .add-item-row { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
          .add-item-row input { flex: 1; padding: 0.625rem 1rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.875rem; outline: none; }
          .add-item-row input:focus { border-color: #4f46e5; }
          .btn-add { background: #4f46e5; color: white; border: none; border-radius: 4px; width: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
          .btn-add:hover { background: #4338ca; }

          .empty-text { font-size: 0.875rem; color: #94a3b8; font-style: italic; }
          .item-list { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
          .list-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; font-weight: 600; color: #0f172a; transition: background 0.15s; }
          .list-row:last-child { border-bottom: none; }
          .list-row:hover { background: #f8fafc; }
          .list-index { flex-shrink: 0; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 4px; background: #eef2ff; color: #4f46e5; font-size: 0.6875rem; font-weight: 800; }
          .list-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .list-remove { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border: none; border-radius: 4px; background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.15s; }
          .list-remove:hover { background: #fef2f2; color: #dc2626; }

          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
