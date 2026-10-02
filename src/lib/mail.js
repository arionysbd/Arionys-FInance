import nodemailer from 'nodemailer';
import { after } from 'next/server';

const transporterCache = global.__mailTransporter || (global.__mailTransporter = { key: null, transporter: null });

function getTransporter({ host, port, secure, user, pass }) {
  const key = `${host}:${port}:${secure}:${user}`;
  if (transporterCache.key !== key || !transporterCache.transporter) {
    transporterCache.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      pool: true,
      maxConnections: 3,
      auth: { user, pass },
    });
    transporterCache.key = key;
  }
  return transporterCache.transporter;
}

/**
 * Sends an email after the API response has been returned, so the person using the app never waits on SMTP.
 * Falls back to sending in the background when called outside a request.
 */
export function queueEmail(options) {
  const task = () => sendEmail(options).catch(err => console.error('Queued email failed:', err?.message));
  try {
    after(task);
  } catch {
    task();
  }
}

/**
 * Sends an email using Nodemailer.
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
export async function sendEmail({ to, subject, text, html }) {
  console.log('Attempting to send email to:', to);

  // We have two sets of configurations in .env.local: MAILTRAP and GMAIL. 
  // Let's use Gmail SMTP since Mailtrap transactional requires domain verification for arionys.com
  let host = process.env.SMTP_HOSTNAME || process.env.EMAIL_SERVER_HOST;
  let port = Number(process.env.SMTP_PORT) || Number(process.env.EMAIL_SERVER_PORT) || 587;
  let secure = process.env.SMTP_SECURE === 'true' || port === 465;
  
  // Try Gmail user first, if not try mailtrap user
  let user = process.env.MAIL_SMTP_USER || process.env.SMTP_USERNAME || process.env.EMAIL_SERVER_USER;
  let passRaw = process.env.SMTP_PASSWORD || process.env.EMAIL_SERVER_PASSWORD;
  let pass = passRaw ? passRaw.replace(/^"|"$/g, '') : undefined; // Strip quotes if present
  
  let from = process.env.EMAIL_FROM || 
             (process.env.SMTP_NAME && process.env.SMTP_USERNAME ? `"${process.env.SMTP_NAME}" <${process.env.SMTP_USERNAME}>` : process.env.SMTP_USERNAME) || 
             '"Arionys" <noreply@arionys.com>';

  if (!host || !user || !pass) {
    console.error('SMTP configuration missing in environment variables.');
    return { success: false, message: 'SMTP config missing' };
  }

  // One pooled SMTP connection is reused across emails instead of a new TLS handshake each time
  const transporter = getTransporter({ host, port, secure, user, pass });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('Error sending email via SMTP:', error.message);
    return { 
      success: false, 
      message: error.message 
    };
  }
}

