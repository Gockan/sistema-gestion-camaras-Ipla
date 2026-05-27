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

app.get('/incidencias', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                i.*,
                rc.observacion AS observacion_tecnica,
                rc.fecha_revision,
                ec.nombre_estado AS estado_camara_revision,
                u.nombre AS tecnico_responsable
             FROM incidencias i
             LEFT JOIN revision_camara rc
             ON i.id_revision = rc.id_revision
             LEFT JOIN estado_camara ec
             ON rc.id_estado = ec.id_estado
             LEFT JOIN usuario u
             ON rc.id_usuario = u.id_usuario
             WHERE i.activo = true
             ORDER BY i.fecha DESC`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error completo:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener incidencias'
        });
    }
});

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

app.post('/incidencias', async (req, res) => {
    try {
        const {
            sede,
            ubicacion,
            descripcion,
            estado,
            enviado_jefatura,
            id_camara
        } = req.body;

        const resultado = await pool.query(
            `INSERT INTO incidencias
            (
                sede,
                ubicacion,
                descripcion,
                estado,
                enviado_jefatura,
                activo,
                id_camara
            )
            VALUES ($1, $2, $3, $4, $5, true, $6)
            RETURNING *`,
            [
                sede,
                ubicacion,
                descripcion,
                estado,
                enviado_jefatura || false,
                id_camara || null
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

app.put('/incidencias/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            sede,
            ubicacion,
            descripcion,
            estado,
            enviado_jefatura,
            id_camara
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
                enviado_jefatura = $5,
                id_camara = $6
             WHERE id = $7
             AND activo = true
             RETURNING *`,
            [
                sede,
                ubicacion,
                descripcion,
                estado,
                enviado_jefatura || false,
                id_camara || null,
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
   PERFILES / ROLES
============================================================ */

app.get('/perfiles', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT *
             FROM perfil
             ORDER BY id_perfil`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error al obtener perfiles:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener perfiles'
        });
    }
});

/* ============================================================
   CRUD USUARIOS
============================================================ */

app.get('/usuarios', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                u.id_usuario,
                u.nombre,
                u.correo,
                u.id_perfil,
                p.nombre_perfil,
                u.estado_usuario
             FROM usuario u
             JOIN perfil p
             ON u.id_perfil = p.id_perfil
             WHERE u.estado_usuario = true
             ORDER BY u.id_usuario`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error al obtener usuarios:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener usuarios'
        });
    }
});

