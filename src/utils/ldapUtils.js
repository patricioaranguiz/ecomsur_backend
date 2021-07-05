const sequelize = require('./config-mysql').sequelize;
const Logs = require('../models/logs');
const ldap = require("ldapjs");
const fs = require("fs");
// const ldapOptions = {
//     url: ["ldap://" + process.env.IPLDAP],
//     bindDN: "ecomsur.cl",
//     reconnect: true,
//     idleTimeout: 3000,
// };

var tlsOptions = {
    host: '192.168.0.20',
    port: '636',
    ca: [fs.readFileSync(__dirname + '/ldaps636.cer')],
    rejectUnauthorized: false
};

/*const ldapOptions = {
    url: "ldaps://192.168.0.7:636",
    bindDN: "ecomsur.cl",
    reconnect: true,
    idleTimeout: 3000,
    tlsOptions: tlsOptions
};*/

const acciones = {
    LOGIN: "LOGIN",
    CREAR: "CREAR_USUARIO",
    EDITAR: "EDITAR_USUARIO",
    ELIMINAR: "ELIMINA_USUARIO",
    CAMBIO_CLAVE: "CAMBIO_CLAVE",
}

const ldapOptions = {
    url: ["ldaps://" + process.env.IPLDAP],
    bindDN: "ecomsur.cl",
    reconnect: true,
    idleTimeout: 3000,
    tlsOptions: {'rejectUnauthorized': false}
};
let client = ldap.createClient(ldapOptions);
client.on("error", function (err) {
    console.warn(
        "LDAP connection failed, but fear not, it will reconnect OK",
        err
    );
});

async function connect() {
    return new Promise(((resolve, reject) => {
        try {
            client = ldap.createClient(ldapOptions);
            resolve(true);
        } catch (e) {
            reject(false)
        }

    }))

}

/*
 * Realiza la autenticacion de los usuarios
 *
 */
async function autenticate(user) {
    let transaction = await sequelize.transaction();
    return new Promise(async (resolve, reject) => {
        try {
            console.log(client.connected)
            if (!client.connected) {
                await connect();
            }
            client.bind(
                "ecomsur\\" + user.username,
                user.password,
                async (err) => {
                    if (err) {
                        console.log(err);
                        if (JSON.stringify(err.lde_message).includes("80090308")) {
                            reject("Credenciales Invalidas");
                        } else {
                            reject(err);
                        }
                    } else {
                        await Logs.create({
                            username: user.username,
                            accion: acciones.LOGIN,
                            detalle: 'Usuario autenticado',
                            fecha: Date.now()
                        }, {transaction})
                        await transaction.commit();
                        resolve(client)
                    }
                }
            )
        } catch (e) {
            await transaction.rollback();
            console.log(e);
            reject(e);
        }

    })

}

async function getAllUsers() {
    let array = [];
    return new Promise(async (resolve, reject) => {
        try {
            var opts = {
                filter: "(objectClass=*)",
                scope: "sub",
                attributes: [
                    "distinguishedName",
                    "cn",
                    "givenName",
                    "sn",
                    "displayName",
                    "mail",
                    "sAMAccountName",
                    "title",
                    "telephoneNumber",
                    "streetAddress",
                    "company",
                    "department",
                    "description",
                    "memberOf"
                ],
            };
            client.search(
                process.env.OUUSERS,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", function (entry) {
                            // console.log("entry : " + JSON.stringify(entry.object));
                            if (entry.object.sAMAccountName) {
                                let arrayGrupos = entry.object.memberOf ? typeof entry.object.memberOf === "object" ? entry.object.memberOf : [entry.object.memberOf] : []
                                array.push({
                                    nombreCompleto: entry.object.cn,
                                    userName: entry.object.sAMAccountName,
                                    firstName: entry.object.givenName,
                                    lastName: entry.object.sn,
                                    groups: arrayGrupos.length > 0 ? (arrayGrupos.map((item) => item.toString().split(",")[0].replace("CN=", ""))) : '',
                                    mail: entry.object.mail,
                                    title: entry.object.title,
                                    telephoneNumber: entry.object.telephoneNumber,
                                    streetAddress: entry.object.streetAddress,
                                    company: entry.object.company,
                                    department: entry.object.department,
                                    description: entry.object.description
                                });
                            }
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                client.destroy()
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            resolve(array);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                }
            )

        } catch (e) {
            reject(e)
        }

    });
}

