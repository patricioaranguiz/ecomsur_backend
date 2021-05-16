const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {
    autenticate,
    getAllUsers,
    getUserBysAMAccountName,
    addUser,
    deleteUser,
    updateUser
} = require('../utils/ldapUtils')

const csv = require('csv-parser')
const fs = require('fs');


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

exports.addUserMassive = async function (req, res) {
    try {
        fs.writeFile(req.files.file.name, req.files.file.data, function (err) {
            if (err) {
                console.log(err)
            }
            const results = [];
            fs.createReadStream(req.files.file.name)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    await Promise.all(results.map(async item => {
                        let exist = await getUserBysAMAccountName(item.username);
                        console.log(exist);
                        if (!exist.dn) {
                            item.groups = item.groups.split(" ");
                            try {
                                await addUser(item)
                            } catch (e) {
                                console.log(item.username)
                                console.log(e);
                            }
                        }
                    }));
                    fs.unlinkSync(req.files.file.name);
                    res.status(200).send(true)
                });
        })
    } catch (e) {
        fs.unlinkSync(req.files.file.name);
        console.log(e);
        res.status(500).send(e);
    }
}
