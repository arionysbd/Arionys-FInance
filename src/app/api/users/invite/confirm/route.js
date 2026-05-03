import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

// GET — verify that the token is valid (used by the frontend page)
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
    }

    const user = await User.findOne({
      inviteToken: token,
      inviteExpires: { $gt: new Date() }
    }).select('name email role');

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid or expired invitation link.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST — accept the invite: set password & activate account
export async function POST(req) {
  try {
    await dbConnect();
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, message: 'Token and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const user = await User.findOne({
      inviteToken: token,
      inviteExpires: { $gt: new Date() }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid or expired invitation link.' }, { status: 400 });
    }

    // Set the password, activate the account, and clear the invite token
    user.password = password;
    user.isActive = true;
    user.inviteToken = null;
    user.inviteExpires = null;
    await user.save(); // pre-save hook will hash the password

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully. You can now log in.'
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
