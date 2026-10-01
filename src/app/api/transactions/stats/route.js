import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'dashboard', 'transactions', 'reports')) return forbidden('You do not have access to transaction statistics.');

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const transactions = await Transaction.find({ status: 'approved', companyId });
    const accounts = await Account.find({ companyId });

    const accountBalances = {};
    accounts.forEach(acc => {
      accountBalances[acc._id.toString()] = {
        accountId: acc._id.toString(),
        name: acc.bankName || 'Unknown Bank',
        balance: 0
      };
    });

    const stats = transactions.reduce((acc, curr) => {
      if (curr.type === 'investment') acc.totalInvestment += curr.amount;
      if (curr.type === 'revenue') acc.totalRevenue += curr.amount;
      if (curr.type === 'expense') acc.totalExpense += curr.amount;

      const accId = curr.account?.toString();
      const toAccId = curr.toAccount?.toString();

      if (curr.type === 'revenue' || curr.type === 'investment') {
        if (accId && accountBalances[accId]) {
          accountBalances[accId].balance += curr.amount;
        }
      } else if (curr.type === 'expense' || curr.type === 'loan_disbursement') {
        // Expenses and loans paid out leave the account
        if (accId && accountBalances[accId]) {
          accountBalances[accId].balance -= curr.amount;
        }
      } else if (curr.type === 'loan_repayment') {
        // Loan repayments come back into the receiving account
        if (accId && accountBalances[accId]) {
          accountBalances[accId].balance += curr.amount;
        }
      } else if (curr.type === 'transfer') {
        if (accId && accountBalances[accId]) {
          accountBalances[accId].balance -= curr.amount;
        }
        if (toAccId && accountBalances[toAccId]) {
          accountBalances[toAccId].balance += curr.amount;
        }
      }

      return acc;
    }, { totalInvestment: 0, totalRevenue: 0, totalExpense: 0 });

    // netBalance = true Account Balance: sum of every account's running balance
    // (each account starts at 0 and is adjusted by all approved transactions)
    stats.netBalance = Object.values(accountBalances).reduce((sum, acc) => sum + acc.balance, 0);
    stats.accountBalances = Object.values(accountBalances);

    // Fetch total outstanding loans
    const EmployeeLoan = (await import('@/models/EmployeeLoan')).default;
    const activeLoans = await EmployeeLoan.find({ 
        companyId, 
        status: { $in: ['active', 'partially_repaid', 'overdue'] } 
    });
    stats.totalOutstandingLoans = activeLoans.reduce((sum, loan) => sum + loan.outstandingAmount, 0);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
