const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const SALT_ROUNDS = 12;

const findByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

const findById = async (id) => {
  return prisma.user.findUnique({ where: { id } });
};

const createUser = async ({ email, password, name }) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: { email, password: hashedPassword, name },
  });
};

const updateProfile = async (id, { name, email }) => {
  return prisma.user.update({ where: { id }, data: { name, email } });
};

const updatePassword = async (id, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  return prisma.user.update({ where: { id }, data: { password: hashedPassword } });
};

module.exports = { findByEmail, findById, createUser, updateProfile, updatePassword };
