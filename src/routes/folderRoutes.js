const express = require('express');
const isAuthenticated = require('../middleware/isAuthenticated');
const folderController = require('../controllers/folderController');

const router = express.Router();

router.get('/folders/:id', isAuthenticated, folderController.viewFolder);
router.post('/folders', isAuthenticated, folderController.createFolder);
router.post('/folders/:id/rename', isAuthenticated, folderController.renameFolder);
router.post('/folders/:id/delete', isAuthenticated, folderController.deleteFolder);

module.exports = router;
