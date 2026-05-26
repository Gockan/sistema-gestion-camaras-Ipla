const API_URL = 'https://sistema-gestion-camaras-ipla.onrender.com';

/* ============================================================
   UTILIDADES
============================================================ */

function obtenerIdIncidenciaDesdeURL() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('id');
}

/* ============================================================
   FORMULARIO INCIDENCIAS
============================================================ */

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

        select.onchange = async function () {
            const establecimientoSeleccionado = select.value;
            await cargarCamaras('', establecimientoSeleccionado);
        };

    } catch (error) {
        console.error(error);
    }
}

async function cargarCamaras(valorSeleccionado = '', establecimientoSeleccionado = '') {
    try {
        const respuesta = await fetch(`${API_URL}/camaras`);
        const datos = await respuesta.json();

        const select = document.getElementById('camara');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione cámara</option>';

        if (establecimientoSeleccionado === '') {
            select.innerHTML = '<option value="">Primero seleccione establecimiento</option>';
            return;
        }

        const camarasFiltradas = datos.filter(item =>
            item.nombre_establecimiento === establecimientoSeleccionado
        );

        if (camarasFiltradas.length === 0) {
            select.innerHTML = '<option value="">No hay cámaras para este establecimiento</option>';
            return;
        }

        camarasFiltradas.forEach(item => {
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

    const selectEstablecimiento = document.getElementById('establecimiento');

    if (selectEstablecimiento) {
        await cargarCamaras('', selectEstablecimiento.value);
    }

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
        await cargarCamaras(incidencia.ubicacion, incidencia.sede);

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

/* ============================================================
   CRUD ESTABLECIMIENTOS
============================================================ */

async function iniciarFormularioEstablecimiento() {
    await cargarEstablecimientosGestion();
}

function limpiarFormularioEstablecimiento() {
    document.getElementById('id_establecimiento').value = '';
    document.getElementById('nombre_establecimiento').value = '';
    document.getElementById('direccion').value = '';
    document.getElementById('tituloFormularioEstablecimiento').innerText = 'Registrar Establecimiento';
}

async function guardarEstablecimiento() {
    const id = document.getElementById('id_establecimiento').value;
    const nombre_establecimiento = document.getElementById('nombre_establecimiento').value;
    const direccion = document.getElementById('direccion').value;

    if (
        nombre_establecimiento.trim() === '' ||
        direccion.trim() === ''
    ) {
        alert('Complete todos los campos');
        return;
    }

    const datos = {
        nombre_establecimiento: nombre_establecimiento.trim(),
        direccion: direccion.trim()
    };

    try {
        let url = `${API_URL}/establecimientos`;
        let metodo = 'POST';

        if (id !== '') {
            url = `${API_URL}/establecimientos/${id}`;
            metodo = 'PUT';
        }

        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert(id === '' ? 'Establecimiento registrado' : 'Establecimiento actualizado');
            limpiarFormularioEstablecimiento();
            cargarEstablecimientosGestion();
        } else {
            alert('Error al guardar establecimiento');
        }

    } catch (error) {
        console.error(error);
        alert('Error al guardar establecimiento');
    }
}

async function cargarEstablecimientosGestion() {
    const tabla = document.getElementById('tabla-establecimientos');

    if (!tabla) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/establecimientos`);
        const establecimientos = await respuesta.json();

        tabla.innerHTML = '';

        establecimientos.forEach(item => {
            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${item.id_establecimiento}</td>
                <td>${item.nombre_establecimiento}</td>
                <td>${item.direccion}</td>
                <td>
                    <button onclick="editarEstablecimiento(${item.id_establecimiento})">
                        Editar
                    </button>

                    <button onclick="eliminarEstablecimiento(${item.id_establecimiento})">
                        Eliminar
                    </button>
                </td>
            `;

            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar establecimientos');
    }
}

async function editarEstablecimiento(id) {
    try {
        const respuesta = await fetch(`${API_URL}/establecimientos/${id}`);

        if (!respuesta.ok) {
            alert('No se pudo obtener el establecimiento');
            return;
        }

        const establecimiento = await respuesta.json();

        document.getElementById('tituloFormularioEstablecimiento').innerText = 'Editar Establecimiento';
        document.getElementById('id_establecimiento').value = establecimiento.id_establecimiento;
        document.getElementById('nombre_establecimiento').value = establecimiento.nombre_establecimiento;
        document.getElementById('direccion').value = establecimiento.direccion;

        window.scrollTo(0, 0);

    } catch (error) {
        console.error(error);
        alert('Error al editar establecimiento');
    }
}

async function eliminarEstablecimiento(id) {
    const confirmar = confirm('¿Desea eliminar este establecimiento? También se ocultarán sus cámaras asociadas. La eliminación será lógica.');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/establecimientos/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert('Establecimiento eliminado lógicamente');
            cargarEstablecimientosGestion();
        } else {
            alert('Error al eliminar establecimiento');
        }

    } catch (error) {
        console.error(error);
        alert('Error al eliminar establecimiento');
    }
}

