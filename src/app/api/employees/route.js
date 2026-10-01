import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Employee from '@/models/Employee';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/employees — list all employees for the authenticated user's company
export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company association required.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query = { companyId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/employees — create a new employee
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company association required.' }, { status: 400 });
    }

    // Only owners, admins, ceo can create employees
    const allowedRoles = ['owner', 'admin', 'ceo', 'cfo'];
    if (!allowedRoles.includes(authUser.role?.toLowerCase())) {
      return NextResponse.json({ success: false, message: 'Insufficient permissions to create employees.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      fullName, email, phone, employeeId, department,
      designation, joiningDate, notes, role = 'viewer',
      salary, loanLimit
    } = body;

    if (!fullName || !email) {
      return NextResponse.json({ success: false, message: 'Full name and email are required.' }, { status: 400 });
    }

    // Power check if adding role
    const ROLE_POWER = { owner: 6, admin: 5, ceo: 4, cfo: 3, csuit: 2, accountant: 1, viewer: 0 };
    const actorPower = ROLE_POWER[authUser.role?.toLowerCase()] ?? 0;
    const rolePower = ROLE_POWER[role] ?? 0;

    if (rolePower >= actorPower) {
      return NextResponse.json({ success: false, message: `Cannot assign role "${role}" as it equals or exceeds your authority.` }, { status: 403 });
    }

    const User = (await import('@/models/User')).default;
    const Invite = (await import('@/models/Invite')).default;
    const Company = (await import('@/models/Company')).default;
    const { sendEmail } = await import('@/lib/mail');
    const crypto = await import('crypto');

    let existingUser = await User.findOne({ email: email.toLowerCase() });
    let employeeStatus = existingUser ? 'active' : 'inactive';
    let assignedUserId = existingUser ? existingUser._id : null;

    const employee = await Employee.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      employeeId,
      department,
      designation,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      salary: Number(salary) || 0,
      loanLimit: Number(loanLimit) || 0,
      notes,
      companyId,
      createdBy: authUser._id,
      status: employeeStatus,
      userId: assignedUserId,
    });

    if (!existingUser) {
      // Create invite
      await Invite.deleteMany({ email: email.toLowerCase(), companyId });
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
      await Invite.create({ token, email: email.toLowerCase(), role, companyId, invitedBy: authUser._id, expiresAt });
      
      const company = await Company.findById(companyId).lean();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl?.origin || 'http://localhost:3000';
      const inviteUrl = `${appUrl}/invite/${token}`;

      await sendEmail({
        to: email,
        subject: `You've been invited to join ${company.name} on Arionys Finance`,
        text: `You have been added as an employee. Click to accept: ${inviteUrl}`,
        html: `<p>You have been added as an employee to <b>${company.name}</b>.</p><p><a href="${inviteUrl}">Click here to set up your account</a>.</p>`
      }).catch(err => console.error("Email failed:", err));
    }

    // Audit log
    await AuditLog.create({
      companyId,
      userId: authUser._id,
      actorName: authUser.name,
      action: 'created_employee',
      entity: 'employee',
      entityId: employee._id,
      entityLabel: `${fullName} (${email})`,
      newValue: { fullName, email, department, designation, role },
    });

    return NextResponse.json({ success: true, data: employee, message: existingUser ? 'Employee added.' : 'Employee added and invite sent.' }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'An employee with this email already exists in your company.' }, { status: 400 });
    }
    console.error('Employee creation error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
