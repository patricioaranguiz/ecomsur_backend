const express = require('express');
const router = express.Router();
const UsersController = require('../controller/usersController')


router.post('/login',  UsersController.login);

router.get('/users', UsersController.getAllUsers)
module.exports = router;
