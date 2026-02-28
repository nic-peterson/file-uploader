const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to access that page.');
  res.redirect('/login');
};

module.exports = isAuthenticated;
