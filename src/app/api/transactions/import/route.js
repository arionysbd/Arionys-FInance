import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
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

    // Prepare bulk operations for upsert
    const bulkOps = transactions.map(tx => {
      // Ensure companyId is strictly enforced, regardless of what's in the JSON
      const txData = { ...tx, companyId };
      
      // If the record has an _id, use it for matching.
      // Scope the filter by companyId so an import can never overwrite
      // another company's transaction by supplying its _id.
      if (txData._id) {
        return {
          updateOne: {
            filter: { _id: txData._id, companyId },
            update: { $set: txData },
            upsert: true
          }
        };
      } else {
        return {
          insertOne: {
            document: txData
          }
        };
      }
    });

    const result = await Transaction.bulkWrite(bulkOps);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${transactions.length} records.`,
      stats: {
        inserted: result.upsertedCount + result.insertedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
