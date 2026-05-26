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

/* ============================================================
   CRUD INCIDENCIAS
============================================================ */

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

/* ELIMINACIÓN LÓGICA DE INCIDENCIAS */
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

/* ============================================================
   CRUD ESTABLECIMIENTOS
============================================================ */

/* LISTAR ESTABLECIMIENTOS ACTIVOS */
app.get('/establecimientos', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT *
             FROM establecimiento
             WHERE activo = true
             ORDER BY nombre_establecimiento`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error establecimientos:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener establecimientos'
        });
    }
});

/* OBTENER UN ESTABLECIMIENTO */
app.get('/establecimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT *
             FROM establecimiento
             WHERE id_establecimiento = $1
             AND activo = true`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Establecimiento no encontrado'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener establecimiento:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener establecimiento'
        });
    }
});

/* CREAR ESTABLECIMIENTO */
app.post('/establecimientos', async (req, res) => {
    try {
        const {
            nombre_establecimiento,
            direccion
        } = req.body;

        if (!nombre_establecimiento || !direccion) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO establecimiento
             (
                nombre_establecimiento,
                direccion,
                activo
             )
             VALUES ($1, $2, true)
             RETURNING *`,
            [
                nombre_establecimiento,
                direccion
            ]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al crear establecimiento:', error.message);

        res.status(500).json({
            mensaje: 'Error al crear establecimiento'
        });
    }
});

/* EDITAR ESTABLECIMIENTO */
app.put('/establecimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nombre_establecimiento,
            direccion
        } = req.body;

        if (!nombre_establecimiento || !direccion) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const resultado = await pool.query(
            `UPDATE establecimiento
             SET
                nombre_establecimiento = $1,
                direccion = $2
             WHERE id_establecimiento = $3
             AND activo = true
             RETURNING *`,
            [
                nombre_establecimiento,
                direccion,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Establecimiento no encontrado'
            });
        }

        res.json({
            mensaje: 'Establecimiento actualizado correctamente',
            establecimiento: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al editar establecimiento:', error.message);

        res.status(500).json({
            mensaje: 'Error al editar establecimiento'
        });
    }
});

/* ELIMINACIÓN LÓGICA DE ESTABLECIMIENTO */
app.delete('/establecimientos/:id', async (req, res) => {
    const cliente = await pool.connect();

    try {
        const { id } = req.params;

        await cliente.query('BEGIN');

        const resultado = await cliente.query(
            `UPDATE establecimiento
             SET
                activo = false,
                fecha_eliminacion = NOW()
             WHERE id_establecimiento = $1
             AND activo = true
             RETURNING *`,
            [id]
        );

        if (resultado.rows.length === 0) {
            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'Establecimiento no encontrado o ya eliminado'
            });
        }

        await cliente.query(
            `UPDATE camara
             SET
                activo = false,
                fecha_eliminacion = NOW()
             WHERE id_establecimiento = $1
             AND activo = true`,
            [id]
        );

        await cliente.query('COMMIT');

        res.json({
            mensaje: 'Establecimiento eliminado lógicamente'
        });

    } catch (error) {
        await cliente.query('ROLLBACK');

        console.error('Error al eliminar establecimiento:', error.message);

        res.status(500).json({
            mensaje: 'Error al eliminar establecimiento'
        });

    } finally {
        cliente.release();
    }
});

/* ============================================================
   CRUD CÁMARAS
============================================================ */

/* LISTAR CÁMARAS ACTIVAS */
app.get('/camaras', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                c.id_camara,
                c.id_establecimiento,
                c.codigo_camara,
                c.ubicacion,
                c.estado,
                e.nombre_establecimiento
             FROM camara c
             JOIN establecimiento e
             ON c.id_establecimiento = e.id_establecimiento
             WHERE c.activo = true
             AND e.activo = true
             ORDER BY c.codigo_camara`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error cámaras:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener cámaras'
        });
    }
});

/* OBTENER UNA CÁMARA */
app.get('/camaras/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT
                c.id_camara,
                c.id_establecimiento,
                c.codigo_camara,
                c.ubicacion,
                c.estado,
                e.nombre_establecimiento
             FROM camara c
             JOIN establecimiento e
             ON c.id_establecimiento = e.id_establecimiento
             WHERE c.id_camara = $1
             AND c.activo = true
             AND e.activo = true`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Cámara no encontrada'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener cámara:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener cámara'
        });
    }
});

/* CREAR CÁMARA */
app.post('/camaras', async (req, res) => {
    try {
        const {
            id_establecimiento,
            codigo_camara,
            ubicacion,
            estado
        } = req.body;

        if (!id_establecimiento || !codigo_camara || !ubicacion || !estado) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO camara
             (
                id_establecimiento,
                codigo_camara,
                ubicacion,
                estado,
                activo
             )
             VALUES ($1, $2, $3, $4, true)
             RETURNING *`,
            [
                id_establecimiento,
                codigo_camara,
                ubicacion,
                estado
            ]
        );

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al crear cámara:', error.message);

        res.status(500).json({
            mensaje: 'Error al crear cámara'
        });
    }
});

/* EDITAR CÁMARA */
app.put('/camaras/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            id_establecimiento,
            codigo_camara,
            ubicacion,
            estado
        } = req.body;

        if (!id_establecimiento || !codigo_camara || !ubicacion || !estado) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const resultado = await pool.query(
            `UPDATE camara
             SET
                id_establecimiento = $1,
                codigo_camara = $2,
                ubicacion = $3,
                estado = $4
             WHERE id_camara = $5
             AND activo = true
             RETURNING *`,
            [
                id_establecimiento,
                codigo_camara,
                ubicacion,
                estado,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Cámara no encontrada'
            });
        }

        res.json({
            mensaje: 'Cámara actualizada correctamente',
            camara: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al editar cámara:', error.message);

        res.status(500).json({
            mensaje: 'Error al editar cámara'
        });
    }
});

/* ELIMINACIÓN LÓGICA DE CÁMARA */
app.delete('/camaras/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `UPDATE camara
             SET
                activo = false,
                fecha_eliminacion = NOW()
             WHERE id_camara = $1
             AND activo = true
             RETURNING *`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Cámara no encontrada o ya eliminada'
            });
        }

        res.json({
            mensaje: 'Cámara eliminada lógicamente'
        });

    } catch (error) {
        console.error('Error al eliminar cámara:', error.message);

        res.status(500).json({
            mensaje: 'Error al eliminar cámara'
        });
    }
});

/* ============================================================
   REPORTES
============================================================ */

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