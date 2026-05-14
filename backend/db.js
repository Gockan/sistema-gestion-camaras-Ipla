/*
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

module.exports = pool;
*/
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'Elcuper789-',
    host: 'localhost',
    port: 5432,
    database: 'sistema_camaras'
});

module.exports = pool;