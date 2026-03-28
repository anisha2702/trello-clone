// routes/boards.js
const router = require('express').Router();
const c = require('../controllers/boardController');
router.get('/',           c.getBoards);
router.post('/',          c.createBoard);
router.get('/:id',        c.getBoard);
router.patch('/:id',      c.updateBoard);
router.delete('/:id',     c.deleteBoard);
router.get('/:id/activity', c.getBoardActivity);
module.exports = router;
