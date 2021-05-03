const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {
    getAllGroup,
    getAllGroupAndMember
} = require('../utils/ldapUtils')


exports.getGroups = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        let response = await getAllGroup()
        res.status(200).json(response);
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}

exports.getAllGroupsAndMember = async function(req, res) {
    try {

        await jwtVerify(req.headers.authorization);
        let response = await getAllGroupAndMember()
        res.status(200).json(response);
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}