app.get('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT
                u.id_usuario,
                u.nombre,
                u.correo,
                u.id_perfil,
                p.nombre_perfil,
                u.estado_usuario
             FROM usuario u
             JOIN perfil p
             ON u.id_perfil = p.id_perfil
             WHERE u.id_usuario = $1
             AND u.estado_usuario = true`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener usuario:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener usuario'
        });
    }
});

app.post('/usuarios', async (req, res) => {
    try {
        const {
            nombre,
            correo,
            password,
            id_perfil
        } = req.body;

        if (!nombre || !correo || !password || !id_perfil) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const perfilExiste = await pool.query(
            `SELECT id_perfil
             FROM perfil
             WHERE id_perfil = $1`,
            [id_perfil]
        );

        if (perfilExiste.rows.length === 0) {
            return res.status(400).json({
                mensaje: 'Perfil no válido'
            });
        }

        const usuarioExistente = await pool.query(
            `SELECT id_usuario, estado_usuario
             FROM usuario
             WHERE correo = $1`,
            [correo]
        );

        const hash = await bcrypt.hash(password, 10);

        if (usuarioExistente.rows.length > 0) {
            const usuario = usuarioExistente.rows[0];

            if (usuario.estado_usuario === true) {
                return res.status(409).json({
                    mensaje: 'Ya existe un usuario activo con ese correo'
                });
            }

            const restaurado = await pool.query(
                `UPDATE usuario
                 SET
                    nombre = $1,
                    correo = $2,
                    contrasena_hash = $3,
                    id_perfil = $4,
                    estado_usuario = true
                 WHERE id_usuario = $5
                 RETURNING id_usuario, nombre, correo, id_perfil, estado_usuario`,
                [
                    nombre,
                    correo,
                    hash,
                    id_perfil,
                    usuario.id_usuario
                ]
            );

            return res.json({
                mensaje: 'Usuario restaurado y actualizado correctamente',
                usuario: restaurado.rows[0]
            });
        }

        const resultado = await pool.query(
            `INSERT INTO usuario
             (
                nombre,
                correo,
                contrasena_hash,
                id_perfil,
                estado_usuario
             )
             VALUES ($1, $2, $3, $4, true)
             RETURNING id_usuario, nombre, correo, id_perfil, estado_usuario`,
            [
                nombre,
                correo,
                hash,
                id_perfil
            ]
        );

        res.json({
            mensaje: 'Usuario creado correctamente',
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al crear usuario:', error.message);

        res.status(500).json({
            mensaje: 'Error al crear usuario'
        });
    }
});

app.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nombre,
            correo,
            id_perfil
        } = req.body;

        if (!nombre || !correo || !id_perfil) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const perfilExiste = await pool.query(
            `SELECT id_perfil
             FROM perfil
             WHERE id_perfil = $1`,
            [id_perfil]
        );

        if (perfilExiste.rows.length === 0) {
            return res.status(400).json({
                mensaje: 'Perfil no válido'
            });
        }

        const correoExiste = await pool.query(
            `SELECT id_usuario
             FROM usuario
             WHERE correo = $1
             AND id_usuario <> $2
             AND estado_usuario = true`,
            [correo, id]
        );

        if (correoExiste.rows.length > 0) {
            return res.status(409).json({
                mensaje: 'Ya existe otro usuario activo con ese correo'
            });
        }

        const resultado = await pool.query(
            `UPDATE usuario
             SET
                nombre = $1,
                correo = $2,
                id_perfil = $3
             WHERE id_usuario = $4
             AND estado_usuario = true
             RETURNING id_usuario, nombre, correo, id_perfil, estado_usuario`,
            [
                nombre,
                correo,
                id_perfil,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json({
            mensaje: 'Usuario actualizado correctamente',
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al editar usuario:', error.message);

        res.status(500).json({
            mensaje: 'Error al editar usuario'
        });
    }
});

app.put('/usuarios/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                mensaje: 'Debe ingresar una contraseña'
            });
        }

        const hash = await bcrypt.hash(password, 10);

        const resultado = await pool.query(
            `UPDATE usuario
             SET contrasena_hash = $1
             WHERE id_usuario = $2
             AND estado_usuario = true
             RETURNING id_usuario, nombre, correo`,
            [
                hash,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json({
            mensaje: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error.message);

        res.status(500).json({
            mensaje: 'Error al cambiar contraseña'
        });
    }
});

app.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_usuario_actual } = req.body;

        if (String(id) === String(id_usuario_actual)) {
            return res.status(400).json({
                mensaje: 'No puede eliminar su propia cuenta de administrador mientras está en sesión.'
            });
        }

        const usuarioEliminar = await pool.query(
            `SELECT
                u.id_usuario,
                u.nombre,
                u.correo,
                p.nombre_perfil
             FROM usuario u
             JOIN perfil p
             ON u.id_perfil = p.id_perfil
             WHERE u.id_usuario = $1
             AND u.estado_usuario = true`,
            [id]
        );

        if (usuarioEliminar.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado o ya eliminado'
            });
        }

        const usuario = usuarioEliminar.rows[0];

        if (usuario.nombre_perfil === 'Administrador') {
            const administradoresActivos = await pool.query(
                `SELECT COUNT(*) AS total
                 FROM usuario u
                 JOIN perfil p
                 ON u.id_perfil = p.id_perfil
                 WHERE p.nombre_perfil = 'Administrador'
                 AND u.estado_usuario = true`
            );

            const totalAdministradores = Number(administradoresActivos.rows[0].total);

            if (totalAdministradores <= 1) {
                return res.status(400).json({
                    mensaje: 'No se puede eliminar este usuario porque es el último administrador activo del sistema.'
                });
            }
        }

        const resultado = await pool.query(
            `UPDATE usuario
             SET
                estado_usuario = false,
                fecha_eliminacion = NOW()
             WHERE id_usuario = $1
             AND estado_usuario = true
             RETURNING id_usuario, nombre, correo`,
            [id]
        );

        res.json({
            mensaje: 'Usuario eliminado lógicamente',
            usuario: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error.message);

        res.status(500).json({
            mensaje: 'Error al eliminar usuario'
        });
    }
});

/* ============================================================
   ESTADOS DE CÁMARA
============================================================ */

app.get('/estados-camara', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT *
             FROM estado_camara
             ORDER BY id_estado`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error al obtener estados de cámara:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener estados de cámara'
        });
    }
});

