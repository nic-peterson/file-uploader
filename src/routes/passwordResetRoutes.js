const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');

router.get('/forgot-password', passwordResetController.getForgotPassword);
router.post('/forgot-password', passwordResetController.postForgotPassword);
router.get('/reset-password/:token', passwordResetController.getResetPassword);
router.post('/reset-password/:token', passwordResetController.postResetPassword);

module.exports = router;
