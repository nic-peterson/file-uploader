const path = require('path');
const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');
const fileModel = require('../models/fileModel');
const folderModel = require('../models/folderModel');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

const PAGE_SIZE = 20;

const getFiles = async (req, res, next) => {
  try {
    const viewMode = req.query.view === 'flat' ? 'flat' : 'folder';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    if (viewMode === 'flat') {
      const [folders, allFiles] = await Promise.all([
        folderModel.getFoldersByUser(req.user.id),
        fileModel.getFilesByUser(req.user.id),
      ]);
      return res.render('dashboard', { user: req.user, folders, files: allFiles, rootFiles: [], viewMode, pagination: null, query: req.query });
    }

    const [folders, rootFiles, totalRootFiles] = await Promise.all([
      folderModel.getFoldersByUser(req.user.id),
      fileModel.getRootFiles(req.user.id, { skip, take: PAGE_SIZE }),
      fileModel.countRootFiles(req.user.id),
    ]);

    const totalPages = Math.ceil(totalRootFiles / PAGE_SIZE);
    const pagination = { page, totalPages, total: totalRootFiles, pageSize: PAGE_SIZE };

    res.render('dashboard', { user: req.user, folders, files: [], rootFiles, viewMode, pagination, query: req.query });
  } catch (err) {
    next(err);
  }
};

const uploadFile = async (req, res, next) => {
  if (!req.file) {
    req.flash('error', 'No file selected.');
    return res.redirect('/dashboard');
  }

  try {
    const storagePath = `${req.user.id}/${randomUUID()}-${path.basename(req.file.originalname)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (uploadError) {
      return next(uploadError);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    await fileModel.createFile({
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      url: urlData.publicUrl,
      userId: req.user.id,
      folderId: req.body.folderId || null,
    });

    req.flash('success', 'File uploaded successfully.');
    const dest = req.body.folderId ? `/folders/${req.body.folderId}` : '/dashboard';
    res.redirect(dest);
  } catch (err) {
    next(err);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const file = await fileModel.getFileById(req.params.id);

    if (!file) {
      req.flash('error', 'File not found.');
      return res.redirect('/dashboard');
    }

    if (file.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to delete this file.');
      return res.redirect('/dashboard');
    }

    const parsedUrl = new URL(file.url);
    const storagePath = parsedUrl.pathname.split(`/object/public/${BUCKET}/`)[1];

    const { error: removeError } = await supabase.storage.from(BUCKET).remove([storagePath]);

    if (removeError) {
      return next(removeError);
    }

    await fileModel.deleteFile(file.id);

    req.flash('success', 'File deleted successfully.');
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
};

const moveFile = async (req, res, next) => {
  try {
    const file = await fileModel.getFileById(req.params.id);

    if (!file) {
      req.flash('error', 'File not found.');
      return res.redirect('/dashboard');
    }

    if (file.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to move this file.');
      return res.redirect('/dashboard');
    }

    await fileModel.moveFile(req.params.id, req.body.folderId || null);
    req.flash('success', 'File moved.');
    res.redirect(req.get('Referrer') || '/dashboard');
  } catch (err) {
    next(err);
  }
};

const previewFile = async (req, res, next) => {
  try {
    const file = await fileModel.getFileById(req.params.id);

    if (!file) {
      req.flash('error', 'File not found.');
      return res.redirect('/dashboard');
    }

    if (file.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to preview this file.');
      return res.redirect('/dashboard');
    }

    const parsedUrl = new URL(file.url);
    const storagePath = parsedUrl.pathname.split(`/object/public/${BUCKET}/`)[1];

    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 300);

    if (signError) {
      return next(signError);
    }

    res.render('preview', { user: req.user, file, signedUrl: data.signedUrl });
  } catch (err) {
    next(err);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const file = await fileModel.getFileById(req.params.id);

    if (!file) {
      req.flash('error', 'File not found.');
      return res.redirect('/dashboard');
    }

    if (file.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to download this file.');
      return res.redirect('/dashboard');
    }

    const parsedUrl = new URL(file.url);
    const storagePath = parsedUrl.pathname.split(`/object/public/${BUCKET}/`)[1];

    const { data, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60);

    if (signError) {
      return next(signError);
    }

    res.redirect(data.signedUrl);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFiles, uploadFile, deleteFile, moveFile, downloadFile, previewFile };
