// 'use strict';
const Sequelize = require('sequelize');

var sequelize = new Sequelize(process.env.DATABASE_NAME_SQL, process.env.DATABASE_USERNAME_SQL, process.env.DATABASE_PASSWORD_SQL, {
    host: process.env.DATABASE_HOST_SQL,
    dialect: 'mysql',
    port: '3306',
    dialectOptions: {
        options: {
            encrypt: true
        }

    },
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});


function checkConection() {
    return new Promise((res, rej) => {
        sequelize
            .authenticate()
            .then(() => {
                console.log("Connection has been established successfully.");
                res(sequelize);
            })
            .catch(err => {
                console.error("Unable to connect to the database:");
                rej(err);
            });
    });
}


/*sequelize
    .authenticate()
    .then(() => {
        context.log('Connection has been established successfully.');
    })
    .catch(err => {
        context.error('Unable to connect to the database:', err);
    });*/




module.exports.sequelize = sequelize;
module.exports.checkConection = checkConection;

