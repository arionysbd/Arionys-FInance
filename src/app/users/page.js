'use client';
import { useState, useEffect } from 'react';
import { Users, Shield, User as UserIcon, Mail, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (userId, newRole) => {
    try {
      await axios.patch('/api/users', {
        userId,
        role: newRole,
        adminId: currentUser._id
      });
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading) return <div className="muted-text">Loading users...</div>;

  return (
    <div className="users-container animate-fade-in">
      <div className="card">
        <div className="header">
          <div className="title-info">
            <Shield className="text-primary" size={20} />
            <h3>Team Management</h3>
          </div>
        </div>

        <div className="users-grid">
          {users.map((u) => (
            <div key={u._id} className="user-card card">
              <div className="user-info-main">
                <div className="user-avatar">
                  <UserIcon size={24} />
                </div>
                <div className="user-details">
                  <h4>{u.name} {u._id === currentUser._id && <span className="self-tag">(You)</span>}</h4>
                  <p><Mail size={12} /> {u.email}</p>
                </div>
              </div>

              <div className="role-management">
                <label>System Role</label>
                <select 
                  className="input-field role-select"
                  value={u.role}
                  onChange={(e) => updateRole(u._id, e.target.value)}
                  disabled={u._id === currentUser._id}
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="accountant">Accountant</option>
                </select>
                <p className="role-desc">
                  {u.role?.toLowerCase() === 'admin' && 'Full access to all features and user management.'}
                  {u.role?.toLowerCase() === 'moderator' && 'Can view and approve transactions.'}
                  {u.role?.toLowerCase() === 'accountant' && 'Can record transactions and view approved history.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .users-container { max-width: 1000px; }
        .header { margin-bottom: 2rem; }
        .title-info { display: flex; align-items: center; gap: 0.75rem; }
        .title-info h3 { font-size: 1.25rem; font-weight: 700; margin: 0; }

        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .user-card { padding: 1.5rem; border-color: #f1f5f9; }
        
        .user-info-main { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; }
        .user-avatar { width: 48px; height: 48px; background: #eff6ff; color: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .user-details h4 { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
        .self-tag { color: var(--primary); font-size: 0.75rem; font-weight: 500; }
        .user-details p { font-size: 0.75rem; color: var(--muted-foreground); display: flex; align-items: center; gap: 0.4rem; }

        .role-management { border-top: 1px solid #f1f5f9; padding-top: 1rem; }
        label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); margin-bottom: 0.5rem; text-transform: uppercase; }
        .role-select { padding: 0.5rem; font-size: 0.875rem; font-weight: 600; }
        .role-desc { font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.75rem; line-height: 1.4; }
      `}</style>
    </div>
  );
}
