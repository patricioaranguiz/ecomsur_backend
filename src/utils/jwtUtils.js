const jwt = require('jsonwebtoken');

async function jwtSign(payload) {
  return new Promise(function (resolve, reject) {
    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '30m' });
    resolve(token);
  })
}

async function jwtVerify(token) {
  return new Promise(function (resolve, reject) {
    token = token.replace('Bearer ', '');
    jwt.verify(token, process.env.SECRET_KEY, async function (err, payload) {
      if (err) {
        switch (err.message) {
          case 'jwt must be provided':
            reject({
              code: 403,
              message: 'Debe proporcionar un token valido'
            })
            break;
          case 'jwt expired':
            reject({
              code: 403,
              message: 'Token Expirado'
            })
            break;
          case 'invalid signature':
            reject({
              code: 403,
              message: 'Firma inválida'
            })
            break;
          default:
            reject({
              code: 403,
              message: err.message
            })
        }
      } else {
        resolve(payload);
      }
    });
  });
}

/**
 * Verifica si dentro del Header viene el parametro de Authorization
 *
 * @param req
 * @param res
 * @param next
 */
function tokenVerify(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearerToken = bearerHeader.split(" ")[1];
    req.token = bearerToken;
    next();
  } else {
    res.status(403).send('No autorizado');
  }
}

module.exports = {jwtSign, jwtVerify, tokenVerify}
