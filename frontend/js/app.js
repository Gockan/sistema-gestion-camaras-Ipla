const API_URL = 'https://sistema-gestion-camaras-ipla.onrender.com';

function obtenerIdIncidenciaDesdeURL() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('id');
}

async function cargarEstablecimientos(valorSeleccionado = '') {
    try {
        const respuesta = await fetch(`${API_URL}/establecimientos`);
        const datos = await respuesta.json();

        const select = document.getElementById('establecimiento');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione establecimiento</option>';

        datos.forEach(item => {
            const selected = item.nombre_establecimiento === valorSeleccionado
                ? 'selected'
                : '';

            select.innerHTML += `
                <option value="${item.nombre_establecimiento}" ${selected}>
                    ${item.nombre_establecimiento}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
    }
}

async function cargarCamaras(valorSeleccionado = '') {
    try {
        const respuesta = await fetch(`${API_URL}/camaras`);
        const datos = await respuesta.json();

        const select = document.getElementById('camara');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione cámara</option>';

        datos.forEach(item => {
            const selected = item.codigo_camara === valorSeleccionado
                ? 'selected'
                : '';

            select.innerHTML += `
                <option value="${item.codigo_camara}" ${selected}>
                    ${item.codigo_camara} - ${item.ubicacion}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
    }
}

async function iniciarFormularioIncidencia() {
    const id = obtenerIdIncidenciaDesdeURL();

    await cargarEstablecimientos();
    await cargarCamaras();

    if (id) {
        await cargarIncidenciaParaEditar(id);
    }
}

async function cargarIncidenciaParaEditar(id) {
    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}`);

        if (!respuesta.ok) {
            alert('No se pudo cargar la incidencia para editar');
            window.location.href = 'historial.html';
            return;
        }

        const incidencia = await respuesta.json();

        document.getElementById('tituloFormulario').innerText = 'Editar Incidencia';

        await cargarEstablecimientos(incidencia.sede);
        await cargarCamaras(incidencia.ubicacion);

        document.getElementById('descripcion').value = incidencia.descripcion;
        document.getElementById('enviado_jefatura').checked = incidencia.enviado_jefatura;

        const estadoCamara = document.getElementById('estado_camara');

        if (estadoCamara) {
            estadoCamara.value = '';
        }

    } catch (error) {
        console.error(error);
        alert('Error al cargar incidencia');
    }
}

async function guardarIncidencia() {
    const id = obtenerIdIncidenciaDesdeURL();

    if (id) {
        await actualizarIncidencia(id);
    } else {
        await registrarIncidencia();
    }
}

async function registrarIncidencia() {
    const sede = document.getElementById('establecimiento').value;
    const ubicacion = document.getElementById('camara').value;
    const estadoDetectado = document.getElementById('estado_camara').value;
    const descripcion = document.getElementById('descripcion').value;
    const enviado_jefatura = document.getElementById('enviado_jefatura').checked;

    const estado = 'Pendiente';

    if (
        sede === '' ||
        ubicacion === '' ||
        estadoDetectado === '' ||
        descripcion.trim() === ''
    ) {
        alert('Complete todos los campos');
        return;
    }

    const datos = {
        sede,
        ubicacion,
        descripcion: `${estadoDetectado}: ${descripcion.trim()}`,
        estado,
        enviado_jefatura
    };

    try {
        const respuesta = await fetch(`${API_URL}/incidencias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert('Incidencia registrada');
            window.location.href = 'historial.html';
        } else {
            alert('Error al registrar incidencia');
        }

    } catch (error) {
        console.error(error);
        alert('Error al registrar');
    }
}

