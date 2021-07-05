const {jwtSign, jwtVerify} = require('../utils/jwtUtils')
const {
    getAllGroup,
    getAllGroupAndMember,
    getCountMemberOfDepartment,
    getDepartments,
    getEmployments,
    getCountMemberOfEmployment
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

exports.getAllGroupsAndMember = async function (req, res) {
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

exports.getMemberOfDepartment = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        let response = await getDepartments()
        response = await Promise.all(response.map(async (item) => {
            return {name: item.name, count: await getCountMemberOfDepartment(item.dn)};
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

exports.getMemberOfEmployment = async function (req, res) {
    try {
        await jwtVerify(req.headers.authorization);
        let response = await getEmployments()
        //console.log(response)
        res.status(200).json(response);
        // res.status(200).send('ok');
    } catch (e) {
        if (e.code) {
            res.status(e.code).send(e.message);
        } else {
            res.status(500).send('Ocurrio un error');
        }
    }
}
