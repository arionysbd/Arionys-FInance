'use client';
import TransactionForm from '@/components/Transactions/TransactionForm';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, getHomePath } from '@/lib/permissions';

export default function CreateTransactionPage() {
  const { user } = useAuth();
  const canSeeHistory = hasPermission(user, 'transactions');
  const handleTransactionAdded = () => {
    // Stay on the create page after submitting (no redirect).
    // The form resets itself and shows a confirmation alert.
  };

  return (
    <DashboardLayout>
      <div className="create-tx-layout">
        <div className="back-link-container">
          <Link href={canSeeHistory ? '/transactions' : getHomePath(user)} className="back-link">
            <ArrowLeft size={16} />
            {canSeeHistory ? 'Back to Transactions' : 'Back to Dashboard'}
          </Link>
        </div>
        <div className="tx-form-container">
          <TransactionForm onTransactionAdded={handleTransactionAdded} />
        </div>
      </div>
      <style jsx>{`
        .create-tx-layout {
          max-width: var(--form-max-width);
          margin: 0 auto;
          padding: 1rem 0 3rem;
        }
        .back-link-container {
          margin-bottom: 2rem;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: #0f172a;
        }
      `}</style>
    </DashboardLayout>
  );
}
