const ldap = require("ldapjs");
const ldapOptions = {
  url: ["ldap://192.168.0.22:389"],
  bindDN: "ecomsur.cl",
  reconnect: true,
  idleTimeout: 3000,
};



let client = null;

/* 
 * Realiza la conexion a LDAP con la configuraciones definidas
 * */
function connect() {
  client = ldap.createClient(ldapOptions);
  client.on("error", function (err) {
    console.warn(
      "LDAP connection failed, but fear not, it will reconnect OK",
      err
    );
  });
}

/*
 * Realiza la autenticacion de los usuarios
 *
 */
async function autenticate(user) {
  return new Promise((resolve, reject) => {
    connect();
    client.bind(
      "ecomsur\\" + user.username,
      user.password,
      async (err) => {
        if (err) {
          console.log(err);
          if (JSON.stringify(err.lde_message).includes("80090308")) {
            reject("Credenciales Invalidas");
            client.destroy()
          } else {
            reject(err);
            client.destroy()
          }
        } else {
          resolve(client)
        }
      }
    )
  })

}

async function getAllUsers() {
  let array = [];
  return new Promise(async (resolve, reject) => {
    try {
      var opts = {
        filter: "(objectClass=*)",
        scope: "sub",
        attributes: ["cn", "sAMAccountName", "memberOf", "displayName"],
      };
      client.search(
        "OU=Usuarios_,DC=ecomsur,DC=cl",
        opts,
        function (err, res) {
          if (err) {
            console.log("Error in search " + err);
          } else {
            res.on("searchEntry", function (entry) {
              console.log("entry : " + JSON.stringify(entry.object));
              if (entry.object.sAMAccountName) {
                console.log(entry.object.memberOf)
                let arrayGrupos = entry.object.memberOf ? typeof entry.object.memberOf === "object" ? entry.object.memberOf[0].toString().split(",") : entry.object.memberOf.split(",") : []
                array.push({
                  nombreCompleto: entry.object.cn,
                  userName: entry.object.sAMAccountName,
                  groups: arrayGrupos.length > 0 ? arrayGrupos[0].replace("CN=", "") : '',
                });
              }
            });
            res.on("error", function (err) {
              console.error("error: " + err.message);
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
              let arrayGrupos =
                typeof entry.object.memberOf === "object"
                  ? entry.object.memberOf[0].toString().split(",")
                  : entry.object.memberOf.split(",");
              user = {
                nombreCompleto: entry.object.cn,
                userName: entry.object.sAMAccountName,
                role: arrayGrupos[0].replace("CN=", ""),
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

    var newDN = `cn=${user.firstName} ${user.lastName},OU=Usuarios_,DC=ecomsur,DC=cl`;
    var newUser = {
      distinguishedName: `cn=${user.firstName} ${user.lastName},OU=Usuarios_,DC=ecomsur,DC=cl`,
      cn: `${user.firstName} ${user.lastName}`,
      givenName: user.lastName.toString(),
      sn: user.firstName.toString(),
      displayName: `${user.firstName} ${user.lastName}`,
      mail: `${user.username}@ecomsur.cl`,
      uid: user.username.toString(),
      userPrincipalName: `${user.username}@ecomsur.cl`,
      sAMAccountName: user.username.toString(),
      objectClass: ['top', 'person', 'organizationalPerson', 'user'],
      // userPassword: encodePassword('Qwer1234.'),
      userAccountControl: '544',
    }
    client.add(newDN, newUser, function (err) {
      if (err) {
        reject(err);
        console.log("err in new user " + err);
      } else {
        console.log("added user")
        resolve(true);
      }
    });


  })
}

async function deleteUser() {

  return new Promise(async (resolve, reject) => {
    try {
      await autenticate({
        "username": "jetorres",
        "password": "Qwer1234."
      })
      client.del('cn=new rguyyyy,OU=Usuarios_,DC=ecomsur,DC=cl', (err) => {
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

function actualizar(client) {
  return new Promise(((resolve, reject) => {
    var change = new ldap.Change({
      operation: 'replace',  //use add to add new attribute
      //operation: 'replace', // use replace to update the existing attribute
      modification: {
        sn: 'Carlo'
      }
    });
    client.modify("CN=Patricio Carlos,OU=TI_,OU=Usuarios_,DC=ecomsur,DC=cl", change, (err) => {
        if (err) {
          console.log("err in update user " + err);
        } else {
          console.log("add update user");
          resolve(true);
        }
      }
    );
  }))
}

module.exports = {autenticate, getAllUsers, getUserBysAMAccountName, addUser, deleteUser}
