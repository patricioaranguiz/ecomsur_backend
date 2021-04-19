const ldap = require('ldapjs');
const client = ldap.createClient({
  url: ['ldap://192.168.0.22:389']
});

client.bind('jetorres@ecomsur.cl', 'Qwer1234.', (err) => {
  if (err) {
    console.log(err);
  } else {
    let array = [];
    console.log('Usuario autenticado.')
    var opts = {
      // filter: '(objectClass=*)',  //simple search
      //  filter: '(&(uid=2)(sn=John))',// and search
      // filter: '(sAMAccountName=jetorresti)', // or search
      // filter: '(&(objectClass=*)(CN=Patricio Carlos))',
      scope: 'sub',
      attributes: ['cn', 'sAMAccountName', 'memberOf']
    };
    // 'dc=ecomsur,dc=cl'
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
              groups:arrayGrupos[0].replace('CN=', '')
            })
          }

        });
        res.on('searchReference', function (referral) {
          console.log('referral: ' + referral.uris.join());
        });
        res.on('error', function (err) {
          console.error('error: ' + err.message);
        });
        res.on('end', function (result) {
          console.log('status: ' + result.status);
          console.log(array);
        });

      }
    });
  }
});


