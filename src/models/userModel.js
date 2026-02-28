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

module.exports = { findByEmail, findById, createUser };
