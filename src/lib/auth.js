import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';

/**
 * Verifies the Bearer token on an incoming request and returns the
 * authenticated user document (without the password field).
 *
 * Returns null when the token is missing, malformed, expired, or the
 * referenced user no longer exists. Routes MUST derive companyId / identity
 * from the returned user — never trust companyId/userId sent by the client.
 *
 * @param {Request} req
 * @returns {Promise<import('mongoose').Document | null>}
 */
export async function getAuthUser(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await dbConnect();
    const user = await User.findById(decoded.id).select('-password');
    // Revoked or not-yet-approved accounts keep a valid token but must not act on company data
    if (!user || user.isActive === false) return null;
    return user;
  } catch {
    return null;
  }
}

/** Standard 401 response for unauthenticated requests. */
export function unauthorized() {
  return NextResponse.json(
    { success: false, message: 'Authentication required.' },
    { status: 401 }
  );
}

/** Standard 403 response for users without access to a page/action. */
export function forbidden(message = 'You do not have access to this action.') {
  return NextResponse.json({ success: false, message }, { status: 403 });
}
