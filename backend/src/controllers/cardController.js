const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function getCard(req, res) {
  try {
    const { id } = req.params;
    const [[card]] = await pool.query(`SELECT * FROM cards WHERE id = ?`, [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const [labels]    = await pool.query(`SELECT l.* FROM card_labels cl JOIN labels l ON cl.label_id = l.id WHERE cl.card_id = ?`, [id]);
    const [members]   = await pool.query(`SELECT m.* FROM card_members cm JOIN members m ON cm.member_id = m.id WHERE cm.card_id = ?`, [id]);
    const [checklists]= await pool.query(`SELECT * FROM checklists WHERE card_id = ? ORDER BY position`, [id]);
    for (const cl of checklists) {
      const [items] = await pool.query(`SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY position`, [cl.id]);
      cl.items = items;
    }
    const [comments]  = await pool.query(`
      SELECT c.*, m.name as member_name, m.initials, m.avatar_color
      FROM comments c JOIN members m ON c.member_id = m.id
      WHERE c.card_id = ? ORDER BY c.created_at DESC
    `, [id]);
    const [attachments] = await pool.query(`
      SELECT a.*, m.name as member_name FROM attachments a
      JOIN members m ON a.member_id = m.id WHERE a.card_id = ?
      ORDER BY a.created_at DESC
    `, [id]);

    res.json({ ...card, labels, members, checklists, comments, attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createCard(req, res) {
  try {
    const { list_id, board_id, title } = req.body;
    if (!list_id || !board_id || !title) return res.status(400).json({ error: 'list_id, board_id, title required' });

    const [[{ maxPos }]] = await pool.query(
      `SELECT COALESCE(MAX(position), 0) as maxPos FROM cards WHERE list_id = ?`, [list_id]);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO cards (id,list_id,board_id,title,position) VALUES (?,?,?,?,?)`,
      [id, list_id, board_id, title, maxPos + 1000]
    );
    const [[card]] = await pool.query(`SELECT * FROM cards WHERE id = ?`, [id]);
    await logActivity(board_id, id, 'create_card', { title });
    res.status(201).json({ ...card, labels: [], members: [], checklists: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateCard(req, res) {
  try {
    const { id } = req.params;
    const { title, description, due_date, due_complete, cover_color, is_archived } = req.body;
    const fields = [], vals = [];
    if (title !== undefined)        { fields.push('title = ?');        vals.push(title); }
    if (description !== undefined)  { fields.push('description = ?');  vals.push(description); }
    if (due_date !== undefined)     { fields.push('due_date = ?');     vals.push(due_date || null); }
    if (due_complete !== undefined) { fields.push('due_complete = ?'); vals.push(due_complete ? 1 : 0); }
    if (cover_color !== undefined)  { fields.push('cover_color = ?');  vals.push(cover_color); }
    if (is_archived !== undefined)  { fields.push('is_archived = ?');  vals.push(is_archived ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(id);
    await pool.query(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`, vals);
    const [[card]] = await pool.query(`SELECT * FROM cards WHERE id = ?`, [id]);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteCard(req, res) {
  try {
    await pool.query(`UPDATE cards SET is_archived = 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Move / reorder cards
async function moveCard(req, res) {
  try {
    const { id } = req.params;
    const { list_id, position } = req.body;
    const [[card]] = await pool.query(`SELECT * FROM cards WHERE id = ?`, [id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    await pool.query(`UPDATE cards SET list_id = ?, position = ? WHERE id = ?`, [list_id || card.list_id, position, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function reorderCards(req, res) {
  try {
    const { cards } = req.body; // [{ id, list_id, position }]
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const { id, list_id, position } of cards) {
        await conn.query(`UPDATE cards SET list_id = ?, position = ? WHERE id = ?`, [list_id, position, id]);
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Labels
async function addLabel(req, res) {
  try {
    const { id } = req.params;
    const { label_id } = req.body;
    await pool.query(`INSERT IGNORE INTO card_labels (card_id,label_id) VALUES (?,?)`, [id, label_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function removeLabel(req, res) {
  try {
    await pool.query(`DELETE FROM card_labels WHERE card_id = ? AND label_id = ?`, [req.params.id, req.params.labelId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Members
async function addMember(req, res) {
  try {
    const { id } = req.params;
    const { member_id } = req.body;
    await pool.query(`INSERT IGNORE INTO card_members (card_id,member_id) VALUES (?,?)`, [id, member_id]);
    const [[member]] = await pool.query(`SELECT * FROM members WHERE id = ?`, [member_id]);
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function removeMember(req, res) {
  try {
    await pool.query(`DELETE FROM card_members WHERE card_id = ? AND member_id = ?`, [req.params.id, req.params.memberId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Checklists
async function addChecklist(req, res) {
  try {
    const { id } = req.params;
    const { title = 'Checklist' } = req.body;
    const [[{ maxPos }]] = await pool.query(`SELECT COALESCE(MAX(position),0) as maxPos FROM checklists WHERE card_id = ?`, [id]);
    const clId = uuidv4();
    await pool.query(`INSERT INTO checklists (id,card_id,title,position) VALUES (?,?,?,?)`, [clId, id, title, maxPos + 1]);
    const [[cl]] = await pool.query(`SELECT * FROM checklists WHERE id = ?`, [clId]);
    res.json({ ...cl, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function deleteChecklist(req, res) {
  try {
    await pool.query(`DELETE FROM checklists WHERE id = ?`, [req.params.checklistId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function addChecklistItem(req, res) {
  try {
    const { checklistId } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const [[{ maxPos }]] = await pool.query(`SELECT COALESCE(MAX(position),0) as maxPos FROM checklist_items WHERE checklist_id = ?`, [checklistId]);
    const itemId = uuidv4();
    await pool.query(`INSERT INTO checklist_items (id,checklist_id,title,position) VALUES (?,?,?,?)`, [itemId, checklistId, title, maxPos + 1]);
    const [[item]] = await pool.query(`SELECT * FROM checklist_items WHERE id = ?`, [itemId]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function updateChecklistItem(req, res) {
  try {
    const { itemId } = req.params;
    const { title, is_complete } = req.body;
    const fields = [], vals = [];
    if (title !== undefined)       { fields.push('title = ?');       vals.push(title); }
    if (is_complete !== undefined) { fields.push('is_complete = ?'); vals.push(is_complete ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(itemId);
    await pool.query(`UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`, vals);
    const [[item]] = await pool.query(`SELECT * FROM checklist_items WHERE id = ?`, [itemId]);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function deleteChecklistItem(req, res) {
  try {
    await pool.query(`DELETE FROM checklist_items WHERE id = ?`, [req.params.itemId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Comments
async function addComment(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const [[defaultMember]] = await pool.query(`SELECT id FROM members WHERE is_default = 1 LIMIT 1`);
    const cmId = uuidv4();
    await pool.query(`INSERT INTO comments (id,card_id,member_id,content) VALUES (?,?,?,?)`,
      [cmId, id, defaultMember.id, content]);
    const [[comment]] = await pool.query(`
      SELECT c.*, m.name as member_name, m.initials, m.avatar_color
      FROM comments c JOIN members m ON c.member_id = m.id WHERE c.id = ?
    `, [cmId]);
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function deleteComment(req, res) {
  try {
    await pool.query(`DELETE FROM comments WHERE id = ?`, [req.params.commentId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function logActivity(boardId, cardId, actionType, data) {
  try {
    const [[defaultMember]] = await pool.query(`SELECT id FROM members WHERE is_default = 1 LIMIT 1`);
    if (defaultMember) {
      await pool.query(`INSERT INTO activity_log (id,board_id,card_id,member_id,action_type,data) VALUES (?,?,?,?,?,?)`,
        [uuidv4(), boardId, cardId, defaultMember.id, actionType, JSON.stringify(data)]);
    }
  } catch (_) {}
}

module.exports = {
  getCard, createCard, updateCard, deleteCard, moveCard, reorderCards,
  addLabel, removeLabel, addMember, removeMember,
  addChecklist, deleteChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  addComment, deleteComment,
};
