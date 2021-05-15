const ldap = require("ldapjs");
const fs = require("fs");
const ldapOptions = {
    url: ["ldap://" + process.env.IPLDAP],
    bindDN: "ecomsur.cl",
    reconnect: true,
    idleTimeout: 3000,
};

var tlsOptions = {
    host: '192.168.0.7',
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
                        resolve(client)
                    }
                }
            )
        } catch (e) {
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
        client.search("OU=Usuarios_,DC=ecomsur,DC=cl", opts, function (err, res) {
                if (err) {
                    console.log("Error in search " + err);
                    reject(err);
                } else {
                    res.on("searchEntry", function (entry) {
                        console.log(entry.object);
                        if (entry.object.sAMAccountName) {
                            let arrayGrupos = entry.object.memberOf ? typeof entry.object.memberOf === "object" ? entry.object.memberOf : [entry.object.memberOf] : []
                            user = {
                                dn: entry.object.dn,
                                nombreCompleto: entry.object.cn,
                                userName: entry.object.sAMAccountName,
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

async function addUser(user) {
    console.log(user);
    return new Promise(async (resolve, reject) => {
        var newDN = `cn=${user.firstName} ${user.lastName},${process.env.OUUSERS}`;
        var newUser = {
            distinguishedName: `cn=${user.firstName} ${user.lastName},${process.env.OUUSERS}`,
            cn: `${user.firstName} ${user.lastName}`,
            givenName: user.firstName.toString(),
            sn: user.lastName.toString(),
            displayName: `${user.firstName} ${user.lastName}`,
            mail: `${user.username}@${process.env.DOMAIN}`,
            uid: user.username.toString(),
            // userPrincipalName: `${user.username}@${process.env.DOMAIN}`,
            sAMAccountName: user.username.toString(),
            objectClass: ['top', 'person', 'organizationalPerson', 'user'],
            userPassword: encodePassword('QwQw1234.'),
            userAccountControl: '544',
            title: user.employment.toString(),
            // userWorkstations: user.workstations.toString(),
            telephoneNumber: parseInt(user.phoneNumber),
            streetAddress: user.streetAddress.toString(),
            company: user.company.toString(),
            department: user.department.toString(),
            description: user.rut.toString()
        }
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
                resolve(true);
            }
        });


    })
}

async function updateUser(user) {
    console.log(user);
    let arrayGroupsDelete = [];
    let arrayGroupAdd = [];
    return new Promise(async (resolve, reject) => {
        let userCurrent = await getUserBysAMAccountName(user.username);
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

        client.modify(userCurrent.dn, arrayFields, async (err) => {
            if (err) {
                console.log("err in update user " + err);
                reject(err);
            } else {
                console.log("add update user");
                await removeUserGroup(user.username);
                await addUserGroup(user.username, user.groups);
                resolve(true);
            }
        });
    });
}

async function deleteUser(username) {
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
                    console.log("err in update user " + err);
                    reject(err);
                } else {
                    console.log("add update user");
                    await changeUserDn(userCurrent);
                    resolve(true);
                }
            });
        } catch (e) {
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
    var convertedPassword = ''
    password = '"' + password + '"'

    for (var i = 0; i < password.length; i++) {
        convertedPassword += String.fromCharCode(
            password.charCodeAt(i) & 0xff,
            (password.charCodeAt(i) >>> 8) & 0xff
        )
    }

    return convertedPassword
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

async function changeUserDn(userCurrent) {
    return new Promise((resolve, reject) => {
        try {
            client.modifyDN(userCurrent.dn, `cn=${userCurrent.nombreCompleto},${process.env.OUDELETE}`, (err) => {
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

async function getAllComputers() {

    return new Promise(async (resolve, reject) => {
        try {
            await autenticate({username: 'jetorres', password: 'Qwer1234.'})
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
                'CN=Computers,DC=ecomsur,DC=cl',
                opts,
                function (err, res) {
                    if (err) {
                        console.log("Error in search " + err);
                        reject(err)
                    } else {
                        res.on("searchEntry", function (entry) {
                            console.log("entry : " + JSON.stringify(entry.object));
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
                            resolve(true);
                        });
                        res.on("close", function () {
                            console.log("close");
                        });
                    }
                }
            )
        }
        catch (e) {
            reject(e)
        }

    });


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
    getAllComputers
}
