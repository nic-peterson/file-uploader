const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.NODE_ENV === 'test') {
    transporter = { sendMail: async () => ({ messageId: 'test-message-id' }) };
    return transporter;
  }

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.warn('No SMTP_HOST set — using Ethereal test account:', testAccount.user);
  }

  return transporter;
};

const sendMail = async ({ to, subject, html }) => {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || '"File Uploader" <noreply@example.com>',
    to,
    subject,
    html,
  });

  if (process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.warn(`Email preview: ${previewUrl}`);
    }
  }

  return info;
};

module.exports = { sendMail };
