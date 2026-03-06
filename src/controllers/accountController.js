const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

const getAccount = (req, res) => {
  res.render('account', { user: req.user });
};

const updateProfile = async (req, res, next) => {
  const { name, email } = req.body;

  if (!email || !email.trim()) {
    req.flash('error', 'Email is required.');
    return res.redirect('/account');
  }

  try {
    const existing = await userModel.findByEmail(email.trim());
    if (existing && existing.id !== req.user.id) {
      req.flash('error', 'That email is already in use.');
      return res.redirect('/account');
    }

    const updated = await userModel.updateProfile(req.user.id, {
      name: name ? name.trim() : null,
      email: email.trim(),
    });

    req.user.name = updated.name;
    req.user.email = updated.email;

    req.flash('success', 'Profile updated.');
    res.redirect('/account');
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    req.flash('error', 'All password fields are required.');
    return res.redirect('/account');
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'New passwords do not match.');
    return res.redirect('/account');
  }

  if (newPassword.length < 8) {
    req.flash('error', 'New password must be at least 8 characters.');
    return res.redirect('/account');
  }

  try {
    const user = await userModel.findById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/account');
    }

    await userModel.updatePassword(req.user.id, newPassword);
    req.flash('success', 'Password changed.');
    res.redirect('/account');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAccount, updateProfile, updatePassword };
