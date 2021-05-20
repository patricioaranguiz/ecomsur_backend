const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {
    getDepartments
} = require('../utils/ldapUtils')


exports.getDepartments = async function (req, res) {
    try {
        // await jwtVerify(req.headers.authorization);
        let response = await getDepartments()
        res.status(200).json(response);
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}
