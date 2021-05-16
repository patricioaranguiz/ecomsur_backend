const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const { getAllSoOfComputers, getCountComputersOfSo}  = require('../utils/ldapUtils');


exports.getAllComputers = async function(req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        let response = await getAllSoOfComputers()
        response = await Promise.all(response.map(async item => {
            return {
                name: item,
                count: await getCountComputersOfSo(item)
            }
        }))
        res.status(200).json(response);
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}
