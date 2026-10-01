import EmployeeLoan from '@/models/EmployeeLoan';
import Employee from '@/models/Employee';
import Company from '@/models/Company';
import Account from '@/models/Account';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { sendEmail } from '@/lib/mail';

// Finds the signed-in user's own employee record, creating it for owners/admins who are not auto-synced
export async function getOrCreateOwnEmployee(authUser) {
  const companyId = authUser.companyId;
  let record = await Employee.findOne({
    companyId,
    $or: [{ userId: authUser._id }, { email: authUser.email?.toLowerCase() }],
  });
  if (!record) {
    record = await Employee.create({
      fullName: authUser.name || authUser.email,
      email: authUser.email.toLowerCase(),
      phone: authUser.phone || '',
      companyId,
      userId: authUser._id,
      createdBy: authUser._id,
      status: 'active',
    });
  }
  return record;
}

/**
 * Validates and saves a loan as 'pending_approval', then writes the audit log,
 * notification and employee email.
 * origin: 'request' (employee asked for themselves) | 'issued' (created from the Loans page)
 * Returns { loan } on success or { error, status } on validation failure.
 */
export async function submitLoan({ authUser, employeeId, paidFromAccount, amount, startDate, endDate, notes, origin }) {
  const companyId = authUser.companyId;
  const isRequest = origin === 'request';

  if (!amount || !startDate || !endDate) {
    return { error: 'Amount, start date, and end date are required.', status: 400 };
  }
  if (Number(amount) <= 0) {
    return { error: 'Loan amount must be greater than 0.', status: 400 };
  }

  const employee = await Employee.findOne({ _id: employeeId, companyId });
  if (!employee) {
    return { error: 'Employee not found.', status: 404 };
  }

  const company = await Company.findById(companyId);
  const currency = company?.currency || 'BDT';
  const policy = company?.loanPolicy || {};
  const maxAmount = policy.maxLoanAmount || Infinity;
  const maxMonths = policy.maxLoanPeriodMonths || Infinity;

  if (Number(amount) > maxAmount) {
    return { error: `Loan amount exceeds the company maximum of ${currency} ${maxAmount.toLocaleString()}.`, status: 400 };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) {
    return { error: 'End date must be after start date.', status: 400 };
  }
  const diffMonths = (end - start) / (1000 * 60 * 60 * 24 * 30.44);
  if (diffMonths > maxMonths) {
    return { error: `Loan end date exceeds the company's maximum permitted loan period of ${maxMonths} months.`, status: 400 };
  }

  // Source account is optional; approvers can choose it at disbursement
  if (paidFromAccount) {
    const account = await Account.findOne({ _id: paidFromAccount, companyId });
    if (!account) return { error: 'Account not found.', status: 404 };
  } else {
    paidFromAccount = undefined;
  }

  // Every loan waits in Pending Approvals, same as transactions
  const status = 'pending_approval';

  const loan = await EmployeeLoan.create({
    companyId,
    employeeId,
    employeeName: employee.fullName,
    employeeEmail: employee.email,
    amount: Number(amount),
    currency,
    paidFromAccount,
    startDate: start,
    endDate: end,
    status,
    outstandingAmount: Number(amount),
    totalRepaid: 0,
    notes,
    origin,
    createdBy: authUser._id,
  });

  const amountLabel = `${currency} ${Number(amount).toLocaleString()}`;

  await AuditLog.create({
    companyId,
    userId: authUser._id,
    actorName: authUser.name,
    action: isRequest ? 'requested_loan' : 'created_loan',
    entity: 'loan',
    entityId: loan._id,
    entityLabel: `${employee.fullName} — ${amountLabel}`,
    newValue: { amount, startDate, endDate, status },
  });

  await Notification.create({
    companyId,
    type: 'loan_created',
    title: isRequest ? 'New Loan Request' : 'New Employee Loan Created',
    message: isRequest
      ? `${employee.fullName} requested a loan of ${amountLabel}. Awaiting approval.`
      : `A loan of ${amountLabel} was created for ${employee.fullName}. Awaiting approval.`,
    relatedEntity: 'loan',
    relatedId: loan._id,
  });

  if (employee.email) {
    await sendEmail({
      to: employee.email,
      subject: isRequest ? 'Loan Request Submitted — Arionys Finance' : 'Employee Loan Created — Arionys Finance',
      html: loanCreatedEmailHtml({
        title: isRequest ? 'Loan Request Submitted' : 'Employee Loan Created',
        intro: isRequest
          ? 'Your loan request has been submitted and is awaiting approval. Here are the details:'
          : 'An employee loan has been created for you. Here are the details:',
        employeeName: employee.fullName,
        companyName: company?.name || '',
        amount: Number(amount),
        currency,
        startDate,
        endDate,
        status,
      }),
      text: isRequest
        ? `Dear ${employee.fullName}, your loan request of ${amountLabel} has been submitted. Status: ${status}.`
        : `Dear ${employee.fullName}, a loan of ${amountLabel} has been created for you. Status: ${status}.`,
    }).catch(console.error);
  }

  return { loan };
}

function loanCreatedEmailHtml({ title, intro, employeeName, companyName, amount, currency, startDate, endDate, status }) {
  const fmt = (v) => `${currency} ${Number(v).toLocaleString()}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 32px 24px;">
    <h1 style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">${title}</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">${companyName}</p>
  </div>
  <div style="padding: 24px;">
    <p style="color: #334155; margin-bottom: 16px;">Dear ${employeeName},</p>
    <p style="color: #64748b; margin-bottom: 24px;">${intro}</p>
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
