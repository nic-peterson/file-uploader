const userModel = require('../models/userModel');

const getSignup = (req, res) => {
  res.render('signup');
};

const postSignup = async (req, res, next) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/signup');
  }

  try {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      req.flash('error', 'An account with that email already exists.');
      return res.redirect('/signup');
    }

    const user = await userModel.createUser({ email, password, name: name || null });

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/dashboard');
    });
  } catch (err) {
    return next(err);
  }
};

const getLogin = (req, res) => {
  res.render('login');
};

const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success', 'You have been logged out.');
    res.redirect('/login');
  });
};

module.exports = { getSignup, postSignup, getLogin, logout };