async function getUserBysAMAccountName(sAMAccountName) {
    let user = {};
    return new Promise((resolve, reject) => {
        var opts = {
            filter: "(sAMAccountName=" + sAMAccountName + ")",
            scope: "sub",
            attributes: ["cn", "sAMAccountName", "memberOf"],
        };
        client.search(process.env.OUUSERS, opts, function (err, res) {
                if (err) {
                    console.log("Error in search " + err);
                    reject(err);
                } else {
                    res.on("searchEntry", function (entry) {
                        if (entry.object.sAMAccountName) {
                            let arrayGrupos = entry.object.memberOf ? typeof entry.object.memberOf === "object" ? entry.object.memberOf : [entry.object.memberOf] : []
                            user = {
                                dn: entry.object.dn,
                                nombreCompleto: entry.object.cn,
                                username: entry.object.sAMAccountName,
                                memberOf: entry.object.memberOf,
                                role: arrayGrupos.length > 0 ? (arrayGrupos.map((item) => item.toString().split(",")[0].replace("CN=", ""))) : '',
                            };
                        }
                    });
                    res.on("error", function (err) {
                        console.error("error: " + err.message);
                        reject(err);
                    });
                    res.on("end", function (result) {
                        resolve(user);
                    });
                }
            }
        );
    });
}

async function getUserByUsername(username) {
    let user = {};
    return new Promise((resolve, reject) => {
        var opts = {
            filter: "(sAMAccountName=" + username + ")",
            scope: "sub",
            attributes: ["cn", "sAMAccountName", "memberOf", "givenName", "sn", "mail", "title", "telephoneNumber", "streetAddress", "company", "department", "description"],
        };
        client.search(process.env.OUUSERS, opts, function (err, res) {
                if (err) {
                    console.log("Error in search " + err);
                    reject(err);
                } else {
                    res.on("searchEntry", function (entry) {
                        if (entry.object.sAMAccountName) {
                            let arrayGrupos = entry.object.memberOf ? typeof entry.object.memberOf === "object" ? entry.object.memberOf : [entry.object.memberOf] : []
                            user = {
                                "username": username,
                                "firstName": entry.object.givenName,
                                "lastName": entry.object.sn,
                                "email": entry.object.mail,
                                "rut": entry.object.description,
                                "employment": entry.object.title,
                                "department": entry.object.department,
                                "company": entry.object.company,
                                "streetAddress": entry.object.streetAddress,
                                "phoneNumber": entry.object.telephoneNumber,
                                "groups": arrayGrupos.length > 0 ? (arrayGrupos.map((item) => item.toString().split(",")[0].replace("CN=", ""))) : '',
                            }
                        }
                    });
                    res.on("error", function (err) {
                        console.error("error: " + err.message);
                        reject(err);
                    });
                    res.on("end", function (result) {
                        resolve(user);
                    });
                }
            }
        );
    });
}

async function addUser(user, actionUser) {
    let transaction = await sequelize.transaction();
    let yearCurrent = new Date().getFullYear().toString();
    let test = user.username.charAt(0).toUpperCase() + user.username.slice(1);
    return new Promise(async (resolve, reject) => {
        var newDN = `cn=${user.firstName} ${user.lastName},OU=${user.department.toString()},${process.env.OUUSERS}`;
        var newUser = {
            distinguishedName: `cn=${user.firstName} ${user.lastName},OU=${user.department.toString()},${process.env.OUUSERS}`,
            cn: `${user.firstName} ${user.lastName}`,
            givenName: user.firstName.toString(),
            sn: user.lastName.toString(),
            displayName: `${user.firstName} ${user.lastName}`,
            mail: `${user.username}@${process.env.DOMAIN}`,
            uid: user.username.toString(),
            // userPrincipalName: `${user.username}@${process.env.DOMAIN}`,
            sAMAccountName: user.username.toString(),
            objectClass: ['top', 'person', 'organizationalPerson', 'user'],
            unicodePwd: encodePassword(`${test}${yearCurrent}.`),
            userAccountControl: '544',
            title: user.employment.toString(),
            // userWorkstations: user.workstations.toString(),
            telephoneNumber: parseInt(user.phoneNumber),
            streetAddress: user.streetAddress.toString(),
            company: user.company.toString(),
            department: user.department.toString(),
            description: user.rut.toString()
        }

        try {
            client.add(newDN, newUser, async function (err) {
                if (err) {
                    console.log("err in new user " + err);
                    if (JSON.stringify(err.lde_message).includes("DSID-0C090FC5")) {
                        client.destroy()
                        reject({code: 403, message: "Credenciales Invalidas"});
                    } else if (JSON.stringify(err.lde_message).includes("ENTRY_EXISTS")) {
                        reject({code: 409, message: "Usuario existente"})
                    } else {
                        reject(err);
                    }
                } else {
                    console.log("added user")
                    await removeUserGroup(user.username);
                    await addUserGroup(user.username, user.groups);
                    await Logs.create({
                        username: actionUser,
                        accion: acciones.CREAR,
                        detalle: 'Se ha agregado un nuevo usuario: ' + user.username,
                        valorNuevo: JSON.stringify(newUser),
                        fecha: Date.now()
                    })

                    await transaction.commit();
                    resolve(true);
                }
            });
        } catch (e) {
            await transaction.rollback();
            console.log(e);
            reject(e);
        }
    })
}

