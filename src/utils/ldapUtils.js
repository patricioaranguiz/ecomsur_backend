const ldap = require('ldapjs');


exports.login = function (req) {
  // req.body.username
  let array;
  return new Promise(((resolve, reject) => {
    const client = ldap.createClient({
      url: ['ldap://192.168.0.22:389'],
      bindDN: "ecomsur.cl",
      reconnect: true
    });
    client.bind('ecomsur\\' + req.body.username, req.body.password, async (err) => {
      if (err) {
        console.log(err);
        if (JSON.stringify(err.lde_message).includes('80090308')) {
          reject('Credenciales Invalidas')
        } else {
          reject(err)
        }
      } else {
        var opts = {
          filter: '(sAMAccountName=' + req.body.username + ')',
          scope: 'sub',
          attributes: ['cn', 'sAMAccountName', 'memberOf']
        };
        client.search('OU=Usuarios_,DC=ecomsur,DC=cl', opts, function (err, res) {
          if (err) {
            console.log("Error in search " + err)
            reject(err)
          } else {
            res.on('searchEntry', function (entry) {
              console.log('entry : ' + JSON.stringify(entry.object));
              if (entry.object.sAMAccountName) {
                let arrayGrupos = typeof entry.object.memberOf === 'object' ? entry.object.memberOf[0].toString().split(',') : entry.object.memberOf.split(',');
                array = {
                  nombreCompleto: entry.object.cn,
                  userName: entry.object.sAMAccountName,
                  role: arrayGrupos[0].replace('CN=', '')
                }
              }
            });
            // res.on('searchReference', function (referral) {
            //   console.log('referral: ' + referral.uris.join());
            // });
            res.on('error', function (err) {
              console.error('error: ' + err.message);
              reject(err)
            });
            res.on('end', function (result) {
              console.log('status: ' + result.status);
              resolve(array);
            });
            res.on('close', function () {
              console.log('close')
            })
          }
        });
      }
    });
    client.on('error', function (err) {
      console.warn('LDAP connection failed, but fear not, it will reconnect OK', err);
    });
  }))

}

exports.getAllUsers = function (payload) {
  let array = [];
  return new Promise(((resolve, reject) => {
    const client = ldap.createClient({
      url: ['ldap://192.168.0.22:389'],
      bindDN: "ecomsur.cl",
      reconnect: true,
      idleTimeout: 3000
    });
    client.bind('ecomsur\\' + payload.userName, 'Qwer1234.', async (err) => {
      if (err) {
        if (JSON.stringify(err.lde_message).includes('80090308')) {
          reject('Credenciales Invalidas')
        } else {
          reject(err)
        }
      } else {
        var opts = {
          filter: '(objectClass=*)',  //simple search
          //  filter: '(&(uid=2)(sn=John))',// and search
          // filter: '(sAMAccountName=jetorresti)', // or search
          // filter: '(&(objectClass=*)(CN=Patricio Carlos))',
          scope: 'sub',
          attributes: ['cn', 'sAMAccountName', 'memberOf']
        };
        client.search('OU=Usuarios_,DC=ecomsur,DC=cl', opts, function (err, res) {
          if (err) {
            console.log("Error in search " + err)
          } else {
            res.on('searchEntry', function (entry) {
              console.log('entry : ' + JSON.stringify(entry.object));
              if (entry.object.sAMAccountName) {
                let arrayGrupos = typeof entry.object.memberOf === 'object' ? entry.object.memberOf[0].toString().split(',') : entry.object.memberOf.split(',');
                array.push({
                  nombreCompleto: entry.object.cn,
                  userName: entry.object.sAMAccountName,
                  groups: arrayGrupos[0].replace('CN=', '')
                })
              }
            });
            // res.on('searchReference', function (referral) {
            //   console.log('referral: ' + referral.uris.join());
            // });
            res.on('error', function (err) {
              console.error('error: ' + err.message);
            });
            res.on('end', function (result) {
              console.log('status: ' + result.status);
              client.destroy();
              resolve(array);

            });
            res.on('close', function () {
              console.log('close')
            })
          }
        });
      }
    })
    client.on('error',  err => {
      console.log('LDAP connection failed, but fear not, it will reconnect OK', err);
    });
  }));


}
