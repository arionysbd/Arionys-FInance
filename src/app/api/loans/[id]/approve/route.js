import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmployeeLoan from '@/models/EmployeeLoan';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { getAuthUser, unauthorized } from '@/lib/auth';

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const allowedRoles = ['owner', 'admin', 'ceo', 'cfo'];
    if (!allowedRoles.includes(authUser.role?.toLowerCase())) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions to approve loans.' }, { status: 403 });
    }

    const { id } = await params;
    const loan = await EmployeeLoan.findOne({ _id: id, companyId: authUser.companyId });
    
    if (!loan) {
      return NextResponse.json({ success: false, message: 'Loan not found.' }, { status: 404 });
    }

    if (loan.status !== 'pending_approval') {
      return NextResponse.json({ success: false, message: `Cannot review loan in '${loan.status}' status.` }, { status: 400 });
    }

    // A loan request must be reviewed by someone other than the person who submitted it
    if (String(loan.createdBy) === String(authUser._id)) {
      return NextResponse.json({ success: false, message: 'You cannot approve or reject a loan you submitted.' }, { status: 403 });
    }

    const { status = 'approved' } = await req.json().catch(() => ({}));
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Status must be approved or rejected.' }, { status: 400 });
    }

    if (status === 'rejected') {
      loan.status = 'rejected';
      loan.rejectedBy = authUser._id;
      loan.rejectedAt = new Date();
      loan.outstandingAmount = 0;
      await loan.save();

      await AuditLog.create({
        companyId: authUser.companyId,
        userId: authUser._id,
        actorName: authUser.name,
        action: 'rejected_loan',
        entity: 'loan',
        entityId: loan._id,
        entityLabel: `Loan for ${loan.employeeName}`,
        oldValue: { status: 'pending_approval' },
        newValue: { status: 'rejected', rejectedBy: authUser._id },
      });

      await Notification.create({
        companyId: authUser.companyId,
        type: 'loan_rejected',
        title: 'Employee Loan Rejected',
        message: `A loan request for ${loan.employeeName} was rejected by ${authUser.name}.`,
        relatedEntity: 'loan',
        relatedId: loan._id,
      });

      return NextResponse.json({ success: true, data: loan });
    }

    loan.status = 'approved';
    loan.approvedBy = authUser._id;
    loan.approvedAt = new Date();
    await loan.save();

    await AuditLog.create({
      companyId: authUser.companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: 'approved_loan',
      entity: 'loan',
      entityId: loan._id,
      entityLabel: `Loan for ${loan.employeeName}`,
      oldValue: { status: 'pending_approval' },
      newValue: { status: 'approved', approvedBy: authUser._id },
    });

    await Notification.create({
      companyId: authUser.companyId,
      type: 'loan_approved',
      title: 'Employee Loan Approved',
      message: `A loan for ${loan.employeeName} has been approved and is ready for disbursement.`,
      relatedEntity: 'loan',
      relatedId: loan._id,
    });

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
