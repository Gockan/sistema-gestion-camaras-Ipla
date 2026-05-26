const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Servidor funcionando correctamente');
});

/* LOGIN */
app.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        const resultado = await pool.query(
            `SELECT 
                u.id_usuario,
                u.nombre,
                u.correo,
                u.contrasena_hash,
                p.nombre_perfil AS rol
            FROM usuario u
            JOIN perfil p ON u.id_perfil = p.id_perfil
            WHERE u.correo = $1
            AND u.estado_usuario = true`,
            [correo]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        const usuario = resultado.rows[0];

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.contrasena_hash
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        res.json({
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol
        });

    } catch (error) {
        console.error('Error login:', error.message);

        res.status(500).json({
            mensaje: 'Error al iniciar sesión'
        });
    }
});

/* LISTAR INCIDENCIAS ACTIVAS */
app.get('/incidencias', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT *
             FROM incidencias
             WHERE activo = true
             ORDER BY fecha DESC`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error completo:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener incidencias'
        });
    }
});

/* OBTENER UNA INCIDENCIA */
app.get('/incidencias/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT *
             FROM incidencias
             WHERE id = $1
             AND activo = true`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Incidencia no encontrada'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener incidencia:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener incidencia'
        });
    }
});

/* CREAR INCIDENCIA */
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
            (
                sede,
                ubicacion,
                descripcion,
                estado,
                enviado_jefatura,
                activo
            )
            VALUES ($1, $2, $3, $4, $5, true)
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

/* EDITAR INCIDENCIA */
app.put('/incidencias/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            sede,
            ubicacion,
            descripcion,
            estado,
            enviado_jefatura
        } = req.body;

        if (!sede || !ubicacion || !descripcion || !estado) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const resultado = await pool.query(
            `UPDATE incidencias
             SET
                sede = $1,
                ubicacion = $2,
                descripcion = $3,
                estado = $4,
                enviado_jefatura = $5
             WHERE id = $6
             AND activo = true
             RETURNING *`,
            [
                sede,
                ubicacion,
                descripcion,
                estado,
                enviado_jefatura || false,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Incidencia no encontrada'
            });
        }

        res.json({
            mensaje: 'Incidencia actualizada correctamente',
            incidencia: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al editar incidencia:', error.message);

        res.status(500).json({
            mensaje: 'Error al editar incidencia'
        });
    }
});

/* GENERAR REPORTE */
app.put('/incidencias/:id/reporte', async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            `UPDATE incidencias
             SET enviado_jefatura = true
             WHERE id = $1
             AND activo = true`,
            [id]
        );

        const incidencia = await pool.query(
            `SELECT *
             FROM incidencias
             WHERE id = $1
             AND activo = true`,
            [id]
        );

        if (incidencia.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Incidencia no encontrada'
            });
        }

        await pool.query(
            `INSERT INTO reporte
            (
                id_incidencia,
                fecha_reporte,
                destinatario,
                observacion
            )
            VALUES
            (
                $1,
                NOW(),
                $2,
                $3
            )`,
            [
                id,
                'jefatura@empresa.cl',
                `Sede: ${incidencia.rows[0].sede}
Ubicación: ${incidencia.rows[0].ubicacion}
Problema: ${incidencia.rows[0].descripcion}
Estado: ${incidencia.rows[0].estado}`
            ]
        );

        res.json({
            mensaje: 'Reporte generado'
        });

    } catch (error) {
        console.error('Error al generar reporte:', error.message);

        res.status(500).json({
            mensaje: 'Error al generar reporte'
        });
    }
});

/* ACTUALIZAR ESTADO */
app.put('/incidencias/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const resultado = await pool.query(
            `UPDATE incidencias
             SET estado = $1
             WHERE id = $2
             AND activo = true
             RETURNING *`,
            [estado, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Incidencia no encontrada'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al actualizar estado:', error.message);

        res.status(500).json({
            mensaje: 'Error al actualizar estado'
        });
    }
});

/* ELIMINACIÓN LÓGICA */
app.delete('/incidencias/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `UPDATE incidencias
             SET
                activo = false,
                fecha_eliminacion = NOW()
             WHERE id = $1
             AND activo = true
             RETURNING *`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Incidencia no encontrada o ya eliminada'
            });
        }

        res.json({
            mensaje: 'Incidencia eliminada lógicamente'
        });

    } catch (error) {
        console.error('Error al eliminar incidencia:', error.message);

        res.status(500).json({
            mensaje: 'Error al eliminar incidencia'
        });
    }
});

/* OBTENER ESTABLECIMIENTOS */
app.get('/establecimientos', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT *
             FROM establecimiento
             ORDER BY nombre_establecimiento`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error establecimientos'
        });
    }
});

/* OBTENER CAMARAS */
app.get('/camaras', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                c.id_camara,
                c.codigo_camara,
                c.ubicacion,
                c.estado,
                e.nombre_establecimiento
             FROM camara c
             JOIN establecimiento e
             ON c.id_establecimiento = e.id_establecimiento
             ORDER BY c.codigo_camara`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error cámaras'
        });
    }
});

/* CREAR REPORTE */
app.post('/reportes', async (req, res) => {
    try {
        const {
            id_incidencia,
            observacion
        } = req.body;

        const resultado = await pool.query(
            `INSERT INTO reporte
             (id_incidencia, observacion)
             VALUES ($1, $2)
             RETURNING *`,
            [
                id_incidencia,
                observacion
            ]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error reporte'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});