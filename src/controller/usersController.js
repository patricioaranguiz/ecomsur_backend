const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {autenticate, getAllUsers, getUserBysAMAccountName} = require('../utils/ldapUtils')
const ldapp = require('../utils/ldapUtils')


exports.login = async function (req, res) {
  try {
    await autenticate({username: 'jetorres', password: 'Qwer1234.'});
    let user = await getUserBysAMAccountName('jetorres')
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
    const payload = await jwtVerify(req.headers.authorization);
    console.log(payload)
    // await autenticate({username: 'jetorres', password: 'Qwer1234.'});
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
    const payload = await jwtVerify(req.headers.authorization);
    const body = req.body;
    const users = await ldapp.updateUser(payload, body)
    res.status(200).json(users)
  } catch (e) {
    if (e.code) {
      res.status(e.code).send(e.message);
    } else {
      res.status(500).send('Ocurrio un error');
    }
  }
}
