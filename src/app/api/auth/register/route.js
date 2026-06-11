import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/mail';

// Reference the same global OTP store used by send-otp
const otpStore = global.__otpStore || (global.__otpStore = new Map());

export async function POST(req) {
  try {
    await dbConnect();
    const { name, email, password, otp, companyName } = await req.json();

    // --- OTP Verification ---
    const stored = otpStore.get(email);
    if (!stored) {
      return NextResponse.json({ success: false, message: 'No verification code found. Please request a new one.' }, { status: 400 });
    }
    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return NextResponse.json({ success: false, message: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }
    if (stored.code !== otp) {
      return NextResponse.json({ success: false, message: 'Invalid verification code.' }, { status: 400 });
    }
    // OTP is valid — clear it
    otpStore.delete(email);

    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json({ success: false, message: 'User already exists' }, { status: 400 });
    }

    if (!companyName) {
      return NextResponse.json({ success: false, message: 'Company name is required' }, { status: 400 });
    }

    // Since this is a new signup, they create a new company
    const mongoose = require('mongoose');
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    const newCompany = await Company.create({
      _id: companyId,
      name: companyName,
      ownerId: userId,
    });

    const user = await User.create({
      _id: userId,
      name,
      email,
      password,
      role: 'owner',
      isActive: true,
      companyId: companyId,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        token
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
