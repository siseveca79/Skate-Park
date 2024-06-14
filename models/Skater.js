// models/Skater.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Importa la configuración de la base de datos

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
        defaultValue: true
    }
}, {
    timestamps: false // Desactiva timestamps si no tienes las columnas createdAt y updatedAt
});

module.exports = Skater;
