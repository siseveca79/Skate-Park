const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Skater = sequelize.define('Skater', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    anos_experiencia: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    especialidad: {
        type: DataTypes.STRING,
        allowNull: false
    },
    foto: {
        type: DataTypes.STRING,
        allowNull: true
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: false // Desactiva timestamps
});

module.exports = Skater;
