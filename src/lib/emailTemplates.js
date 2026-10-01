// Transactional email templates. Table-based layout with inline styles so they render
// consistently in Gmail, Outlook and Apple Mail.

const LOGO_URL = 'https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'Asia/Dhaka', timeZoneName: 'short',
  });

/**
 * Invitation sent when someone is added to a company.
 * Returns { subject, html, text }.
 */
export function employeeInviteEmail({
  employeeName,
  companyName,
  inviterName,
  inviteUrl,
  designation,
  accessLabels = [],
  expiresAt,
}) {
  const name = escapeHtml(employeeName || 'there');
  const company = escapeHtml(companyName || 'your company');
  const inviter = escapeHtml(inviterName || 'Your administrator');
  const url = escapeHtml(inviteUrl);
  const expiry = expiresAt ? formatDateTime(expiresAt) : null;

  const detailRows = [
    ['Company', company],
    designation && ['Designation', escapeHtml(designation)],
    ['Invited by', inviter],
  ].filter(Boolean);

  const detailsHtml = detailRows.map(([label, value], i) => `
            <tr>
              <td style="padding: 12px 16px; font-size: 13px; color: #64748b; ${i ? 'border-top: 1px solid #eef2f6;' : ''}">${label}</td>
              <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; ${i ? 'border-top: 1px solid #eef2f6;' : ''}">${value}</td>
            </tr>`).join('');

  const accessHtml = accessLabels.length ? `
          <tr>
            <td style="padding: 0 40px 28px;">
              <p style="margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8;">Your access</p>
              <p style="margin: 0; font-size: 0; line-height: 0;">
                ${accessLabels.map(l => `<span style="display: inline-block; margin: 0 6px 6px 0; padding: 5px 10px; border-radius: 4px; background: #eef2ff; color: #4338ca; font-size: 12px; font-weight: 600; line-height: 1.4;">${escapeHtml(l)}</span>`).join('')}
              </p>
            </td>
          </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invitation to ${company}</title>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <span style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${inviter} invited you to join ${company} on Arionys Finance.</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">

          <tr>
            <td style="padding: 0 4px 20px;">
              <img src="${LOGO_URL}" alt="Arionys" width="120" style="display: block; height: auto; border: 0;" />
            </td>
          </tr>

          <tr>
            <td style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="height: 4px; background: #4f46e5; border-radius: 8px 8px 0 0; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>

                <tr>
                  <td style="padding: 36px 40px 8px;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #4f46e5;">Team invitation</p>
                    <h1 style="margin: 0 0 16px; font-size: 22px; line-height: 1.3; font-weight: 800; color: #0f172a;">You're invited to join ${company}</h1>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                      Hi ${name},<br /><br />
                      ${inviter} has added you to <strong style="color: #0f172a;">${company}</strong> on Arionys Finance.
                      Create your account to get started.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 40px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc;">
                      ${detailsHtml}
                    </table>
                  </td>
                </tr>
                ${accessHtml}
                <tr>
                  <td style="padding: 0 40px 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius: 6px; background: #4f46e5;">
                          <a href="${url}" style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 6px;">Set up your account</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 40px 32px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                      ${expiry ? `This invitation expires on <strong style="color: #334155;">${expiry}</strong>.` : 'This invitation expires in 72 hours.'}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 20px 40px; border-top: 1px solid #eef2f6;">
                    <p style="margin: 0 0 6px; font-size: 12px; color: #94a3b8;">Button not working? Copy this link into your browser:</p>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; word-break: break-all;"><a href="${url}" style="color: #4f46e5; text-decoration: none;">${url}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 4px 0; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #94a3b8;">If you weren't expecting this invitation, you can ignore this email.</p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">Arionys Finance · Secure financial management</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${employeeName || 'there'},`,
    '',
    `${inviterName || 'Your administrator'} has added you to ${companyName} on Arionys Finance.`,
    designation ? `Designation: ${designation}` : null,
    accessLabels.length ? `Your access: ${accessLabels.join(', ')}` : null,
    '',
    `Set up your account: ${inviteUrl}`,
    expiry ? `This invitation expires on ${expiry}.` : 'This invitation expires in 72 hours.',
    '',
    "If you weren't expecting this invitation, you can ignore this email.",
  ].filter(line => line !== null).join('\n');

  return {
    subject: `You're invited to join ${companyName} on Arionys Finance`,
    html,
    text,
  };
}
