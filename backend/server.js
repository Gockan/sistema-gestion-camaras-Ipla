const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente');
});

app.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        const resultado = await pool.query(
            `SELECT 
                u.id_usuario,
                u.nombre,
                u.correo,
                p.nombre_perfil AS rol
            FROM usuario u
            JOIN perfil p ON u.id_perfil = p.id_perfil
            WHERE u.correo = $1
            AND u.contrasena_hash = $2
            AND u.estado_usuario = true`,
            [correo, password]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error login:', error.message);

        res.status(500).json({
            mensaje: 'Error al iniciar sesión'
        });
    }
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
            estado,
            enviado_jefatura
        } = req.body;

        const resultado = await pool.query(
            `INSERT INTO incidencias
            (sede, ubicacion, descripcion, estado, enviado_jefatura)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [
                sede,
                ubicacion,
                descripcion,
                estado,
                enviado_jefatura || false
            ]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error completo:', error.message);

        res.status(500).json({
            mensaje: 'Error al registrar incidencia'
        });
    }
});

app.put('/incidencias/:id/reporte', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `UPDATE incidencias
            SET enviado_jefatura = true
            WHERE id = $1
            RETURNING *`,
            [id]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al generar reporte:', error.message);

        res.status(500).json({
            mensaje: 'Error al generar reporte'
        });
    }
});

app.put('/incidencias/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const resultado = await pool.query(
            `UPDATE incidencias
            SET estado = $1
            WHERE id = $2
            RETURNING *`,
            [estado, id]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al actualizar estado:', error.message);

        res.status(500).json({
            mensaje: 'Error al actualizar estado'
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});