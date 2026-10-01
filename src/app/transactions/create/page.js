'use client';
import TransactionForm from '@/components/Transactions/TransactionForm';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CreateTransactionPage() {
  const handleTransactionAdded = () => {
    // Stay on the create page after submitting (no redirect).
    // The form resets itself and shows a confirmation alert.
  };

  return (
    <DashboardLayout>
      <div className="create-tx-layout">
        <div className="back-link-container">
          <Link href="/transactions" className="back-link">
            <ArrowLeft size={16} />
            Back to Transactions
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
