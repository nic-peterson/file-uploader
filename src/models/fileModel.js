const prisma = require('../config/prisma');

const createFile = async ({ name, type, size, url, userId }) => {
  return prisma.file.create({
    data: { name, type, size, url, userId },
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

module.exports = { createFile, getFilesByUser, getFileById, deleteFile };