/* ============================================================
   REVISIÓN TÉCNICA
============================================================ */

app.post('/incidencias/:id/revision', async (req, res) => {
    const cliente = await pool.connect();

    try {
        const { id } = req.params;

        const {
            id_usuario,
            nombre_usuario,
            id_estado,
            estado_atencion,
            observacion
        } = req.body;

        if (!id_estado || !estado_atencion || !observacion) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios para registrar la revisión'
            });
        }

        await cliente.query('BEGIN');

        const incidencia = await cliente.query(
            `SELECT *
             FROM incidencias
             WHERE id = $1
             AND activo = true`,
            [id]
        );

        if (incidencia.rows.length === 0) {
            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'Incidencia no encontrada'
            });
        }

        let idCamara = incidencia.rows[0].id_camara;

        if (!idCamara && incidencia.rows[0].ubicacion) {
            const camaraEncontrada = await cliente.query(
                `SELECT id_camara
                 FROM camara
                 WHERE $1 LIKE codigo_camara || '%'
                 AND activo = true
                 LIMIT 1`,
                [incidencia.rows[0].ubicacion]
            );

            if (camaraEncontrada.rows.length > 0) {
                idCamara = camaraEncontrada.rows[0].id_camara;
            }
        }

        let idUsuarioTecnico = id_usuario || null;

        if (!idUsuarioTecnico && nombre_usuario) {
            const usuarioTecnico = await cliente.query(
                `SELECT id_usuario
                 FROM usuario
                 WHERE nombre = $1
                 AND estado_usuario = true
                 LIMIT 1`,
                [nombre_usuario]
            );

            if (usuarioTecnico.rows.length > 0) {
                idUsuarioTecnico = usuarioTecnico.rows[0].id_usuario;
            }
        }

        const nuevoIdRevision = await cliente.query(
            `SELECT COALESCE(MAX(id_revision), 0) + 1 AS nuevo_id
             FROM revision_camara`
        );

        const idRevision = nuevoIdRevision.rows[0].nuevo_id;

        await cliente.query(
            `INSERT INTO revision_camara
             (
                id_revision,
                id_usuario,
                id_camara,
                id_estado,
                fecha_revision,
                observacion,
                activo
             )
             VALUES ($1, $2, $3, $4, NOW(), $5, true)`,
            [
                idRevision,
                idUsuarioTecnico,
                idCamara,
                id_estado,
                observacion
            ]
        );

        await cliente.query(
            `UPDATE incidencias
             SET
                estado = $1,
                id_revision = $2,
                id_camara = COALESCE(id_camara, $3)
             WHERE id = $4
             AND activo = true`,
            [
                estado_atencion,
                idRevision,
                idCamara,
                id
            ]
        );

        if (idCamara) {
            const estadoCamara = await cliente.query(
                `SELECT nombre_estado
                 FROM estado_camara
                 WHERE id_estado = $1`,
                [id_estado]
            );

            if (estadoCamara.rows.length > 0) {
                await cliente.query(
                    `UPDATE camara
                     SET estado = $1
                     WHERE id_camara = $2
                     AND activo = true`,
                    [
                        estadoCamara.rows[0].nombre_estado,
                        idCamara
                    ]
                );
            }
        }

        await cliente.query('COMMIT');

        res.json({
            mensaje: 'Revisión técnica registrada correctamente'
        });

    } catch (error) {
        await cliente.query('ROLLBACK');

        console.error('Error al registrar revisión técnica:', error.message);

        res.status(500).json({
            mensaje: 'Error al registrar revisión técnica'
        });

    } finally {
        cliente.release();
    }
});

