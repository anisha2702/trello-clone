const router = require('express').Router();
const c = require('../controllers/memberController');
router.get('/', c.getMembers);
router.get('/default', c.getDefaultMember);
module.exports = router;
