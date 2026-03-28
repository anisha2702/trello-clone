const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// GET /api/boards — list all boards for default user
async function getBoards(req, res) {
  try {
    const [boards] = await pool.query(`
      SELECT b.*, m.name as owner_name, m.initials as owner_initials, m.avatar_color as owner_color,
        (SELECT COUNT(*) FROM lists l WHERE l.board_id = b.id AND l.is_archived = 0) as list_count,
        (SELECT COUNT(*) FROM cards c WHERE c.board_id = b.id AND c.is_archived = 0) as card_count
      FROM boards b
      JOIN members m ON b.owner_id = m.id
      WHERE b.is_archived = 0
      ORDER BY b.created_at DESC
    `);
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/boards/:id — full board with lists and cards
async function getBoard(req, res) {
  try {
    const { id } = req.params;

    const [[board]] = await pool.query(`SELECT * FROM boards WHERE id = ?`, [id]);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const [boardMembers] = await pool.query(`
      SELECT m.*, bm.role FROM members m
      JOIN board_members bm ON m.id = bm.member_id
      WHERE bm.board_id = ?
    `, [id]);

    const [labels] = await pool.query(`SELECT * FROM labels WHERE board_id = ?`, [id]);

    const [lists] = await pool.query(`
      SELECT * FROM lists WHERE board_id = ? AND is_archived = 0 ORDER BY position ASC
    `, [id]);

    const [cards] = await pool.query(`
      SELECT c.* FROM cards c WHERE c.board_id = ? AND c.is_archived = 0 ORDER BY c.position ASC
    `, [id]);

    const cardIds = cards.map(c => c.id);

    let cardLabels = [], cardMembers = [], checklists = [], checklistItems = [];
    if (cardIds.length) {
      const placeholders = cardIds.map(() => '?').join(',');
      [cardLabels]      = await pool.query(`SELECT cl.card_id, l.* FROM card_labels cl JOIN labels l ON cl.label_id = l.id WHERE cl.card_id IN (${placeholders})`, cardIds);
      [cardMembers]     = await pool.query(`SELECT cm.card_id, m.* FROM card_members cm JOIN members m ON cm.member_id = m.id WHERE cm.card_id IN (${placeholders})`, cardIds);
      [checklists]      = await pool.query(`SELECT * FROM checklists WHERE card_id IN (${placeholders}) ORDER BY position`, cardIds);
      const clIds       = checklists.map(c => c.id);
      if (clIds.length) {
        const clPlaceholders = clIds.map(() => '?').join(',');
        [checklistItems] = await pool.query(`SELECT * FROM checklist_items WHERE checklist_id IN (${clPlaceholders}) ORDER BY position`, clIds);
      }
    }

    // Assemble
    const enrichedCards = cards.map(card => ({
      ...card,
      labels:     cardLabels.filter(cl => cl.card_id === card.id),
      members:    cardMembers.filter(cm => cm.card_id === card.id),
      checklists: checklists
        .filter(cl => cl.card_id === card.id)
        .map(cl => ({ ...cl, items: checklistItems.filter(i => i.checklist_id === cl.id) })),
    }));

    const enrichedLists = lists.map(list => ({
      ...list,
      cards: enrichedCards.filter(c => c.list_id === list.id),
    }));

    res.json({ ...board, lists: enrichedLists, members: boardMembers, labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/boards
async function createBoard(req, res) {
  try {
    const { title, description, background_color = '#0079bf' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const [[defaultMember]] = await pool.query(`SELECT id FROM members WHERE is_default = 1 LIMIT 1`);
    if (!defaultMember) return res.status(400).json({ error: 'No default member found' });

    const id = uuidv4();
    await pool.query(
      `INSERT INTO boards (id,title,description,background_color,owner_id) VALUES (?,?,?,?,?)`,
      [id, title, description || null, background_color, defaultMember.id]
    );
    await pool.query(`INSERT INTO board_members (board_id,member_id,role) VALUES (?,?,?)`,
      [id, defaultMember.id, 'owner']);

    // Default labels
    const defaultLabels = [
      { color: '#61bd4f', name: 'Feature' }, { color: '#f2d600', name: 'Bug' },
      { color: '#ff9f1a', name: 'Improvement' }, { color: '#eb5a46', name: 'Critical' },
      { color: '#c377e0', name: 'Research' }, { color: '#0079bf', name: 'Backend' },
    ];
    for (const l of defaultLabels) {
      await pool.query(`INSERT INTO labels (id,board_id,name,color) VALUES (?,?,?,?)`,
        [uuidv4(), id, l.name, l.color]);
    }

    const [[board]] = await pool.query(`SELECT * FROM boards WHERE id = ?`, [id]);
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/boards/:id
async function updateBoard(req, res) {
  try {
    const { id } = req.params;
    const { title, description, background_color, is_starred } = req.body;
    const fields = [];
    const vals = [];
    if (title !== undefined)            { fields.push('title = ?');            vals.push(title); }
    if (description !== undefined)      { fields.push('description = ?');      vals.push(description); }
    if (background_color !== undefined) { fields.push('background_color = ?'); vals.push(background_color); }
    if (is_starred !== undefined)       { fields.push('is_starred = ?');       vals.push(is_starred ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(id);
    await pool.query(`UPDATE boards SET ${fields.join(', ')} WHERE id = ?`, vals);
    const [[board]] = await pool.query(`SELECT * FROM boards WHERE id = ?`, [id]);
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/boards/:id
async function deleteBoard(req, res) {
  try {
    await pool.query(`UPDATE boards SET is_archived = 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/boards/:id/activity
async function getBoardActivity(req, res) {
  try {
    const [logs] = await pool.query(`
      SELECT al.*, m.name as member_name, m.initials, m.avatar_color,
        c.title as card_title
      FROM activity_log al
      JOIN members m ON al.member_id = m.id
      LEFT JOIN cards c ON al.card_id = c.id
      WHERE al.board_id = ?
      ORDER BY al.created_at DESC
      LIMIT 50
    `, [req.params.id]);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getBoards, getBoard, createBoard, updateBoard, deleteBoard, getBoardActivity };
