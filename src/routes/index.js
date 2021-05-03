const express = require('express');
const router = express.Router();
const UsersController = require('../controller/usersController')

const GroupsController = require('../controller/groupsController')


router.post('/login',  UsersController.login);

router.get('/users', UsersController.getAllUsers);

router.put('/user', UsersController.updateUser);

router.post('/user', UsersController.addUser);

router.delete('/user/:username', UsersController.deleteUser)


router.get('/groups', GroupsController.getGroups);




module.exports = router;
