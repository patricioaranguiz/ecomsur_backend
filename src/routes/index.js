
const express = require('express');
const router = express.Router();
const UsersController = require('../controller/usersController')
const DepartmentsController = require('../controller/departmentsController')
const GroupsController = require('../controller/groupsController')
const BitacoraController = require('../controller/bitacoraController');


router.post('/login',  UsersController.login);

router.get('/users', UsersController.getAllUsers);
router.put('/user', UsersController.updateUser);
router.post('/user', UsersController.addUser);
router.delete('/user/:username', UsersController.deleteUser)
router.post('/user/changepassword', UsersController.changePassword)

router.get('/groups', GroupsController.getGroups);
router.get('/departments', DepartmentsController.getDepartments);

router.post('/user/massive/add', UsersController.addUserMassive)
router.post('/user/massive/edit', UsersController.editUserMassive)
router.post('/user/massive/delete', UsersController.deleteUserMassive)

router.get('/logs', BitacoraController.getLogs)
router.get('/logs/report', BitacoraController.getReport)


module.exports = router;
