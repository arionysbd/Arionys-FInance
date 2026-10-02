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
// Short-lived cache of signed-in users (per server instance). Access/status changes apply within a few seconds.
const AUTH_CACHE_MS = 5000;
const authCache = global.__authUserCache || (global.__authUserCache = new Map());

/** Drop a user from the auth cache right away (call after changing their access or status). */
export function invalidateAuthUser(userId) {
  authCache.delete(String(userId));
}

export async function getAuthUser(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // A page load fires several API calls at once; reuse the user lookup for a few seconds
    const cached = authCache.get(decoded.id);
    if (cached && cached.expires > Date.now()) return cached.user;

    await dbConnect();
    const user = await User.findById(decoded.id).select('-password -inviteToken').lean();
    // Revoked or not-yet-approved accounts keep a valid token but must not act on company data
    const result = !user || user.isActive === false ? null : user;
    authCache.set(decoded.id, { user: result, expires: Date.now() + AUTH_CACHE_MS });
    if (authCache.size > 500) authCache.delete(authCache.keys().next().value);
    return result;
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