async function updateUser(user, actionUser) {
    let transaction = await sequelize.transaction();
    console.log(user);
    let arrayGroupsDelete = [];
    let arrayGroupAdd = [];
    return new Promise(async (resolve, reject) => {
        let userCurrent = await getUserBysAMAccountName(user.username);
        let current = await getUserByUsername(user.username);
        console.log(userCurrent);
        let arrayFields = [new ldap.Change({
            operation: 'replace',
            modification: {
                givenName: user.firstName.toString()
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                sn: user.lastName.toString(),
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                displayName: `${user.firstName} ${user.lastName}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                mail: `${user.email}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                title: `${user.employment}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                telephoneNumber: `${user.phoneNumber}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                streetAddress: `${user.streetAddress}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                company: `${user.company}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                department: `${user.department}`,
            }
        }), new ldap.Change({
            operation: 'replace',
            modification: {
                description: `${user.rut}`,
            }
        })]

        try {
            client.modify(userCurrent.dn, arrayFields, async (err) => {
                if (err) {
                    console.log("err in update user " + err);
                    reject(err);
                } else {
                    console.log("update user");
                    await removeUserGroup(user.username);
                    await addUserGroup(user.username, user.groups);
                    await changeUserDn(userCurrent, `OU=${user.department},${process.env.OUUSERS}`);
                    console.log(userCurrent);
                    await Logs.create({
                        username: actionUser,
                        accion: acciones.EDITAR,
                        detalle: 'Se ha actualizado el usuario: ' + user.username,
                        valorActual: JSON.stringify(current),
                        valorNuevo: JSON.stringify(user),
                        fecha: Date.now()
                    })
                    await transaction.commit();
                    resolve(true);
                }
            });
        } catch (e) {
            await transaction.rollback();
            console.log(e);
            reject(e);
        }
    });
}

async function deleteUser(username, actionUser) {
    let transaction = await sequelize.transaction();
    return new Promise(async (resolve, reject) => {
        try {
            let userCurrent = await getUserBysAMAccountName(username);
            console.log(userCurrent);
            console.log(`cn=${userCurrent.nombreCompleto},${process.env.OUDELETE}`)

            // Se modifica la cuenta dejandola deshabilitada
            client.modify(userCurrent.dn, [
                new ldap.Change({
                    operation: 'replace',
                    modification: {
                        userAccountControl: 2
                    }
                })], async (err) => {
                if (err) {
                    console.log("err in delete user " + err);
                    reject(err);
                } else {
                    console.log("delete user ok");
                    await changeUserDn(userCurrent, process.env.OUDELETE);
                    await Logs.create({
                        username: actionUser,
                        accion: acciones.ELIMINAR,
                        detalle: 'Se ha eliminado el usuario: ' + username,
                        fecha: Date.now()
                    }, {transaction})
                    await transaction.commit();
                    resolve(true);
                }
            });
        } catch (e) {
            await transaction.rollback();
            reject(e);
        }
    })


}

async function removeUserGroup(username) {
    return new Promise(async (resolve, reject) => {
        let userCurrent = await getUserBysAMAccountName(username);
        if (userCurrent.memberOf) {
            let arrayGroupsDelete = [];
            let change = new ldap.Change({
                operation: 'delete',
                modification: {
                    member: [userCurrent.dn]
                }
            })
            if (typeof userCurrent.memberOf === 'string') {
                arrayGroupsDelete.push(client.modify(userCurrent.memberOf, change, function (err, res) {
                }))
            } else {
                userCurrent.memberOf.map(group => {
                    arrayGroupsDelete.push(client.modify(group, change, function (err, res) {
                    }))
                })
            }
            Promise.all(arrayGroupsDelete).then((response) => {
                console.log(response);
                resolve(true);
            }).catch((error) => {
                reject(false);
            })
        } else {
            resolve(true);
        }

    })
}

