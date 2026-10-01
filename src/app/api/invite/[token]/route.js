import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invite from '@/models/Invite';
import User from '@/models/User';
import Company from '@/models/Company';
import jwt from 'jsonwebtoken';

// GET /api/invite/[token] — validate and return invite metadata
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { token } = await params;

    const invite = await Invite.findOne({ token, usedAt: null }).lean();

    if (!invite) {
      return NextResponse.json({ success: false, message: 'This invitation link is invalid or has already been used.' }, { status: 404 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ success: false, message: 'This invitation has expired. Please ask for a new one.' }, { status: 410 });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists.' }, { status: 409 });
    }

    const company = await Company.findById(invite.companyId).select('name').lean();

    const roleLabelMap = {
      admin: 'Administrator', ceo: 'Chief Executive Officer',
      cfo: 'Chief Financial Officer', csuit: 'Board Member', accountant: 'Accounts Manager',
    };

    return NextResponse.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        roleLabel: roleLabelMap[invite.role] || invite.role,
        companyName: company?.name || 'Arionys Finance',
        expiresAt: invite.expiresAt,
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/invite/[token] — complete registration
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { token } = await params;

    const invite = await Invite.findOne({ token, usedAt: null });

    if (!invite) {
      return NextResponse.json({ success: false, message: 'Invalid or already used invitation.' }, { status: 404 });
    }

    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ success: false, message: 'Invitation has expired.' }, { status: 410 });
    }

    const { name, password, phone, position } = await req.json();

    if (!name?.trim() || !password) {
      return NextResponse.json({ success: false, message: 'Name and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    // Ensure email not already taken (race condition guard)
    const existingUser = await User.findOne({ email: invite.email });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'An account with this email already exists.' }, { status: 409 });
    }

    // Create the user
    const user = await User.create({
      name: name.trim(),
      email: invite.email,
      password,               // hashed by pre-save hook
      phone: phone?.trim() || '',
      position: position?.trim() || '',
      role: invite.role,
      companyId: invite.companyId,
      isActive: true,
    });

    // Mark invite as used
    invite.usedAt = new Date();
    await invite.save();

    // If an Employee record exists for this email, link it!
    const Employee = (await import('@/models/Employee')).default;
    await Employee.findOneAndUpdate(
      { email: invite.email, companyId: invite.companyId },
      { $set: { userId: user._id, status: 'active' } }
    );

    // Issue a JWT so the user is logged in immediately
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token: jwtToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          isActive: user.isActive,
          phone: user.phone,
          position: user.position,
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
