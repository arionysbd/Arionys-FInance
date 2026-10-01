// Route-based access control, shared by the server (API checks) and the client (sidebar, page guards).
//
// Every user has a list of page keys they may open. Opening a page also grants the actions on it,
// e.g. "Pending Approvals" lets a user approve/reject. Entries without an href are extra abilities,
// not pages: "Manage Employees" lets someone add/edit/delete employees and see their access.
// The company owner always has every page.

export const PERMISSIONS = [
  { key: 'dashboard',          label: 'Office Dashboard',    href: '/dashboard',               group: 'Overview',     description: 'Full office overview: all balances, revenue and transactions' },
  { key: 'personal_dashboard', label: 'Personal Dashboard',  href: '/my-dashboard',            group: 'Overview',     description: 'Only their own transactions and loans' },
  { key: 'create_transaction', label: 'Create Transaction',  href: '/transactions/create',     group: 'Transactions', description: 'Record new transactions (sent for approval)' },
  { key: 'pending_approvals',  label: 'Pending Approvals',   href: '/pending',                 group: 'Transactions', description: 'Approve or reject transactions and loans, and disburse loans' },
  { key: 'transactions',       label: 'Transaction History', href: '/transactions',            group: 'Transactions', description: 'View, import and export approved transactions' },
  { key: 'accounts',           label: 'Accounts',            href: '/accounts',                group: 'Finance',      description: 'View and manage bank accounts' },
  { key: 'loans',              label: 'Loans',               href: '/loans',                   group: 'Finance',      description: 'View all loans, create loans and record repayments' },
  { key: 'loan_request',       label: 'Request Loan',        href: '/loans/request',           group: 'Finance',      description: 'Request a loan for themselves' },
  { key: 'reports',            label: 'Financial Reports',   href: '/reports',                 group: 'Finance',      description: 'Revenue, expense and investment reports' },
  { key: 'employees',          label: 'Employees',           href: '/employees',               group: 'Organization', description: 'View the employee directory and profiles' },
  { key: 'business_admin',     label: 'Business Admin',      href: '/business-administration', group: 'Organization', description: 'Edit company details and settings' },
  { key: 'audit_log',          label: 'Audit Log',           href: '/audit-log',               group: 'Organization', description: 'View the history of all actions' },
  { key: 'manage_employees',   label: 'Manage Employees',    href: null,                       group: 'Organization', description: 'Add, edit and delete employees, and see their page access (needs Employees)' },
];

export const PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

// Pages every signed-in user can open regardless of their access list
export const ALWAYS_ALLOWED_PATHS = ['/settings'];

// Starting access for a new employee: their own dashboard, recording transactions and requesting loans
// (Profile Settings is always available)
export const DEFAULT_PERMISSIONS = ['personal_dashboard', 'create_transaction', 'loan_request'];

// Abilities that need a page to be useful: { ability: requiredPage }
export const PERMISSION_REQUIRES = { manage_employees: 'employees' };

/** Whether this user may see other people's page access (the company admin and employee managers). */
export const canSeeAccess = (user) => isOwner(user) || hasPermission(user, 'manage_employees');

// Only one dashboard type can be enabled at a time
export const EXCLUSIVE_PERMISSION_GROUPS = [['dashboard', 'personal_dashboard']];

// Access for accounts created before route-based access existed, derived from their old role
const LEGACY_ROLE_PERMISSIONS = {
  ceo: ['dashboard', 'create_transaction', 'pending_approvals', 'transactions', 'accounts', 'loans', 'loan_request', 'reports', 'employees', 'manage_employees'],
  cfo: ['dashboard', 'create_transaction', 'pending_approvals', 'transactions', 'accounts', 'loans', 'loan_request', 'reports', 'employees', 'manage_employees'],
  csuit: ['dashboard', 'create_transaction', 'transactions', 'accounts', 'loans', 'loan_request', 'reports'],
  accountant: ['dashboard', 'create_transaction', 'transactions', 'accounts', 'loans', 'loan_request'],
  viewer: ['personal_dashboard', 'loan_request'],
};

// The company owner account always has every page and can't be changed by others.
// Older companies were set up with an 'admin' account instead of 'owner', so it counts too.
export const isOwner = (user) => ['owner', 'admin'].includes(user?.role?.toLowerCase());

/** The page keys a user may open. */
export function getUserPermissions(user) {
  if (!user) return [];
  if (isOwner(user)) return PERMISSION_KEYS;
  if (Array.isArray(user.permissions)) return user.permissions.filter(k => PERMISSION_KEYS.includes(k));
  return LEGACY_ROLE_PERMISSIONS[user.role?.toLowerCase()] || [];
}

/** True when the user holds at least one of the given page keys. */
export function hasPermission(user, ...keys) {
  const granted = getUserPermissions(user);
  return keys.some(k => granted.includes(k));
}

/** Keeps only known keys, without duplicates. */
export function sanitizePermissions(list) {
  if (!Array.isArray(list)) return [];
  let keys = [...new Set(list.filter(k => PERMISSION_KEYS.includes(k)))];
  // Managing employees only makes sense with access to the Employees page
  for (const [ability, page] of Object.entries(PERMISSION_REQUIRES)) {
    if (keys.includes(ability) && !keys.includes(page)) keys = keys.filter(k => k !== ability);
  }
  // If both dashboard types slipped through, keep the full one
  for (const [primary, ...others] of EXCLUSIVE_PERMISSION_GROUPS) {
    if (keys.includes(primary)) keys = keys.filter(k => !others.includes(k));
  }
  return keys;
}

/** Whether a user may open the given URL path in the app. */
export function canAccessPath(user, pathname) {
  if (!user || !pathname) return false;
  if (ALWAYS_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return true;

  // Loan details: anyone with a loan page can open one; the API limits requesters to their own loans
  if (/^\/loans\/[^/]+$/.test(pathname) && pathname !== '/loans/request') {
    return hasPermission(user, 'loans', 'loan_request', 'pending_approvals');
  }
  // Employee profile pages belong to the Employees page
  if (pathname.startsWith('/employees/')) return hasPermission(user, 'employees');

  // Exact page match (longest href first so /loans/request wins over /loans)
  const match = PERMISSIONS
    .filter(p => p.href)
    .sort((a, b) => b.href.length - a.href.length)
    .find(p => pathname === p.href);
  return match ? hasPermission(user, match.key) : false;
}

/** First page the user may open, used after login and when they hit a page they cannot see. */
export function getHomePath(user) {
  const first = PERMISSIONS.find(p => p.href && hasPermission(user, p.key));
  return first ? first.href : '/settings';
}
