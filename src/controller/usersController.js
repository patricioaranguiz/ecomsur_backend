const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {
    autenticate,
    getAllUsers,
    getUserBysAMAccountName,
    addUser,
    deleteUser,
    updateUser
} = require('../utils/ldapUtils')


exports.login = async function (req, res) {
    try {
        await autenticate(req.body);
        let user = await getUserBysAMAccountName(req.body.username)
        let token = await jwtSign(user);
        res.status(200).json({
            nombreUsuario: user.nombreCompleto,
            role: user.role,
            token
        });
    } catch (e) {
        res.status(500).send(e);
    }
}

exports.getAllUsers = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        let users = await getAllUsers();
        res.status(200).json(users)
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}

exports.updateUser = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        const body = req.body;
        const users = await updateUser(body)
        res.status(200).json(users)
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}

exports.addUser = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        await addUser(req.body);
        res.status(200).send(true);
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}
exports.deleteUser = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        await deleteUser(req.params.username);
        res.status(200).send(true);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
}
