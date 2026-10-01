import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID not found on user' }, { status: 400 });
    }

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: company });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await dbConnect();

    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    // Only users with Business Admin access can update company details
    if (!hasPermission(authUser, 'business_admin')) {
      return NextResponse.json(
        { success: false, message: 'Only administrators can update company details.' },
        { status: 403 }
      );
    }

    const companyId = authUser.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID not found on user' }, { status: 400 });
    }

    const body = await req.json();

    // Whitelist only editable fields — ownerId is never changeable here
    const allowed = ['name', 'email', 'phone', 'website', 'industry', 'address', 'country', 'currency', 'timezone', 'businessType', 'logo', 'registrationNo', 'taxNo'];
    const arrayAllowed = ['departments', 'designations'];
    const objectAllowed = ['loanPolicy'];
    
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = String(body[key]).trim();
      }
    }
    for (const key of arrayAllowed) {
      if (Array.isArray(body[key])) {
        updates[key] = body[key];
      }
    }
    for (const key of objectAllowed) {
      if (typeof body[key] === 'object' && !Array.isArray(body[key])) {
        updates[key] = body[key];
      }
    }

    if (!updates.name && body.name !== undefined && body.name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Company name cannot be empty.' }, { status: 400 });
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: company, message: 'Company updated successfully.' });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
