const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const { getAllComputers }  = require('../utils/ldapUtils');


exports.getAllComputers = async function(req, res) {
    try {
        // await jwtVerify(req.headers.authorization);
        let response = await getAllComputers()
        res.status(200).json(response);
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}
