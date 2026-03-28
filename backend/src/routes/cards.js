const router = require('express').Router();
const c = require('../controllers/cardController');
router.get('/:id',        c.getCard);
router.post('/',          c.createCard);
router.patch('/:id',      c.updateCard);
router.delete('/:id',     c.deleteCard);
router.patch('/:id/move', c.moveCard);
router.post('/reorder',   c.reorderCards);

router.post('/:id/labels',              c.addLabel);
router.delete('/:id/labels/:labelId',   c.removeLabel);
router.post('/:id/members',             c.addMember);
router.delete('/:id/members/:memberId', c.removeMember);

router.post('/:id/checklists',                               c.addChecklist);
router.delete('/:id/checklists/:checklistId',                c.deleteChecklist);
router.post('/:id/checklists/:checklistId/items',            c.addChecklistItem);
router.patch('/:id/checklists/:checklistId/items/:itemId',   c.updateChecklistItem);
router.delete('/:id/checklists/:checklistId/items/:itemId',  c.deleteChecklistItem);

router.post('/:id/comments',            c.addComment);
router.delete('/:id/comments/:commentId', c.deleteComment);

module.exports = router;