async function addUserGroup(username, groups) {
    return new Promise(async (resolve, reject) => {
        let userCurrent = await getUserBysAMAccountName(username);
        let arrayAddGroups = [];
        let change = new ldap.Change({
            operation: 'add',
            modification: {
                member: [userCurrent.dn]
            }
        });
        groups.map(group => {
            arrayAddGroups.push(client.modify('CN=' + group + ',' + process.env.OUGROUPS, change, function (err, res) {
            }))
        })

        Promise.all(groups)
            .then(res => {
                console.log(res);
                resolve(true)
            })
            .catch(err => {
                console.log(err);
                reject(false);
            })
    })
}

function encodePassword(password) {
    console.log(password)
    return new Buffer('"' + password + '"', 'utf16le').toString();
}

function generatePassword() {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

async function getAllGroup() {
    let arrayGroups = [];
    return new Promise(async (resolve, reject) => {
        try {
            var opts = {
                filter: "(objectClass=*)",
                scope: "sub",
                attributes: [
                    "name", "member"
                ],
            };
            client.search(
                process.env.OUGROUPS,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", function (entry) {
                            if (entry.object.dn.includes('CN')) {
                                console.log("entry : " + JSON.stringify(entry.object));
                                arrayGroups.push(entry.object.name);
                            }
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                client.destroy()
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            resolve(arrayGroups);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                }
            )

        } catch (e) {
            reject(e)
        }

    });
}

async function getAllGroupAndMember() {
    let arrayGroups = [];
    return new Promise(async (resolve, reject) => {
        try {
            var opts = {
                filter: "(objectClass=*)",
                scope: "sub",
                attributes: [
                    "name", "member"
                ],
            };
            client.search(
                process.env.OUGROUPS,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", function (entry) {
                            if (entry.object.dn.includes('CN')) {
                                console.log("entry : " + JSON.stringify(entry.object));
                                let memberCount = entry.object.member === '' ? 0 : (typeof entry.object.member === 'string' ? 1 : entry.object.member.length)

                                arrayGroups.push(
                                    {
                                        group: entry.object.name,
                                        count: memberCount
                                    });
                            }
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                client.destroy()
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            resolve(arrayGroups);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                }
            )

        } catch (e) {
            reject(e)
        }

    });
}

async function changeUserDn(userCurrent, OU) {
    return new Promise((resolve, reject) => {
        try {
            client.modifyDN(userCurrent.dn, `cn=${userCurrent.nombreCompleto},${OU}`, (err) => {
                if (err) {
                    console.log(err)
                    reject(err)
                }
                resolve(true)
            });
        } catch (e) {
            reject(e)
        }
    })
}

async function getDepartments() {
    let arrayDepartment = [];
    return new Promise(async (resolve, reject) => {
        try {
            var opts = {
                filter: "(objectClass=organizationalUnit)",
                scope: "sub",
                attributes: [
                    "name",
                    "dn"
                ]

            };
            client.search(
                process.env.OUUSERS,
                opts,
                async function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", async function (entry) {
                            if (process.env.OUUSERS !== entry.object.dn) {
                                // let ok = await getCountMemberOfDepartment(entry.object.dn)
                                arrayDepartment.push(
                                    {
                                        name: entry.object.name,
                                        dn: entry.object.dn
                                    }
                                )
                            }
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: => " + result.status);
                            resolve(arrayDepartment);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                })
        } catch (e) {
            reject(e);
        }
    });
}

async function getCountMemberOfDepartment(department) {

    return new Promise((resolve, reject) => {
        try {
            var opts = {
                filter: "(objectClass=organizationalPerson)",
                scope: "sub",
                attributes: [
                    "name",
                    "dn"
                ]

            };
            client.search(department,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        let count = 0;
                        res.on("searchEntry", function (entry) {
                            count++;
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            resolve(count);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                })

        } catch (e) {
            console.log(e)
            reject(e)
        }
    })
}

async function getAllSoOfComputers() {

    return new Promise(async (resolve, reject) => {
        try {
            const namesOfSo = [];
            var opts = {
                // filter: "(operatingSystem=Windows 7 Professional)",
                filter: "(objectClass=computer)",
                scope: "sub",
                attributes: [
                    "operatingSystem"
                ],
            };
            client.search(
                process.env.OUCOMPUTERS,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", function (entry) {
                            if (entry.object.dn !== process.env.OUCOMPUTERS) {
                                const copy = Object.assign({}, entry.object);
                                if (copy.operatingSystem) {
                                    if (namesOfSo.length === 0) {
                                        namesOfSo.push(copy.operatingSystem)
                                    } else {
                                        if (!namesOfSo.includes(copy.operatingSystem)) {
                                            namesOfSo.push(copy.operatingSystem)
                                        }
                                    }
                                }
                            }
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            console.log(namesOfSo)
                            resolve(namesOfSo);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                }
            )
        } catch (e) {
            reject(e)
        }

    });


}