async function actualizarIncidencia(id) {
    const sede = document.getElementById('establecimiento').value;
    const ubicacion = document.getElementById('camara').value;
    const estadoDetectado = document.getElementById('estado_camara').value;
    const descripcion = document.getElementById('descripcion').value;
    const enviado_jefatura = document.getElementById('enviado_jefatura').checked;

    if (
        sede === '' ||
        ubicacion === '' ||
        descripcion.trim() === ''
    ) {
        alert('Complete todos los campos');
        return;
    }

    try {
        const respuestaActual = await fetch(`${API_URL}/incidencias/${id}`);

        if (!respuestaActual.ok) {
            alert('No se pudo obtener la incidencia actual');
            return;
        }

        const incidenciaActual = await respuestaActual.json();

        let descripcionFinal = descripcion.trim();

        if (estadoDetectado !== '') {
            descripcionFinal = `${estadoDetectado}: ${descripcion.trim()}`;
        }

        const datos = {
            sede,
            ubicacion,
            descripcion: descripcionFinal,
            estado: incidenciaActual.estado,
            enviado_jefatura
        };

        const respuesta = await fetch(`${API_URL}/incidencias/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert('Incidencia actualizada correctamente');
            window.location.href = 'historial.html';
        } else {
            alert('Error al actualizar incidencia');
        }

    } catch (error) {
        console.error(error);
        alert('Error al actualizar incidencia');
    }
}

async function cargarIncidencias() {
    const tabla = document.getElementById('tabla-incidencias');

    if (!tabla) {
        return;
    }

    const rol = localStorage.getItem('rol');

    try {
        const respuesta = await fetch(`${API_URL}/incidencias`);
        const incidencias = await respuesta.json();

        tabla.innerHTML = '';

        incidencias.forEach(incidencia => {
            const fila = document.createElement('tr');

            const reporte = incidencia.enviado_jefatura
                ? 'Enviado'
                : 'No enviado';

            let acciones = '';

            if (rol === 'Operador') {
                acciones = `
                    <button onclick="window.location.href='registrar.html?id=${incidencia.id}'">
                        Editar
                    </button>

                    <button onclick="generarReporte(${incidencia.id})">
                        Generar reporte
                    </button>

                    <button onclick="eliminarIncidencia(${incidencia.id})">
                        Eliminar
                    </button>
                `;
            }

            if (rol === 'Tecnico') {
                acciones = `
                    <button onclick="actualizarEstado(${incidencia.id}, 'En revisión')">
                        En revisión
                    </button>

                    <button onclick="actualizarEstado(${incidencia.id}, 'Resuelto')">
                        Resuelto
                    </button>
                `;
            }

            if (rol === 'Administrador') {
                acciones = `
                    <button onclick="window.location.href='registrar.html?id=${incidencia.id}'">
                        Editar
                    </button>

                    <button onclick="generarReporte(${incidencia.id})">
                        Generar reporte
                    </button>

                    <button onclick="actualizarEstado(${incidencia.id}, 'En revisión')">
                        En revisión
                    </button>

                    <button onclick="actualizarEstado(${incidencia.id}, 'Resuelto')">
                        Resuelto
                    </button>

                    <button onclick="eliminarIncidencia(${incidencia.id})">
                        Eliminar
                    </button>
                `;
            }

            fila.innerHTML = `
                <td>${incidencia.id}</td>
                <td>${incidencia.sede}</td>
                <td>${incidencia.ubicacion}</td>
                <td>${incidencia.descripcion}</td>
                <td>${incidencia.estado}</td>
                <td>${reporte}</td>
                <td>${new Date(incidencia.fecha).toLocaleString()}</td>
                <td>${acciones}</td>
            `;

            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar incidencias');
    }
}

async function generarReporte(id) {
    const confirmar = confirm('¿Desea generar y enviar este reporte a jefatura?');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}/reporte`, {
            method: 'PUT'
        });

        if (respuesta.ok) {
            alert('Reporte enviado a jefatura');
            cargarIncidencias();
        } else {
            alert('Error al generar reporte');
        }

    } catch (error) {
        console.error(error);
        alert('Error al generar reporte');
    }
}

async function actualizarEstado(id, estado) {
    const rol = localStorage.getItem('rol');

    if (rol !== 'Tecnico' && rol !== 'Administrador') {
        alert('No tiene permisos para cambiar el estado de la incidencia');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}/estado`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado })
        });

        if (respuesta.ok) {
            alert('Estado actualizado');
            cargarIncidencias();
        } else {
            alert('Error al actualizar estado');
        }

    } catch (error) {
        console.error(error);
        alert('Error al actualizar estado');
    }
}

async function eliminarIncidencia(id) {
    const confirmar = confirm('¿Desea eliminar esta incidencia? Esta acción será lógica, no borrará el registro definitivamente.');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert('Incidencia eliminada lógicamente');
            cargarIncidencias();
        } else {
            alert('Error al eliminar incidencia');
        }

    } catch (error) {
        console.error(error);
        alert('Error al eliminar incidencia');
    }
}