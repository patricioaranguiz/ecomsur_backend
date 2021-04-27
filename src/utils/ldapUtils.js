const ldap = require("ldapjs");
const ldapOptions = {
    url: ["ldap://192.168.0.22:389"],
    bindDN: "ecomsur.cl",
    reconnect: true,
    idleTimeout: 3000,
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
                    "userWorkstations",
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
                                    workstations: entry.object.userWorkstations,
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
                        if (entry.object.sAMAccountName) {
                            let arrayGrupos = entry.object.memberOf ? typeof entry.object.memberOf === "object" ? entry.object.memberOf : [entry.object.memberOf] : []
                            user = {
                                dn: entry.object.dn,
                                nombreCompleto: entry.object.cn,
                                userName: entry.object.sAMAccountName,
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
            // userPassword: encodePassword('Qwer1234.'),
            userAccountControl: '544',
            title: user.employment.toString(),
            userWorkstations: user.workstations.toString(),
            telephoneNumber: parseInt(user.phoneNumber),
            streetAddress: user.streetAddress.toString(),
            company: user.company.toString(),
            department: user.department.toString(),
            description: user.rut.toString()
        }
        client.add(newDN, newUser, function (err) {
            if (err) {
                console.log("err in new user " + err);
                if (JSON.stringify(err.lde_message).includes("DSID-0C090FC5")) {
                    client.destroy()
                    reject({code: 403, message: "Credenciales Invalidas"});
                } else if(JSON.stringify(err.lde_message).includes("ENTRY_EXISTS")) {
                    reject({code: 409, message: "Usuario existente"})
                } else {
                    reject(err);
                }
            } else {
                console.log("added user")
                resolve(true);
            }
        });


    })
}

async function updateUser(user) {
    console.log(user);
    return new Promise(async (resolve, reject) => {
        let userCurrent = await getUserBysAMAccountName(user.username);
        client.modify(`CN=${userCurrent.nombreCompleto},${process.env.OUUSERS}`, [
/*            new ldap.Change({
                operation: 'replace',
                modification: {
                    distinguishedName: `cn=${user.firstName} ${user.lastName},${process.env.OUUSERS}`
                }
            }),
            new ldap.Change({
                operation: 'replace',
                modification: {
                    cn: `${user.firstName} ${user.lastName}`
                }
            }),*/
            new ldap.Change({
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
                    mail:  `${user.email}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    title:  `${user.employment}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    userWorkstations:  `${user.workstations}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    telephoneNumber:  `${user.phoneNumber}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    streetAddress:  `${user.streetAddress}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    company:  `${user.company}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    department:  `${user.department}`,
                }
            }), new ldap.Change({
                operation: 'replace',
                modification: {
                    description:  `${user.rut}`,
                }
            })
        ], (err) => {
            if (err) {
                console.log("err in update user " + err);
                reject(err);
            } else {
                console.log("add update user");
                resolve(true);
            }
        });
    });
}

async function deleteUser(username) {
    return new Promise(async (resolve, reject) => {
        try {
            let userInfo = await getUserBysAMAccountName(username);
            client.del(userInfo.dn, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(true)
                }
            });
        } catch (e) {
            reject(e);
        }
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


module.exports = {autenticate, getAllUsers, getUserBysAMAccountName, addUser, updateUser, deleteUser}
