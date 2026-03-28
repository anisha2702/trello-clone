const router = require('express').Router();
const c = require('../controllers/listController');
router.post('/',          c.createList);
router.patch('/:id',      c.updateList);
router.delete('/:id',     c.deleteList);
router.post('/reorder',   c.reorderLists);
module.exports = router;
