const router = require('express').Router();
const { searchCards } = require('../controllers/searchController');
router.get('/cards', searchCards);
module.exports = router;
