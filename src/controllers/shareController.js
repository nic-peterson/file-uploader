const folderModel = require('../models/folderModel');
const sharedFolderModel = require('../models/sharedFolderModel');

const MAX_DAYS = 30;

const parseDays = (str) => {
  if (!str || !str.trim()) return null;
  const num = Number(str.trim());
  if (!Number.isFinite(num)) return null;
  const days = Math.round(num);
  if (days < 1 || days > MAX_DAYS) return null;
  return days;
};

const postShareFolder = async (req, res, next) => {
  try {
    const folder = await folderModel.getFolderById(req.params.id);

    if (!folder) {
      req.flash('error', 'Folder not found.');
      return res.redirect('/dashboard');
    }

    if (folder.userId !== req.user.id) {
      req.flash('error', 'You do not have permission to share this folder.');
      return res.redirect('/dashboard');
    }

    const days = parseDays(req.body.duration);
    if (!days) {
      req.flash('error', 'Please enter a whole number of days (1-30).');
      return res.redirect(`/folders/${folder.id}`);
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const share = await sharedFolderModel.createShare({ folderId: folder.id, expiresAt });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/share/${share.token}`;

    req.flash('success', `Share link (expires in ${days} day(s)): ${shareUrl}`);
    res.redirect(`/folders/${folder.id}`);
  } catch (err) {
    next(err);
  }
};

const getSharedFolder = async (req, res, next) => {
  try {
    const record = await sharedFolderModel.findByToken(req.params.token);

    if (!record || record.expiresAt < new Date()) {
      return res.status(404).render('share-expired');
    }

    res.render('share', {
      folder: record.folder,
      files: record.folder.files,
      expiresAt: record.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { postShareFolder, getSharedFolder, parseDays };
