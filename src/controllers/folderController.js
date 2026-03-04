const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');

const createFolder = async (req, res, next) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    req.flash('error', 'Folder name is required.');
    return res.redirect('/dashboard');
  }

  try {
    await folderModel.createFolder({ name: name.trim(), userId: req.user.id });
    req.flash('success', 'Folder created.');
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
};

const renameFolder = async (req, res, next) => {
  try {
    const folder = await folderModel.getFolderById(req.params.id);

    if (!folder) {
      req.flash('error', 'Folder not found.');
      return res.redirect('/dashboard');
    }

    if (folder.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to rename this folder.');
      return res.redirect('/dashboard');
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      req.flash('error', 'Folder name is required.');
      return res.redirect(req.get('Referrer') || '/dashboard');
    }

    await folderModel.updateFolder(req.params.id, { name: name.trim() });
    req.flash('success', 'Folder renamed.');
    res.redirect(req.get('Referrer') || '/dashboard');
  } catch (err) {
    next(err);
  }
};

const deleteFolder = async (req, res, next) => {
  try {
    const folder = await folderModel.getFolderById(req.params.id);

    if (!folder) {
      req.flash('error', 'Folder not found.');
      return res.redirect('/dashboard');
    }

    if (folder.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to delete this folder.');
      return res.redirect('/dashboard');
    }

    await folderModel.deleteFolder(req.params.id);
    req.flash('success', 'Folder deleted. Files moved to root.');
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
};

const viewFolder = async (req, res, next) => {
  try {
    const folder = await folderModel.getFolderById(req.params.id);

    if (!folder) {
      req.flash('error', 'Folder not found.');
      return res.redirect('/dashboard');
    }

    if (folder.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to view this folder.');
      return res.redirect('/dashboard');
    }

    const [files, allFolders] = await Promise.all([
      fileModel.getFilesInFolder(req.params.id),
      folderModel.getFoldersByUser(req.user.id),
    ]);

    res.render('folder', {
      user: req.user,
      folder,
      files,
      allFolders,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createFolder, renameFolder, deleteFolder, viewFolder };
