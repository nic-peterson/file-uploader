const express = require('express');
const isAuthenticated = require('../middleware/isAuthenticated');
const shareController = require('../controllers/shareController');

const router = express.Router();

router.post('/folders/:id/share', isAuthenticated, shareController.postShareFolder);
router.get('/share/:token', shareController.getSharedFolder);

module.exports = router;
