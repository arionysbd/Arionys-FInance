'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
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

  const isManager = ['owner', 'admin'].includes(user?.role?.toLowerCase());

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

            <div className="card form-card mt-6">
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
                  <div className="input-with-icon">
                    <Coins size={16} className="field-icon" />
                    <select name="currency" value={formData.currency} onChange={handleInputChange} disabled={!isManager}>
                      <option value="BDT">BDT - Bangladeshi Taka</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
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
              
              <div className="tags-container">
                {departments.length === 0 && <span className="empty-text">No departments added.</span>}
                {departments.map((dept, i) => (
                  <div key={i} className="tag-item">
                    <span>{dept}</span>
                    {isManager && <button onClick={() => handleRemoveDepartment(dept)}><X size={14}/></button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card list-card mt-6">
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
              
              <div className="tags-container">
                {designations.length === 0 && <span className="empty-text">No designations added.</span>}
                {designations.map((desig, i) => (
                  <div key={i} className="tag-item designation-tag">
                    <span>{desig}</span>
                    {isManager && <button onClick={() => handleRemoveDesignation(desig)}><X size={14}/></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .admin-container { padding-bottom: 2rem; }
          .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
          .title-area { display: flex; align-items: center; gap: 1rem; }
          .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
          .title-area p { color: #64748b; font-size: 0.875rem; margin: 0.25rem 0 0 0; font-weight: 500; }
          .icon-slate { width: 48px; height: 48px; background: linear-gradient(135deg, #e2e8f0, #cbd5e1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #475569; }

          .message-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.875rem; }
          .message-banner.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .message-banner.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

          .admin-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
          @media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
          
          .card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .card-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; }
          .form-card { padding: 1.5rem; }
          
          .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
          .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
          .full-width { grid-column: 1 / -1; }
          @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
          
          .form-field label { font-size: 0.8125rem; font-weight: 700; color: #334155; }
          .input-with-icon { position: relative; }
          .field-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
          .input-with-icon input, .input-with-icon select { width: 100%; padding: 0.625rem 1rem 0.625rem 2.5rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; font-family: inherit; font-weight: 500; color: #0f172a; outline: none; transition: all 0.2s; background: #fff; }
          .input-with-icon input:focus, .input-with-icon select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
          .input-with-icon input[readonly] { background: #f8fafc; color: #64748b; cursor: not-allowed; }

          .list-card { padding: 1.5rem; }
          .card-desc { font-size: 0.8125rem; color: #64748b; margin-top: -1rem; margin-bottom: 1.5rem; }
          
          .add-item-row { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
          .add-item-row input { flex: 1; padding: 0.625rem 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; outline: none; }
          .add-item-row input:focus { border-color: #4f46e5; }
          .btn-add { background: #4f46e5; color: white; border: none; border-radius: 6px; width: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
          .btn-add:hover { background: #4338ca; }

          .tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .empty-text { font-size: 0.875rem; color: #94a3b8; font-style: italic; }
          .tag-item { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.75rem; background: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; }
          .tag-item button { background: none; border: none; padding: 0; color: #6366f1; cursor: pointer; display: flex; align-items: center; }
          .tag-item button:hover { color: #3730a3; }
          
          .designation-tag { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
          .designation-tag button { color: #64748b; }
          .designation-tag button:hover { color: #0f172a; }

          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
