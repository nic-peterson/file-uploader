const prisma = require('../config/prisma');

const createFile = async ({ name, type, size, url, userId, folderId }) => {
  return prisma.file.create({
    data: { name, type, size, url, userId, folderId: folderId || null },
  });
};

const getFilesByUser = async (userId) => {
  return prisma.file.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

const getFileById = async (id) => {
  return prisma.file.findUnique({ where: { id } });
};

const deleteFile = async (id) => {
  return prisma.file.delete({ where: { id } });
};

const getRootFiles = async (userId) => {
  return prisma.file.findMany({
    where: { userId, folderId: null },
    orderBy: { createdAt: 'desc' },
  });
};

const getFilesInFolder = async (folderId) => {
  return prisma.file.findMany({
    where: { folderId },
    orderBy: { createdAt: 'desc' },
  });
};

const moveFile = async (id, folderId) => {
  return prisma.file.update({ where: { id }, data: { folderId: folderId || null } });
};

module.exports = { createFile, getFilesByUser, getFileById, deleteFile, getRootFiles, getFilesInFolder, moveFile };
