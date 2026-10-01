import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    if (!hasPermission(authUser, 'reports')) {
        return NextResponse.json({ success: false, message: 'Insufficient permissions for reports.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query = { companyId, status: 'approved' };
    
    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: end
      };
    } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query.createdAt = {
            $gte: thirtyDaysAgo,
            $lte: new Date()
        };
    }

    const transactions = await Transaction.find(query).sort({ createdAt: 1 }).lean();

    let totalRevenue = 0;
    let totalExpense = 0;
    let totalInvestment = 0;

    const chartData = {};

    transactions.forEach(tx => {
        if (tx.type === 'revenue') totalRevenue += tx.amount;
        else if (tx.type === 'expense') totalExpense += tx.amount;
        else if (tx.type === 'investment') totalInvestment += tx.amount;
        
        if (tx.type === 'transfer') return; // Ignore internal transfers for PnL

        const dateKey = new Date(tx.createdAt).toISOString().split('T')[0];
        if (!chartData[dateKey]) {
            chartData[dateKey] = { date: dateKey, revenue: 0, expense: 0, investment: 0 };
        }
        chartData[dateKey][tx.type] += tx.amount;
    });

    const netProfit = totalRevenue - totalExpense;
    const sortedChartData = Object.values(chartData).sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({ 
        success: true, 
        data: {
            metrics: {
                totalRevenue,
                totalExpense,
                totalInvestment,
                netProfit
            },
            chartData: sortedChartData,
            transactionsCount: transactions.length
        } 
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
