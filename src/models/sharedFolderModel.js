const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');

const createShare = async ({ folderId, expiresAt }) => {
  return prisma.sharedFolder.create({
    data: { token: randomUUID(), folderId, expiresAt },
  });
};

const findByToken = async (token) => {
  return prisma.sharedFolder.findUnique({
    where: { token },
    include: {
      folder: {
        include: { files: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });
};

const deleteByFolderId = async (folderId) => {
  return prisma.sharedFolder.deleteMany({ where: { folderId } });
};

module.exports = { createShare, findByToken, deleteByFolderId };
