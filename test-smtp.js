const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const mail = await import('./src/lib/mail.js');
  const result = await mail.sendEmail({
    to: 'test@example.com',
    subject: 'Test Subject',
    text: 'Test Body',
  });
  console.log(result);
}
test();
