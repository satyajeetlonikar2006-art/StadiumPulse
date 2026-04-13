const db = require('../config/database');

class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; }
}

exports.getAll = async (role, limit = 50, offset = 0) => {
  let query = 'SELECT id, name, email, role, seat, language, accessibility, created_at, last_login FROM users';
  const params = [];
  
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));
  
  const users = db.getDb().prepare(query).all(...params);
  
  let totalQuery = 'SELECT count(*) as cnt FROM users';
  if (role) totalQuery += ' WHERE role = ?';
  const total = db.getDb().prepare(totalQuery).get(role ? [role] : []).cnt;
  
  return { users, total };
};

exports.getById = async (id) => {
  const user = db.getDb().prepare('SELECT id, name, email, role, seat, language, accessibility, created_at, last_login FROM users WHERE id = ?').get(id);
  if (!user) throw new NotFoundError('User not found');
  return { user };
};

exports.updateRole = async (id, role) => {
  const info = db.getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (info.changes === 0) throw new NotFoundError('User not found');
  return this.getById(id);
};
