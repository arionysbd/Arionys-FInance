require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testMail() {
  try {
    const response = await axios.post(process.env.MAIL_API_URL, {
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test email.',
      html: '<p>This is a test email.</p>',
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      }
    });
    console.log('Success:', response.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testMail();
