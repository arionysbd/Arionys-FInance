import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Account from '@/models/Account';
import mongoose from 'mongoose';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function POST(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();
    if (!hasPermission(authUser, 'transactions')) return forbidden('You do not have access to import transactions.');

    const body = await req.json();
    const { transactions } = body;
    const companyId = authUser.companyId;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ success: false, message: 'Valid transactions array is required' }, { status: 400 });
    }

    // Imported records are added as new, pending transactions so they still go through approval.
    // Records that already exist (same _id in this company) are skipped, never overwritten.
    const ALLOWED_TYPES = ['revenue', 'expense', 'investment', 'transfer'];
    const companyAccounts = new Set((await Account.find({ companyId }).select('_id').lean()).map(a => String(a._id)));
    const existingIds = new Set(
      (await Transaction.find({ companyId, _id: { $in: transactions.map(t => t._id).filter(id => mongoose.isValidObjectId(id)) } })
        .select('_id').lean()).map(t => String(t._id))
    );

    const docs = [];
    let skipped = 0;
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const accountId = tx.account?._id || tx.account;
      const toAccountId = tx.toAccount?._id || tx.toAccount;
      const valid =
        ALLOWED_TYPES.includes(tx.type) &&
        amount > 0 &&
        companyAccounts.has(String(accountId)) &&
        (tx.type !== 'transfer' || (companyAccounts.has(String(toAccountId)) && String(toAccountId) !== String(accountId)));

      if (!valid || (tx._id && existingIds.has(String(tx._id)))) {
        skipped += 1;
        continue;
      }

      docs.push({
        type: tx.type,
        amount,
        description: tx.description || 'Imported transaction',
        performedBy: tx.performedBy || authUser.name,
        account: accountId,
        toAccount: tx.type === 'transfer' ? toAccountId : undefined,
        date: tx.date ? new Date(tx.date) : new Date(),
        companyId,
        createdBy: authUser._id,
        status: 'pending',
      });
    }

    if (docs.length) await Transaction.insertMany(docs);

    return NextResponse.json({
      success: true,
      message: `Imported ${docs.length} record${docs.length === 1 ? '' : 's'} as pending approval${skipped ? `, skipped ${skipped} existing or invalid` : ''}.`,
      stats: { inserted: docs.length, skipped }
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
