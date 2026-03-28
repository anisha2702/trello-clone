const { pool } = require('../config/database');

async function getMembers(req, res) {
  try {
    const [members] = await pool.query(`SELECT * FROM members ORDER BY is_default DESC, name ASC`);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getDefaultMember(req, res) {
  try {
    const [[member]] = await pool.query(`SELECT * FROM members WHERE is_default = 1 LIMIT 1`);
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getMembers, getDefaultMember };
