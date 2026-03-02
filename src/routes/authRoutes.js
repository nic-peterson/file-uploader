const express = require('express');
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const isAuthenticated = require('../middleware/isAuthenticated');

const router = express.Router();

router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);

router.get('/login', authController.getLogin);
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;
