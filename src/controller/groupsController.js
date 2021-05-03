const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {
    getAllGroup
} = require('../utils/ldapUtils')


exports.getGroups = async function (req, res) {
    try {
        let response = await getAllGroup()
        res.status(200).json(response);
    } catch (e) {
        console.error(e)
    }
}
