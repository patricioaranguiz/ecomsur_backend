const express = require('express');
const router = express.Router();
const GroupsController = require('../controller/groupsController')
const ComputersController = require('../controller/computersController')

router.get('/groupsAndMember', GroupsController.getAllGroupsAndMember);
router.get('/computers', ComputersController.getAllComputers);


router.get('/getMemberOfDeparment', GroupsController.getMemberOfDepartment)

router.get('/getMemberOfEmployment', GroupsController.getMemberOfEmployment)

module.exports = router;
