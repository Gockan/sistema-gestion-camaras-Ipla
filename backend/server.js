const express = require('express');
const cors = require('cors');
require('dotenv').config();
console.log(process.env.DB_PASSWORD);
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente');
});

app.get('/incidencias', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM incidencias ORDER BY fecha DESC'
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error completo:', error.message);
        res.status(500).json({
            mensaje: 'Error al obtener incidencias'
        });
    }
});

app.post('/incidencias', async (req, res) => {

    try {

        const {
            sede,
            ubicacion,
            descripcion,
            estado
        } = req.body;

        const resultado = await pool.query(
            `INSERT INTO incidencias
            (sede, ubicacion, descripcion, estado)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [sede, ubicacion, descripcion, estado]
        );

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error('Error completo:', error.message);

        res.status(500).json({
            mensaje: 'Error al registrar incidencia'
        });
    }
});
app.delete('/incidencias/:id', async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(
            'DELETE FROM incidencias WHERE id = $1',
            [id]
        );

        res.json({
            mensaje: 'Incidencia eliminada correctamente'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al eliminar incidencia'
        });
    }
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});