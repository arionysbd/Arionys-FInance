import axios from 'axios';

const MAIL_API_URL = process.env.MAIL_API_URL;
const MAIL_API_TOKEN = process.env.MAIL_API_TOKEN;

/**
 * Sends an email using the custom Mail API.
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!MAIL_API_URL || !MAIL_API_TOKEN) {
    console.error('Mail API configuration missing in environment variables.');
    return { success: false, message: 'Mail config missing' };
  }

  try {
    const response = await axios.post(MAIL_API_URL, {
      to,
      subject,
      text,
      html,
    }, {
      headers: {
        'Authorization': `Bearer ${MAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message 
    };
  }
}
