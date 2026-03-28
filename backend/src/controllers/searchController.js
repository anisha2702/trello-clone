const { pool } = require('../config/database');

async function searchCards(req, res) {
  try {
    const { q, board_id, label_ids, member_ids, due, overdue } = req.query;
    
    let sql = `
      SELECT c.*, l.title as list_title, l.id as list_id,
        b.title as board_title
      FROM cards c
      JOIN lists l ON c.list_id = l.id
      JOIN boards b ON c.board_id = b.id
      WHERE c.is_archived = 0
    `;
    const params = [];

    if (board_id) { sql += ` AND c.board_id = ?`; params.push(board_id); }
    if (q)        { sql += ` AND c.title LIKE ?`;  params.push(`%${q}%`); }
    if (overdue === 'true') {
      sql += ` AND c.due_date < NOW() AND c.due_complete = 0 AND c.due_date IS NOT NULL`;
    } else if (due === 'today') {
      sql += ` AND DATE(c.due_date) = CURDATE()`;
    } else if (due === 'week') {
      sql += ` AND c.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)`;
    }

    sql += ` ORDER BY c.updated_at DESC LIMIT 50`;

    let [cards] = await pool.query(sql, params);

    // Filter by labels
    if (label_ids) {
      const ids = label_ids.split(',').filter(Boolean);
      if (ids.length) {
        cards = cards.filter(async () => true); // placeholder — join below
        const [filtered] = await pool.query(`
          SELECT DISTINCT card_id FROM card_labels WHERE label_id IN (${ids.map(() => '?').join(',')})
        `, ids);
        const matchIds = new Set(filtered.map(r => r.card_id));
        cards = cards.filter(c => matchIds.has(c.id));
      }
    }

    // Filter by members
    if (member_ids) {
      const ids = member_ids.split(',').filter(Boolean);
      if (ids.length) {
        const [filtered] = await pool.query(`
          SELECT DISTINCT card_id FROM card_members WHERE member_id IN (${ids.map(() => '?').join(',')})
        `, ids);
        const matchIds = new Set(filtered.map(r => r.card_id));
        cards = cards.filter(c => matchIds.has(c.id));
      }
    }

    // Enrich with labels and members
    const cardIds = cards.map(c => c.id);
    if (cardIds.length) {
      const ph = cardIds.map(() => '?').join(',');
      const [cardLabels]  = await pool.query(`SELECT cl.card_id, l.* FROM card_labels cl JOIN labels l ON cl.label_id = l.id WHERE cl.card_id IN (${ph})`, cardIds);
      const [cardMembers] = await pool.query(`SELECT cm.card_id, m.* FROM card_members cm JOIN members m ON cm.member_id = m.id WHERE cm.card_id IN (${ph})`, cardIds);
      cards = cards.map(c => ({
        ...c,
        labels:  cardLabels.filter(cl => cl.card_id === c.id),
        members: cardMembers.filter(cm => cm.card_id === c.id),
      }));
    }

    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { searchCards };