/* ============================================================
   CRUD REVISIONES TÉCNICAS
============================================================ */

app.get('/revisiones', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                rc.id_revision,
                rc.id_usuario,
                rc.id_camara,
                rc.id_estado,
                rc.fecha_revision,
                rc.observacion,
                rc.activo,
                u.nombre AS tecnico_responsable,
                c.codigo_camara,
                c.ubicacion AS ubicacion_camara,
                e.nombre_establecimiento,
                ec.nombre_estado,
                i.id AS id_incidencia,
                i.estado AS estado_incidencia
             FROM revision_camara rc
             LEFT JOIN usuario u
             ON rc.id_usuario = u.id_usuario
             LEFT JOIN camara c
             ON rc.id_camara = c.id_camara
             LEFT JOIN establecimiento e
             ON c.id_establecimiento = e.id_establecimiento
             LEFT JOIN estado_camara ec
             ON rc.id_estado = ec.id_estado
             LEFT JOIN incidencias i
             ON i.id_revision = rc.id_revision
             WHERE rc.activo = true
             ORDER BY rc.fecha_revision DESC, rc.id_revision DESC`
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error('Error al obtener revisiones:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener revisiones técnicas'
        });
    }
});

app.get('/revisiones/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            `SELECT
                rc.id_revision,
                rc.id_usuario,
                rc.id_camara,
                rc.id_estado,
                rc.fecha_revision,
                rc.observacion,
                rc.activo,
                u.nombre AS tecnico_responsable,
                c.codigo_camara,
                c.ubicacion AS ubicacion_camara,
                e.nombre_establecimiento,
                ec.nombre_estado,
                i.id AS id_incidencia,
                i.estado AS estado_incidencia
             FROM revision_camara rc
             LEFT JOIN usuario u
             ON rc.id_usuario = u.id_usuario
             LEFT JOIN camara c
             ON rc.id_camara = c.id_camara
             LEFT JOIN establecimiento e
             ON c.id_establecimiento = e.id_establecimiento
             LEFT JOIN estado_camara ec
             ON rc.id_estado = ec.id_estado
             LEFT JOIN incidencias i
             ON i.id_revision = rc.id_revision
             WHERE rc.id_revision = $1
             AND rc.activo = true`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'Revisión técnica no encontrada'
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener revisión:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener revisión técnica'
        });
    }
});

app.put('/revisiones/:id', async (req, res) => {
    const cliente = await pool.connect();

    try {
        const { id } = req.params;

        const {
            id_estado,
            observacion,
            estado_atencion
        } = req.body;

        if (!id_estado || !observacion || !estado_atencion) {
            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios para actualizar la revisión'
            });
        }

        await cliente.query('BEGIN');

        const revisionActual = await cliente.query(
            `SELECT *
             FROM revision_camara
             WHERE id_revision = $1
             AND activo = true`,
            [id]
        );

        if (revisionActual.rows.length === 0) {
            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'Revisión técnica no encontrada'
            });
        }

        const revision = revisionActual.rows[0];

        await cliente.query(
            `UPDATE revision_camara
             SET
                id_estado = $1,
                observacion = $2
             WHERE id_revision = $3
             AND activo = true`,
            [
                id_estado,
                observacion,
                id
            ]
        );

        await cliente.query(
            `UPDATE incidencias
             SET estado = $1
             WHERE id_revision = $2
             AND activo = true`,
            [
                estado_atencion,
                id
            ]
        );

        if (revision.id_camara) {
            const estadoCamara = await cliente.query(
                `SELECT nombre_estado
                 FROM estado_camara
                 WHERE id_estado = $1`,
                [id_estado]
            );

            if (estadoCamara.rows.length > 0) {
                await cliente.query(
                    `UPDATE camara
                     SET estado = $1
                     WHERE id_camara = $2
                     AND activo = true`,
                    [
                        estadoCamara.rows[0].nombre_estado,
                        revision.id_camara
                    ]
                );
            }
        }

        await cliente.query('COMMIT');

        res.json({
            mensaje: 'Revisión técnica actualizada correctamente'
        });

    } catch (error) {
        await cliente.query('ROLLBACK');

        console.error('Error al actualizar revisión:', error.message);

        res.status(500).json({
            mensaje: 'Error al actualizar revisión técnica'
        });

    } finally {
        cliente.release();
    }
});

app.delete('/revisiones/:id', async (req, res) => {
    const cliente = await pool.connect();

    try {
        const { id } = req.params;

        await cliente.query('BEGIN');

        const revision = await cliente.query(
            `UPDATE revision_camara
             SET
                activo = false,
                fecha_eliminacion = NOW()
             WHERE id_revision = $1
             AND activo = true
             RETURNING *`,
            [id]
        );

        if (revision.rows.length === 0) {
            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensaje: 'Revisión técnica no encontrada o ya anulada'
            });
        }

        await cliente.query(
            `UPDATE incidencias
             SET
                id_revision = NULL,
                estado = 'Pendiente'
             WHERE id_revision = $1
             AND activo = true`,
            [id]
        );

        await cliente.query('COMMIT');

        res.json({
            mensaje: 'Revisión técnica anulada lógicamente'
        });

    } catch (error) {
        await cliente.query('ROLLBACK');

        console.error('Error al anular revisión:', error.message);

        res.status(500).json({
            mensaje: 'Error al anular revisión técnica'
        });

    } finally {
        cliente.release();
    }
});

/* ============================================================
   REGISTROS ELIMINADOS / PAPELERA ADMINISTRATIVA
============================================================ */

app.get('/admin/eliminados/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;

        let resultado;

        if (tipo === 'usuarios') {
            resultado = await pool.query(
                `SELECT
                    u.id_usuario,
                    u.nombre,
                    u.correo,
                    u.estado_usuario,
                    u.fecha_eliminacion,
                    p.nombre_perfil
                 FROM usuario u
                 JOIN perfil p
                 ON u.id_perfil = p.id_perfil
                 WHERE u.estado_usuario = false
                 ORDER BY u.fecha_eliminacion DESC NULLS LAST, u.id_usuario DESC`
            );

            return res.json(resultado.rows);
        }

        if (tipo === 'incidencias') {
            resultado = await pool.query(
                `SELECT
                    id,
                    sede,
                    ubicacion,
                    descripcion,
                    estado,
                    enviado_jefatura,
                    fecha,
                    activo,
                    fecha_eliminacion
                 FROM incidencias
                 WHERE activo = false
                 ORDER BY fecha_eliminacion DESC NULLS LAST, id DESC`
            );

            return res.json(resultado.rows);
        }

        if (tipo === 'camaras') {
            resultado = await pool.query(
                `SELECT
                    c.id_camara,
                    c.id_establecimiento,
                    c.codigo_camara,
                    c.ubicacion,
                    c.estado,
                    c.activo,
                    c.fecha_eliminacion,
                    e.nombre_establecimiento
                 FROM camara c
                 LEFT JOIN establecimiento e
                 ON c.id_establecimiento = e.id_establecimiento
                 WHERE c.activo = false
                 ORDER BY c.fecha_eliminacion DESC NULLS LAST, c.id_camara DESC`
            );

            return res.json(resultado.rows);
        }

        if (tipo === 'establecimientos') {
            resultado = await pool.query(
                `SELECT
                    id_establecimiento,
                    nombre_establecimiento,
                    direccion,
                    activo,
                    fecha_eliminacion
                 FROM establecimiento
                 WHERE activo = false
                 ORDER BY fecha_eliminacion DESC NULLS LAST, id_establecimiento DESC`
            );

            return res.json(resultado.rows);
        }

        if (tipo === 'revisiones') {
            resultado = await pool.query(
                `SELECT
                    rc.id_revision,
                    rc.id_usuario,
                    rc.id_camara,
                    rc.id_estado,
                    rc.fecha_revision,
                    rc.observacion,
                    rc.activo,
                    rc.fecha_eliminacion,
                    u.nombre AS tecnico_responsable,
                    c.codigo_camara,
                    c.ubicacion AS ubicacion_camara,
                    e.nombre_establecimiento,
                    ec.nombre_estado
                 FROM revision_camara rc
                 LEFT JOIN usuario u
                 ON rc.id_usuario = u.id_usuario
                 LEFT JOIN camara c
                 ON rc.id_camara = c.id_camara
                 LEFT JOIN establecimiento e
                 ON c.id_establecimiento = e.id_establecimiento
                 LEFT JOIN estado_camara ec
                 ON rc.id_estado = ec.id_estado
                 WHERE rc.activo = false
                 ORDER BY rc.fecha_eliminacion DESC NULLS LAST, rc.id_revision DESC`
            );

            return res.json(resultado.rows);
        }

        res.status(400).json({
            mensaje: 'Tipo de registro no válido'
        });

    } catch (error) {
        console.error('Error al obtener registros eliminados:', error.message);

        res.status(500).json({
            mensaje: 'Error al obtener registros eliminados'
        });
    }
});

app.put('/admin/restaurar/:tipo/:id', async (req, res) => {
    try {
        const { tipo, id } = req.params;

        if (tipo === 'usuarios') {
            const resultado = await pool.query(
                `UPDATE usuario
                 SET
                    estado_usuario = true,
                    fecha_eliminacion = NULL
                 WHERE id_usuario = $1
                 AND estado_usuario = false
                 RETURNING id_usuario, nombre, correo`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: 'Usuario no encontrado o ya activo'
                });
            }

            return res.json({
                mensaje: 'Usuario restaurado correctamente'
            });
        }

        if (tipo === 'incidencias') {
            const resultado = await pool.query(
                `UPDATE incidencias
                 SET
                    activo = true,
                    fecha_eliminacion = NULL
                 WHERE id = $1
                 AND activo = false
                 RETURNING id`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: 'Incidencia no encontrada o ya activa'
                });
            }

            return res.json({
                mensaje: 'Incidencia restaurada correctamente'
            });
        }

        if (tipo === 'establecimientos') {
            const resultado = await pool.query(
                `UPDATE establecimiento
                 SET
                    activo = true,
                    fecha_eliminacion = NULL
                 WHERE id_establecimiento = $1
                 AND activo = false
                 RETURNING id_establecimiento`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: 'Establecimiento no encontrado o ya activo'
                });
            }

            return res.json({
                mensaje: 'Establecimiento restaurado correctamente'
            });
        }

        if (tipo === 'camaras') {
            const camara = await pool.query(
                `SELECT
                    c.id_camara,
                    c.id_establecimiento,
                    e.activo AS establecimiento_activo
                 FROM camara c
                 LEFT JOIN establecimiento e
                 ON c.id_establecimiento = e.id_establecimiento
                 WHERE c.id_camara = $1
                 AND c.activo = false`,
                [id]
            );

            if (camara.rows.length === 0) {
                return res.status(404).json({
                    mensaje: 'Cámara no encontrada o ya activa'
                });
            }

            if (camara.rows[0].establecimiento_activo !== true) {
                return res.status(400).json({
                    mensaje: 'No se puede restaurar la cámara porque su establecimiento asociado está eliminado. Restaure primero el establecimiento.'
                });
            }

            await pool.query(
                `UPDATE camara
                 SET
                    activo = true,
                    fecha_eliminacion = NULL
                 WHERE id_camara = $1
                 AND activo = false`,
                [id]
            );

            return res.json({
                mensaje: 'Cámara restaurada correctamente'
            });
        }

        if (tipo === 'revisiones') {
            const resultado = await pool.query(
                `UPDATE revision_camara
                 SET
                    activo = true,
                    fecha_eliminacion = NULL
                 WHERE id_revision = $1
                 AND activo = false
                 RETURNING id_revision`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    mensaje: 'Revisión no encontrada o ya activa'
                });
            }

            return res.json({
                mensaje: 'Revisión técnica restaurada correctamente'
            });
        }

        res.status(400).json({
            mensaje: 'Tipo de registro no válido'
        });

    } catch (error) {
        console.error('Error al restaurar registro:', error.message);

        res.status(500).json({
            mensaje: 'Error al restaurar registro'
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