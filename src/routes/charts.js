const express = require('express');
const router = express.Router();
const GroupsController = require('../controller/groupsController')

router.get('/groupsAndMember', GroupsController.getAllGroupsAndMember);

module.exports = router;
