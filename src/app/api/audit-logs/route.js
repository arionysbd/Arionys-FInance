import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(req);
    if (!authUser) return unauthorized();

    const companyId = authUser.companyId;
    if (!companyId) return NextResponse.json({ success: false, message: 'Company required.' }, { status: 400 });

    // Only owners and admins can view audit logs
    if (!hasPermission(authUser, 'audit_log')) {
        return NextResponse.json({ success: false, message: 'Insufficient permissions to view audit logs.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const skip = (page - 1) * limit;
    
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');

    const query = { companyId };
    // Stored actions look like "created_transaction"; the filter picks the verb, so match by prefix
    if (action) query.action = { $regex: `^${action.replace(/[^a-z_]/gi, '')}` };
    if (entity) query.entity = entity;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await AuditLog.countDocuments(query);
    const hasMore = total > skip + logs.length;

    return NextResponse.json({ success: true, data: logs, total, hasMore });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
