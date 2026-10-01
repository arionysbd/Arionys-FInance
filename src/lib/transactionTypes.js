// Display names for transaction types. The stored values stay the same ('revenue', 'expense', ...);
// only what people see changes.
export const TRANSACTION_TYPE_LABELS = {
  revenue: 'Inflow',
  expense: 'Outflow',
  investment: 'Investment',
  transfer: 'Transfer',
  loan_disbursement: 'Loan Disbursement',
  loan_repayment: 'Loan Repayment',
};

export const typeLabel = (type) =>
  TRANSACTION_TYPE_LABELS[type] || (type ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');
