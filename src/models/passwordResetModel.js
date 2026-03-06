const prisma = require('../config/prisma');

const createToken = async (userId, token, expiresAt) => {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  return prisma.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });
};

const findByToken = async (token) => {
  return prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });
};

const deleteByToken = async (token) => {
  return prisma.passwordResetToken.delete({ where: { token } });
};

module.exports = { createToken, findByToken, deleteByToken };
