'use strict';

const Sequelize = require('sequelize');
const sequelize = require('../utils/config-mysql').sequelize;


let Logs = sequelize.define('log', {
    id: {
        type: Sequelize.BIGINT,
        field: 'id',
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: Sequelize.STRING,
        field: 'username',
        allowNull: false
    },
    accion: {
        type: Sequelize.STRING,
        field: 'action',
        allowNull: false
    },
    detalle: {
        type: Sequelize.STRING,
        field: 'detail'
    },
    valorActual: {
        type: Sequelize.STRING,
        field: 'current_value'
    },
    valorNuevo: {
        type: Sequelize.STRING,
        field: 'new_value'
    },
    fecha: {
        type: Sequelize.DATE,
        field: 'date',
        allowNull: false
    },

}, {
    tableName: 'log',
    timestamps: false,
    underscored: true
});

module.exports = Logs;
