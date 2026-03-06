const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');

const PAGE_SIZE = 20;

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

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [files, totalFiles, allFolders] = await Promise.all([
      fileModel.getFilesInFolder(req.params.id, { skip, take: PAGE_SIZE }),
      fileModel.countFilesInFolder(req.params.id),
      folderModel.getFoldersByUser(req.user.id),
    ]);

    const totalPages = Math.ceil(totalFiles / PAGE_SIZE);
    const pagination = { page, totalPages, total: totalFiles, pageSize: PAGE_SIZE };

    res.render('folder', {
      user: req.user,
      folder,
      files,
      allFolders,
      pagination,
      query: req.query,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createFolder, renameFolder, deleteFolder, viewFolder };
