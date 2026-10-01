import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import Employee from '@/models/Employee';
import Company from '@/models/Company';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { sendEmail } from '@/lib/mail';
import mongoose from 'mongoose';

// GET /api/loans
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const search = searchParams.get('search');

    const query = { companyId };
    
    // Role-based restrictions
    const ROLE_POWER = { owner: 6, admin: 5, ceo: 4, cfo: 3, csuit: 2, accountant: 1, viewer: 0 };
    const power = ROLE_POWER[authUser.role?.toLowerCase()] ?? 0;
    if (power === 0) {
      const empRecord = await Employee.findOne({ userId: authUser._id }).lean();
      if (!empRecord) {
        return NextResponse.json({ success: true, data: [] });
      }
      query.employeeId = empRecord._id;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    if (status) {
      // Support comma-separated status values
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const loans = await EmployeeLoan.find(query)
      .populate('employeeId', 'fullName email department designation')
      .populate('paidFromAccount', 'bankName accountType')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: loans });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/loans — create a new employee loan
export async function POST(req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    let body = await req.json();
    let { employeeId, paidFromAccount, amount, startDate, endDate, notes, type = 'request' } = body;

    if (!['request', 'create'].includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid loan type.' }, { status: 400 });
    }

    // Loan request: any member, always for themselves.
    // Create loan: only CEO, CFO and Admin (and the Owner above them), for a chosen employee.
    const isSelfRequest = type === 'request';
    const LOAN_CREATOR_ROLES = ['owner', 'admin', 'ceo', 'cfo'];

    if (!isSelfRequest && !LOAN_CREATOR_ROLES.includes(authUser.role?.toLowerCase())) {
      return NextResponse.json({ success: false, message: 'Only CEO, CFO or Admin can create loans. Please submit a loan request instead.' }, { status: 403 });
    }

    if (isSelfRequest) {
      // Requesters never choose the source account; approvers pick it at disbursement
      paidFromAccount = undefined;
      if (!notes?.trim()) {
        return NextResponse.json({ success: false, message: 'Please provide a reason for the loan request.' }, { status: 400 });
      }

      let ownRecord = await Employee.findOne({
        companyId,
        $or: [{ userId: authUser._id }, { email: authUser.email?.toLowerCase() }],
      });
      // Owners/admins are not auto-synced into the directory, so create their record on first request
      if (!ownRecord) {
        ownRecord = await Employee.create({
          fullName: authUser.name || authUser.email,
          email: authUser.email.toLowerCase(),
          phone: authUser.phone || '',
          companyId,
          userId: authUser._id,
          createdBy: authUser._id,
          status: 'active',
        });
      }
      employeeId = ownRecord._id;
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, message: 'Please select an employee.' }, { status: 400 });
    }

    if (!amount || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Amount, start date, and end date are required.' }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: 'Loan amount must be greater than 0.' }, { status: 400 });
    }

    // Validate the employee belongs to this company
    const employee = await Employee.findOne({ _id: employeeId, companyId });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found.' }, { status: 404 });
    }

    // Fetch company to check loan policy
    const company = await Company.findById(companyId);
    const policy = company?.loanPolicy || {};
    const maxAmount = policy.maxLoanAmount || Infinity;
    const maxMonths = policy.maxLoanPeriodMonths || Infinity;

    // Validate against loan policy
    if (Number(amount) > maxAmount) {
      return NextResponse.json({
        success: false,
        message: `Loan amount exceeds the company maximum of ${company.currency || 'BDT'} ${maxAmount.toLocaleString()}.`
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);

    if (end <= start) {
      return NextResponse.json({ success: false, message: 'End date must be after start date.' }, { status: 400 });
    }

    if (diffMonths > maxMonths) {
      return NextResponse.json({
        success: false,
        message: `Loan end date exceeds the company's maximum permitted loan period of ${maxMonths} months.`
      }, { status: 400 });
    }

    // Source account is optional at request time; it can be chosen when the loan is disbursed
    if (paidFromAccount) {
      const account = await Account.findOne({ _id: paidFromAccount, companyId });
      if (!account) {
        return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });
      }
    } else {
      paidFromAccount = undefined;
    }

    // Every loan waits in Pending Approvals, same as transactions
    const initialStatus = 'pending_approval';

    const loan = await EmployeeLoan.create([{
      companyId,
      employeeId,
      employeeName: employee.fullName,
      employeeEmail: employee.email,
      amount: Number(amount),
      currency: company?.currency || 'BDT',
      paidFromAccount,
      startDate: start,
      endDate: end,
      status: initialStatus,
      outstandingAmount: Number(amount),
      totalRepaid: 0,
      notes,
      origin: isSelfRequest ? 'request' : 'issued',
      createdBy: authUser._id,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Audit log (outside session)
    await AuditLog.create({
      companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: isSelfRequest ? 'requested_loan' : 'created_loan',
      entity: 'loan',
      entityId: loan[0]._id,
      entityLabel: `${employee.fullName} — ${company?.currency || 'BDT'} ${Number(amount).toLocaleString()}`,
      newValue: { amount, startDate, endDate, status: initialStatus },
    });

    // In-app notification
    await Notification.create({
      companyId,
      type: 'loan_created',
      title: isSelfRequest ? 'New Loan Request' : 'New Employee Loan Created',
      message: isSelfRequest
        ? `${employee.fullName} requested a loan of ${company?.currency || 'BDT'} ${Number(amount).toLocaleString()}. Awaiting approval.`
        : `A loan of ${company?.currency || 'BDT'} ${Number(amount).toLocaleString()} was created for ${employee.fullName}. Awaiting approval.`,
      relatedEntity: 'loan',
      relatedId: loan[0]._id,
    });

    // Email the employee
    if (employee.email) {
      await sendEmail({
        to: employee.email,
        subject: 'Employee Loan Created — Arionys Finance',
        html: loanCreatedEmailHtml({
          employeeName: employee.fullName,
          companyName: company.name,
          amount: Number(amount),
          currency: company?.currency || 'BDT',
          startDate,
          endDate,
          status: initialStatus,
        }),
        text: `Dear ${employee.fullName}, a loan of ${company?.currency || 'BDT'} ${Number(amount).toLocaleString()} has been created for you. Status: ${initialStatus}.`,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, data: loan[0] }, { status: 201 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

function loanCreatedEmailHtml({ employeeName, companyName, amount, currency, startDate, endDate, status }) {
  const fmt = (v) => `${currency} ${Number(v).toLocaleString()}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px 24px;">
    <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">Employee Loan Created</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">${companyName}</p>
  </div>
  <div style="padding: 24px;">
    <p style="color: #334155; margin-bottom: 16px;">Dear ${employeeName},</p>
    <p style="color: #64748b; margin-bottom: 24px;">An employee loan has been created for you. Here are the details:</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; font-weight: 600;">Loan Amount</td><td style="padding: 10px 0; color: #0f172a; font-weight: 700; text-align: right;">${fmt(amount)}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; font-weight: 600;">Start Date</td><td style="padding: 10px 0; color: #0f172a; text-align: right;">${fmtDate(startDate)}</td></tr>
      <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; font-weight: 600;">End Date</td><td style="padding: 10px 0; color: #0f172a; text-align: right;">${fmtDate(endDate)}</td></tr>
      <tr><td style="padding: 10px 0; color: #64748b; font-weight: 600;">Status</td><td style="padding: 10px 0; text-align: right;"><span style="background: #eff6ff; color: #2563eb; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${status.replace(/_/g, ' ')}</span></td></tr>
    </table>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Please contact your finance team if you have any questions.</p>
  </div>
  <div style="background: #f8faff; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Arionys Finance — Secure Financial Management</p>
  </div>
</div>`;
}