async function getCountComputersOfSo(SO) {
    return new Promise((resolve, reject) => {
        try {
            var opts = {
                filter: "(operatingSystem=" + SO + ")",
                scope: "sub",
                // attributes: [
                //     "operatingSystem"
                // ],
            };
            client.search(
                process.env.OUCOMPUTERS,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        let countComputers = 0;
                        res.on("searchEntry", function (entry) {
                            countComputers++;
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                client.destroy()
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            resolve(countComputers);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                }
            )
        } catch (e) {
            reject(e);
        }
    })
}

async function changePassword(username, actionUser) {
    let transaction = await sequelize.transaction();
    let password = generatePassword();
    return new Promise(async (resolve, reject) => {
        try {
            let userCurrent = await getUserBysAMAccountName(username);
            client.modify(userCurrent.dn, [
                new ldap.Change({
                    operation: 'replace',
                    modification: {
                        unicodePwd: encodePassword(password)
                    }
                })
            ], async function (err) {
                if (err) {
                    console.log(err.code);
                    console.log(err.name);
                    console.log(err.message);
                    client.unbind();
                    reject(e)
                } else {
                    await Logs.create({
                        username: actionUser,
                        accion: acciones.CAMBIO_CLAVE,
                        detalle: 'Se ha realizado el cambio de contraseña para el usuario: ' + username,
                        fecha: Date.now()
                    })
                    await transaction.commit();
                    console.log('Password changed!', password);
                    resolve(password)
                }
            });
        } catch (e) {
            await transaction.rollback();
            reject(e)
        }
    })

}

async function getEmployments() {
    return new Promise(async (resolve, reject) => {
        try {
            const namesEmployments = [];
            var opts = {
                filter: "(objectClass=organizationalPerson)",
                scope: "sub",
                attributes: [
                    "title",
                    "dn"
                ]

            };
            client.search(
                process.env.OUUSERS,
                opts,
                async function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", async function (entry) {
                            //console.log("entry : " + JSON.stringify(entry.object));
                            if (process.env.OUUSERS !== entry.object.dn) {
                                const copy = Object.assign({}, entry.object);
                                if (copy.title) {
                                    if (namesEmployments.length === 0) {
                                        namesEmployments.push({name: copy.title, count: 1})
                                    } else {
                                            var index = namesEmployments.findIndex(x => x.name === copy.title);
                                            if(index > 0) {
                                                namesEmployments[index].count = namesEmployments[index].count + 1;
                                            } else {
                                                namesEmployments.push({name: copy.title, count: 1})
                                            }

                                    }
                                } else {
                                    var index = namesEmployments.findIndex(x => x.name === "Sin Cargo");
                                    if(index > 0) {
                                        namesEmployments[index].count = namesEmployments[index].count + 1;
                                    } else {
                                        namesEmployments.push({name: "Sin Cargo", count: 1})
                                    }
                                }
                            }
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: => " + result.status);
                            console.log(namesEmployments)
                            resolve(namesEmployments);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                })
        } catch (e) {
            reject(e);
        }
    });
}

async function getCountMemberOfEmployment(employment) {

    return new Promise((resolve, reject) => {
        try {
            var opts = {
                filter: "(title=" + employment + ")",
                scope: "sub"

            };
            client.search(process.env.OUUSERS,
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        let count = 0;
                        res.on("searchEntry", function (entry) {
                            count++;
                        });
                        res.on("error", function (err) {
                            console.error("error: " + err.message);
                            if (JSON.stringify(err.lde_message).includes("DSID-0C090A22")) {
                                reject({code: 403, message: "Credenciales Invalidas"});
                            } else {
                                reject(err);
                            }
                        });
                        res.on("end", function (result) {
                            console.log("status: " + result.status);
                            resolve(count);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                })

        } catch (e) {
            console.log(e)
            reject(e)
        }
    })
}

module.exports = {
    autenticate,
    getAllUsers,
    getUserBysAMAccountName,
    addUser,
    updateUser,
    deleteUser,
    getAllGroup,
    getAllGroupAndMember,
    changeUserDn,
    getDepartments,
    getCountMemberOfDepartment,
    getAllSoOfComputers,
    getCountComputersOfSo,
    changePassword,
    getEmployments,
    getCountMemberOfEmployment
}
