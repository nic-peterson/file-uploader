const express = require('express');
const multer = require('multer');
const isAuthenticated = require('../middleware/isAuthenticated');
const fileController = require('../controllers/fileController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      req.flash('error', `Upload error: ${err.message}`);
      return res.redirect('/dashboard');
    }
    if (err) {
      return next(err);
    }
    next();
  });
};

router.get('/dashboard', isAuthenticated, fileController.getFiles);
router.post('/files/upload', isAuthenticated, handleUpload, fileController.uploadFile);
router.post('/files/:id/delete', isAuthenticated, fileController.deleteFile);

module.exports = router;
