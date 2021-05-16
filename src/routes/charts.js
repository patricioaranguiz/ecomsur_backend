const express = require('express');
const router = express.Router();
const GroupsController = require('../controller/groupsController')

router.get('/groupsAndMember', GroupsController.getAllGroupsAndMember);


router.get('/getMemberOfDeparment', GroupsController.getMemberOfDepartment)

module.exports = router;