/* ============================================================
   CRUD CÁMARAS
============================================================ */

async function iniciarFormularioCamara() {
    await cargarEstablecimientosParaCamara();
    await cargarCamarasGestion();
}

function limpiarFormularioCamara() {
    document.getElementById('id_camara').value = '';
    document.getElementById('id_establecimiento_camara').value = '';
    document.getElementById('codigo_camara').value = '';
    document.getElementById('ubicacion_camara').value = '';
    document.getElementById('estado_camara_gestion').value = '';
    document.getElementById('tituloFormularioCamara').innerText = 'Registrar Cámara';
}

async function cargarEstablecimientosParaCamara(valorSeleccionado = '') {
    try {
        const respuesta = await fetch(`${API_URL}/establecimientos`);
        const establecimientos = await respuesta.json();

        const select = document.getElementById('id_establecimiento_camara');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione establecimiento</option>';

        establecimientos.forEach(item => {
            const selected = String(item.id_establecimiento) === String(valorSeleccionado)
                ? 'selected'
                : '';

            select.innerHTML += `
                <option value="${item.id_establecimiento}" ${selected}>
                    ${item.nombre_establecimiento}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar establecimientos');
    }
}

async function guardarCamara() {
    const id = document.getElementById('id_camara').value;
    const id_establecimiento = document.getElementById('id_establecimiento_camara').value;
    const codigo_camara = document.getElementById('codigo_camara').value;
    const ubicacion = document.getElementById('ubicacion_camara').value;
    const estado = document.getElementById('estado_camara_gestion').value;

    if (
        id_establecimiento === '' ||
        codigo_camara.trim() === '' ||
        ubicacion.trim() === '' ||
        estado === ''
    ) {
        alert('Complete todos los campos');
        return;
    }

    const datos = {
        id_establecimiento,
        codigo_camara: codigo_camara.trim(),
        ubicacion: ubicacion.trim(),
        estado
    };

    try {
        let url = `${API_URL}/camaras`;
        let metodo = 'POST';

        if (id !== '') {
            url = `${API_URL}/camaras/${id}`;
            metodo = 'PUT';
        }

        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert(id === '' ? 'Cámara registrada' : 'Cámara actualizada');
            limpiarFormularioCamara();
            await cargarEstablecimientosParaCamara();
            await cargarCamarasGestion();
        } else {
            alert('Error al guardar cámara');
        }

    } catch (error) {
        console.error(error);
        alert('Error al guardar cámara');
    }
}

async function cargarCamarasGestion() {
    const tabla = document.getElementById('tabla-camaras');

    if (!tabla) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/camaras`);
        const camaras = await respuesta.json();

        tabla.innerHTML = '';

        camaras.forEach(item => {
            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${item.id_camara}</td>
                <td>${item.nombre_establecimiento}</td>
                <td>${item.codigo_camara}</td>
                <td>${item.ubicacion}</td>
                <td>${item.estado}</td>
                <td>
                    <button onclick="editarCamara(${item.id_camara})">
                        Editar
                    </button>

                    <button onclick="eliminarCamara(${item.id_camara})">
                        Eliminar
                    </button>
                </td>
            `;

            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar cámaras');
    }
}

async function editarCamara(id) {
    try {
        const respuesta = await fetch(`${API_URL}/camaras/${id}`);

        if (!respuesta.ok) {
            alert('No se pudo obtener la cámara');
            return;
        }

        const camara = await respuesta.json();

        document.getElementById('tituloFormularioCamara').innerText = 'Editar Cámara';
        document.getElementById('id_camara').value = camara.id_camara;
        document.getElementById('codigo_camara').value = camara.codigo_camara;
        document.getElementById('ubicacion_camara').value = camara.ubicacion;
        document.getElementById('estado_camara_gestion').value = camara.estado;

        await cargarEstablecimientosParaCamara(camara.id_establecimiento);

        window.scrollTo(0, 0);

    } catch (error) {
        console.error(error);
        alert('Error al editar cámara');
    }
}

async function eliminarCamara(id) {
    const confirmar = confirm('¿Desea eliminar esta cámara? La eliminación será lógica, no se borrará definitivamente.');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/camaras/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert('Cámara eliminada lógicamente');
            cargarCamarasGestion();
        } else {
            alert('Error al eliminar cámara');
        }

    } catch (error) {
        console.error(error);
        alert('Error al eliminar cámara');
    }
}