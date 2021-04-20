const ldap = require("ldapjs");

const client = ldap.createClient({
  url: ["ldap://192.168.0.22:389"],
  bindDN: "ecomsur.cl",
  reconnect: true,
  idleTimeout: 3000,
});

client.on("error", function (err) {
  console.warn(
    "LDAP connection failed, but fear not, it will reconnect OK",
    err
  );
});

exports.updateUser = function (payload, userUpdate) {
  console.log(userUpdate);
  return new Promise((resolve, reject) => {
    client.bind("ecomsur\\" + payload.userName, "Qwer1234.", async (err) => {
      if (err) {
        console.log(err);
        if (JSON.stringify(err.lde_message).includes("80090308")) {
          reject("Credenciales Invalidas");
        } else {
          reject(err);
        }
      } else {

        resolve(actualizar(client));
        // var opts = {
        //   filter: "(sAMAccountName=" + userUpdate.username + ")",
        //   scope: "sub",
        //   attributes: ["cn", "sAMAccountName", "memberOf"],
        // };
        // client.search("OU=Usuarios_,DC=ecomsur,DC=cl", opts, function (err, res) {
        //     if (err) {
        //       console.log("Error in search " + err);
        //       reject(err);
        //     } else {
        //       res.on("searchEntry", function (entry) {
        //
        //         if (entry.object.sAMAccountName) {
        //         }
        //       });
        //       res.on("error", function (err) {
        //         console.error("error: " + err.message);
        //         reject(err);
        //       });
        //       // res.on("end", function (result) {
        //       //   console.log("status: " + result.status);
        //       // });
        //     }
        //   }
        // );
      }
    });
    client.on("error", (err) => {
      console.log(
        "LDAP connection failed, but fear not, it will reconnect OK",
        err
      );
    });
  });
};

async function autenticate(user) {
  return new Promise((resolve, reject) => {
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
          resolve(true)
        }
      }
    )
  })

}

async function getAllUsers() {
  let array = [];
  return new Promise(((resolve, reject) => {
    var opts = {
      filter: "(objectClass=*)", //simple search
      //  filter: '(&(uid=2)(sn=John))',// and search
      // filter: '(sAMAccountName=jetorresti)', // or search
      // filter: '(&(objectClass=*)(CN=Patricio Carlos))',
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
              let arrayGrupos =
                typeof entry.object.memberOf === "object"
                  ? entry.object.memberOf[0].toString().split(",")
                  : entry.object.memberOf.split(",");
              array.push({
                nombreCompleto: entry.object.cn,
                userName: entry.object.sAMAccountName,
                groups: arrayGrupos[0].replace("CN=", ""),
              });
            }
          });
          res.on("error", function (err) {
            console.error("error: " + err.message);
          });
          res.on("end", function (result) {
            console.log("status: " + result.status);
            client.destroy();
            resolve(array);
          });
          res.on("close", function () {
            console.log("close");
          });
        }
      }
    )
  }))

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

module.exports = {autenticate, getAllUsers, getUserBysAMAccountName}
