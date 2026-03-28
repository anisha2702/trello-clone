const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const COLORS = ['#0079bf','#d29034','#519839','#b04632','#89609e','#cd5a91','#4bbf6b','#00aecc','#838c91'];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trello_clone',
    multipleStatements: true,
  });

  try {
    // Clear existing data
    await conn.query(`SET FOREIGN_KEY_CHECKS=0`);
    const tables = ['activity_log','attachments','comments','checklist_items','checklists',
      'card_members','card_labels','cards','labels','lists','board_members','boards','members'];
    for (const t of tables) await conn.query(`TRUNCATE TABLE ${t}`);
    await conn.query(`SET FOREIGN_KEY_CHECKS=1`);

    // Members
    const members = [
      { id: uuidv4(), name: 'Alex Johnson', email: 'alex@company.com', initials: 'AJ', avatar_color: '#0079bf', is_default: 1 },
      { id: uuidv4(), name: 'Sarah Chen',   email: 'sarah@company.com', initials: 'SC', avatar_color: '#d29034', is_default: 0 },
      { id: uuidv4(), name: 'Marcus Webb',  email: 'marcus@company.com', initials: 'MW', avatar_color: '#519839', is_default: 0 },
      { id: uuidv4(), name: 'Priya Patel',  email: 'priya@company.com', initials: 'PP', avatar_color: '#b04632', is_default: 0 },
      { id: uuidv4(), name: 'Daniel Kim',   email: 'daniel@company.com', initials: 'DK', avatar_color: '#89609e', is_default: 0 },
    ];
    for (const m of members) {
      await conn.query(
        `INSERT INTO members (id,name,email,initials,avatar_color,is_default) VALUES (?,?,?,?,?,?)`,
        [m.id, m.name, m.email, m.initials, m.avatar_color, m.is_default]
      );
    }
    const defaultMember = members[0];

    // Board 1 — Product Roadmap
    const board1Id = uuidv4();
    await conn.query(
      `INSERT INTO boards (id,title,description,background_color,owner_id) VALUES (?,?,?,?,?)`,
      [board1Id, 'Product Roadmap Q4 2024', 'Our quarterly product development board', '#0079bf', defaultMember.id]
    );
    for (const m of members) {
      await conn.query(`INSERT INTO board_members (board_id,member_id,role) VALUES (?,?,?)`,
        [board1Id, m.id, m.id === defaultMember.id ? 'owner' : 'member']);
    }

    // Labels for board1
    const labelDefs = [
      { color: '#61bd4f', name: 'Feature' },
      { color: '#f2d600', name: 'Bug' },
      { color: '#ff9f1a', name: 'Improvement' },
      { color: '#eb5a46', name: 'Critical' },
      { color: '#c377e0', name: 'Research' },
      { color: '#0079bf', name: 'Backend' },
    ];
    const labels = [];
    for (const l of labelDefs) {
      const lid = uuidv4();
      await conn.query(`INSERT INTO labels (id,board_id,name,color) VALUES (?,?,?,?)`,
        [lid, board1Id, l.name, l.color]);
      labels.push({ id: lid, ...l });
    }

    // Lists
    const listDefs = ['Backlog','To Do','In Progress','Review','Done'];
    const lists = [];
    for (let i = 0; i < listDefs.length; i++) {
      const lid = uuidv4();
      await conn.query(`INSERT INTO lists (id,board_id,title,position) VALUES (?,?,?,?)`,
        [lid, board1Id, listDefs[i], (i + 1) * 1000]);
      lists.push({ id: lid, title: listDefs[i] });
    }

    // Cards seed data
    const cardData = [
      { list: 'Backlog', title: 'Design new onboarding flow', desc: 'Redesign the user onboarding experience to improve activation rate. Focus on reducing time-to-value.', labels: ['Feature','Research'], members: [members[0], members[1]], due: '2024-11-15' },
      { list: 'Backlog', title: 'Implement dark mode', desc: 'Add system-level dark mode support across all pages and components.', labels: ['Feature','Improvement'], members: [members[2]], due: null },
      { list: 'Backlog', title: 'API rate limiting documentation', desc: 'Write comprehensive documentation for our API rate limiting policies.', labels: ['Backend'], members: [members[3]], due: '2024-11-20' },
      { list: 'Backlog', title: 'Performance audit', desc: 'Conduct a full performance audit of the web application. Identify bottlenecks and create an improvement plan.', labels: ['Research'], members: [], due: null },
      { list: 'To Do', title: 'Fix login redirect bug', desc: 'Users are sometimes redirected to the wrong page after login. Investigate and fix the issue.', labels: ['Bug','Critical'], members: [members[0], members[4]], due: '2024-10-25' },
      { list: 'To Do', title: 'Add export to CSV feature', desc: 'Allow users to export their data as CSV from the dashboard.', labels: ['Feature'], members: [members[1]], due: '2024-10-30' },
      { list: 'To Do', title: 'Update payment integration', desc: 'Upgrade Stripe SDK to latest version and update webhook handling.', labels: ['Backend','Improvement'], members: [members[2], members[3]], due: '2024-11-01' },
      { list: 'In Progress', title: 'Redesign dashboard widgets', desc: 'Modernize the dashboard widget design system. Create reusable component library.', labels: ['Feature','Improvement'], members: [members[0], members[1]], due: '2024-10-28' },
      { list: 'In Progress', title: 'Search functionality improvements', desc: 'Improve search relevance and add filtering capabilities. Implement fuzzy search.', labels: ['Improvement'], members: [members[4]], due: '2024-10-27' },
      { list: 'In Progress', title: 'Mobile responsive fixes', desc: 'Fix layout issues on mobile devices. Focus on iOS Safari compatibility.', labels: ['Bug'], members: [members[1]], due: '2024-10-24' },
      { list: 'Review', title: 'Email notification system', desc: 'Implement transactional email system for notifications. Uses SendGrid API.', labels: ['Feature','Backend'], members: [members[2], members[3]], due: '2024-10-22' },
      { list: 'Review', title: 'Security audit report', desc: 'Review and address findings from the Q3 security audit.', labels: ['Critical'], members: [members[0]], due: '2024-10-21' },
      { list: 'Done', title: 'Setup CI/CD pipeline', desc: 'Configured GitHub Actions for automated testing and deployment.', labels: ['Backend'], members: [members[3], members[4]], due: '2024-10-10' },
      { list: 'Done', title: 'User profile settings page', desc: 'Built the user profile settings page with avatar upload and preference management.', labels: ['Feature'], members: [members[1]], due: '2024-10-08' },
      { list: 'Done', title: 'Database indexing optimization', desc: 'Added proper indexes to improve query performance by 40%.', labels: ['Backend','Improvement'], members: [members[2]], due: '2024-10-05' },
    ];

    for (let i = 0; i < cardData.length; i++) {
      const c = cardData[i];
      const list = lists.find(l => l.title === c.list);
      const cid = uuidv4();

      await conn.query(
        `INSERT INTO cards (id,list_id,board_id,title,description,position,due_date) VALUES (?,?,?,?,?,?,?)`,
        [cid, list.id, board1Id, c.title, c.desc, (i + 1) * 1000, c.due || null]
      );

      for (const lname of c.labels) {
        const lbl = labels.find(l => l.name === lname);
        if (lbl) await conn.query(`INSERT INTO card_labels (card_id,label_id) VALUES (?,?)`, [cid, lbl.id]);
      }
      for (const mem of c.members) {
        await conn.query(`INSERT INTO card_members (card_id,member_id) VALUES (?,?)`, [cid, mem.id]);
      }

      // Add checklist to some cards
      if (['Redesign dashboard widgets','Fix login redirect bug','Email notification system'].includes(c.title)) {
        const clId = uuidv4();
        await conn.query(`INSERT INTO checklists (id,card_id,title,position) VALUES (?,?,?,?)`,
          [clId, cid, 'Tasks', 0]);
        const items = c.title === 'Fix login redirect bug'
          ? [['Reproduce the bug', 1], ['Identify root cause', 0], ['Write fix', 0], ['Add regression test', 0]]
          : c.title === 'Email notification system'
          ? [['Setup SendGrid account', 1], ['Create email templates', 1], ['Implement send logic', 0], ['Add retry handling', 0], ['Write tests', 0]]
          : [['Audit existing widgets', 1], ['Create design mockups', 1], ['Build component library', 0], ['Integrate into dashboard', 0], ['Cross-browser testing', 0]];
        for (let j = 0; j < items.length; j++) {
          await conn.query(`INSERT INTO checklist_items (id,checklist_id,title,is_complete,position) VALUES (?,?,?,?,?)`,
            [uuidv4(), clId, items[j][0], items[j][1], j]);
        }
      }

      // Comments on a few cards
      if (i < 3) {
        await conn.query(`INSERT INTO comments (id,card_id,member_id,content) VALUES (?,?,?,?)`,
          [uuidv4(), cid, members[i % members.length].id, `Left a comment on this card. Looks good to me!`]);
      }
    }

    // Board 2 — Marketing Campaign
    const board2Id = uuidv4();
    await conn.query(
      `INSERT INTO boards (id,title,background_color,owner_id) VALUES (?,?,?,?)`,
      [board2Id, 'Marketing Campaign', '#519839', defaultMember.id]
    );
    await conn.query(`INSERT INTO board_members (board_id,member_id,role) VALUES (?,?,?)`,
      [board2Id, defaultMember.id, 'owner']);

    const mLists = ['Ideas','Planning','Execution','Completed'];
    for (let i = 0; i < mLists.length; i++) {
      await conn.query(`INSERT INTO lists (id,board_id,title,position) VALUES (?,?,?,?)`,
        [uuidv4(), board2Id, mLists[i], (i + 1) * 1000]);
    }

    console.log('✅ Seed data inserted successfully');
    console.log(`   - ${members.length} members created`);
    console.log(`   - 2 boards created`);
    console.log(`   - ${cardData.length} cards created`);
    console.log(`\n   Default user: ${defaultMember.name} (${defaultMember.email})`);
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

seed().catch(process.exit.bind(process, 1));
