import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import { sendEmail } from '@/lib/mail';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') || 'approved';
    const type = searchParams.get('type');
    // Always scope to the caller's own company — never trust a client companyId
    const companyId = authUser.companyId;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (companyId) query.companyId = companyId;

    // Support comma separated status: status=approved,rejected
    if (statusParam.includes(',')) {
      query.status = { $in: statusParam.split(',') };
    } else {
      query.status = statusParam;
    }
    
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .populate('account', 'bankName')
      .populate('toAccount', 'bankName')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Transaction.countDocuments(query);
    const hasMore = total > skip + transactions.length;

    return NextResponse.json({ success: true, data: transactions, hasMore, total });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const body = await req.json();
    const { type, amount, description, performedBy, account, toAccount } = body;
    // Identity and company come from the verified token, not the request body
    const userId = authUser._id;
    const companyId = authUser.companyId;

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    if (!account) {
      return NextResponse.json({ success: false, message: 'Account selection is mandatory' }, { status: 400 });
    }

    if (type === 'transfer' && !toAccount) {
      return NextResponse.json({ success: false, message: 'Destination account is mandatory for transfers' }, { status: 400 });
    }

    if (type === 'transfer' && String(account) === String(toAccount)) {
      return NextResponse.json({ success: false, message: 'Source and destination accounts must be different' }, { status: 400 });
    }

    const transaction = await Transaction.create({
      type,
      amount,
      description,
      performedBy,
      createdBy: userId,
      companyId,
      account,
      toAccount: type === 'transfer' ? toAccount : undefined,
      status: 'pending' // Force pending on creation
    });

    await AuditLog.create({
      companyId,
      userId,
      actorName: authUser.name,
      action: 'created_transaction',
      entity: 'transaction',
      entityId: transaction._id,
      entityLabel: `${type.toUpperCase()} transaction of ${amount} created`,
      newValue: { type, amount, status: 'pending' },
      ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
      userAgent: req.headers.get('user-agent') || ''
    });

    // Notify CFOs
    try {
      const cfos = await User.find({ role: 'cfo', companyId });
      const creator = await User.findById(userId);
      
      for (const cfo of cfos) {
        await sendEmail({
          to: cfo.email,
          subject: 'Action Required: New Transaction Pending Approval',
          text: `A new ${type} of BDT ${amount} was recorded by ${creator.name}. Description: ${description}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 6px;">
              <h2 style="color: #2563eb;">New Transaction Recorded</h2>
              <p>A new transaction requires your approval:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${type.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">BDT ${amount.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Performed By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${performedBy}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Description:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${description}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Recorded By:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${creator.name}</td></tr>
              </table>
              <div style="margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/pending" 
                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Review Transaction
                </a>
              </div>
            </div>
          `
        });
      }
    } catch (mailError) {
      console.error('Failed to send admin notification:', mailError);
      // We don't fail the transaction if mail fails
    }

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
