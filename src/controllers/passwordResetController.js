const crypto = require('crypto');
const userModel = require('../models/userModel');
const passwordResetModel = require('../models/passwordResetModel');
const { sendMail } = require('../config/mailer');

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const getForgotPassword = (req, res) => {
  res.render('forgot-password');
};

const postForgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    req.flash('error', 'Please enter your email address.');
    return res.redirect('/forgot-password');
  }

  try {
    const user = await userModel.findByEmail(email.trim().toLowerCase());

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
      await passwordResetModel.createToken(user.id, token, expiresAt);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const resetLink = `${baseUrl}/reset-password/${token}`;

      await sendMail({
        to: user.email,
        subject: 'Reset your File Uploader password',
        html: `
          <p>Hi ${user.name || user.email},</p>
          <p>You requested a password reset. Click the link below — it expires in 1 hour.</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
      });
    }

    // Always show the same message to prevent email enumeration
    req.flash('success', 'If that email is registered, a reset link has been sent.');
    res.redirect('/forgot-password');
  } catch (err) {
    next(err);
  }
};

const getResetPassword = async (req, res, next) => {
  try {
    const record = await passwordResetModel.findByToken(req.params.token);

    if (!record || record.expiresAt < new Date()) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect('/forgot-password');
    }

    res.render('reset-password', { token: req.params.token });
  } catch (err) {
    next(err);
  }
};

const postResetPassword = async (req, res, next) => {
  const { newPassword, confirmPassword } = req.body;
  const { token } = req.params;

  if (!newPassword || !confirmPassword) {
    req.flash('error', 'Please fill in all fields.');
    return res.redirect(`/reset-password/${token}`);
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect(`/reset-password/${token}`);
  }

  if (newPassword.length < 8) {
    req.flash('error', 'Password must be at least 8 characters.');
    return res.redirect(`/reset-password/${token}`);
  }

  try {
    const record = await passwordResetModel.findByToken(token);

    if (!record || record.expiresAt < new Date()) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect('/forgot-password');
    }

    await userModel.updatePassword(record.userId, newPassword);
    await passwordResetModel.deleteByToken(token);

    req.flash('success', 'Password updated. You can now log in.');
    res.redirect('/login');
  } catch (err) {
    next(err);
  }
};

module.exports = { getForgotPassword, postForgotPassword, getResetPassword, postResetPassword };
