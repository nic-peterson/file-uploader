const prisma = require('../config/prisma');

const createFolder = async ({ name, userId }) => {
  return prisma.folder.create({
    data: { name, userId },
  });
};

const getFoldersByUser = async (userId) => {
  return prisma.folder.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { files: true } } },
  });
};

const getFolderById = async (id) => {
  return prisma.folder.findUnique({ where: { id } });
};

const updateFolder = async (id, { name }) => {
  return prisma.folder.update({ where: { id }, data: { name } });
};

const deleteFolder = async (id) => {
  await prisma.file.updateMany({ where: { folderId: id }, data: { folderId: null } });
  return prisma.folder.delete({ where: { id } });
};

module.exports = { createFolder, getFoldersByUser, getFolderById, updateFolder, deleteFolder };
