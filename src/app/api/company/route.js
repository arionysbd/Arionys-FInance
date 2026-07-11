import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import { getAuthUser, unauthorized } from '@/lib/auth';

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

    // Only admin or owner can update company details
    if (!['admin', 'owner'].includes(authUser.role?.toLowerCase())) {
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
    const allowed = ['name', 'email', 'phone', 'website', 'industry', 'address'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = String(body[key]).trim();
      }
    }

    if (!updates.name) {
      return NextResponse.json({ success: false, message: 'Company name is required.' }, { status: 400 });
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
