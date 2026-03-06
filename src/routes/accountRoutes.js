const express = require('express');
const isAuthenticated = require('../middleware/isAuthenticated');
const accountController = require('../controllers/accountController');

const router = express.Router();

router.get('/account', isAuthenticated, accountController.getAccount);
router.post('/account/profile', isAuthenticated, accountController.updateProfile);
router.post('/account/password', isAuthenticated, accountController.updatePassword);

module.exports = router;
