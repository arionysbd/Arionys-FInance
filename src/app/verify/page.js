'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

function VerifyContent() {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setError('No magic link token found');
        return;
      }

      try {
        const { data } = await axios.post('/api/auth/verify-magic-link', { token });
        if (data.success) {
          setStatus('success');
          // Wait a bit to show success message
          setTimeout(() => {
            login(data.data);
          }, 1500);
        }
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.message || 'Verification failed');
      }
    };

    verifyToken();
  }, [token, login]);

  return (
    <div className="verify-container">
      <div className="verify-card card glass animate-fade-in">
        {status === 'verifying' && (
          <div className="state-content">
            <Loader2 className="spinner text-primary" size={48} />
            <h2>Verifying Link</h2>
            <p>Please wait while we secure your session...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="state-content">
            <CheckCircle2 className="text-success" size={48} />
            <h2>Welcome Back!</h2>
            <p>Verification successful. Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-content">
            <XCircle className="text-destructive" size={48} />
            <h2>Link Invalid</h2>
            <p>{error}</p>
            <button 
              className="btn btn-primary mt-6"
              onClick={() => router.push('/login')}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .verify-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 1.5rem;
        }
        .verify-card {
          width: 100%;
          max-width: 400px;
          padding: 3rem 2rem;
          text-align: center;
        }
        .state-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        .state-content h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .state-content p { color: #64748b; font-size: 0.875rem; line-height: 1.6; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .text-success { color: #10b981; }
        .mt-6 { margin-top: 1.5rem; }
      `}</style>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
