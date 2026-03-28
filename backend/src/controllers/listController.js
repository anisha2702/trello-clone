const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function createList(req, res) {
  try {
    const { board_id, title } = req.body;
    if (!board_id || !title) return res.status(400).json({ error: 'board_id and title required' });

    const [[{ maxPos }]] = await pool.query(
      `SELECT COALESCE(MAX(position), 0) as maxPos FROM lists WHERE board_id = ?`, [board_id]);
    const id = uuidv4();
    await pool.query(`INSERT INTO lists (id,board_id,title,position) VALUES (?,?,?,?)`,
      [id, board_id, title, maxPos + 1000]);
    const [[list]] = await pool.query(`SELECT * FROM lists WHERE id = ?`, [id]);
    res.status(201).json({ ...list, cards: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateList(req, res) {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    await pool.query(`UPDATE lists SET title = ? WHERE id = ?`, [title, id]);
    const [[list]] = await pool.query(`SELECT * FROM lists WHERE id = ?`, [id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteList(req, res) {
  try {
    await pool.query(`UPDATE lists SET is_archived = 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Reorder lists within a board
async function reorderLists(req, res) {
  try {
    const { lists } = req.body; // [{ id, position }]
    if (!Array.isArray(lists)) return res.status(400).json({ error: 'lists array required' });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const { id, position } of lists) {
        await conn.query(`UPDATE lists SET position = ? WHERE id = ?`, [position, id]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createList, updateList, deleteList, reorderLists };
