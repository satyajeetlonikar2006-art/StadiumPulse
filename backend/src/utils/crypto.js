const bcrypt = require('bcryptjs');
const uuid = require('uuid');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateId = () => uuid.v4();

module.exports = {
  hashPassword,
  comparePassword,
  generateId
};
