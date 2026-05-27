const API_URL = 'https://sistema-gestion-camaras-ipla.onrender.com';

let listaIncidencias = [];
let listaCamarasGestion = [];

/* ============================================================
   UTILIDADES
============================================================ */

function obtenerIdIncidenciaDesdeURL() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('id');
}

function volverDesdeFormularioIncidencia() {
    const id = obtenerIdIncidenciaDesdeURL();

    if (id) {
        window.location.href = 'historial.html';
    } else {
        window.location.href = 'dashboard.html';
    }
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
            const selected = String(item.id_camara) === String(valorSeleccionado)
                ? 'selected'
                : '';

            select.innerHTML += `
                <option
                    value="${item.id_camara}"
                    data-codigo="${item.codigo_camara}"
                    data-ubicacion="${item.ubicacion}"
                    ${selected}
                >
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

    const botonVolver = document.getElementById('btnVolverIncidencia');

    if (botonVolver) {
        botonVolver.innerText = id
            ? 'Volver al historial'
            : 'Volver al menú principal';
    }

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
        await cargarCamaras(incidencia.id_camara, incidencia.sede);

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
    const selectCamara = document.getElementById('camara');
    const id_camara = selectCamara.value;
    const ubicacion = selectCamara.options[selectCamara.selectedIndex].text.trim();
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
    enviado_jefatura,
    id_camara
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
    const selectCamara = document.getElementById('camara');
    const id_camara = selectCamara.value;
    const ubicacion = selectCamara.options[selectCamara.selectedIndex].text.trim();
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
            enviado_jefatura,
            id_camara
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

/* ============================================================
   HISTORIAL DE INCIDENCIAS CON FILTROS
============================================================ */

async function iniciarHistorialIncidencias() {
    await cargarFiltroEstablecimientosIncidencias();
    await cargarIncidencias();
}

async function cargarFiltroEstablecimientosIncidencias() {
    try {
        const respuesta = await fetch(`${API_URL}/establecimientos`);
        const establecimientos = await respuesta.json();

        const select = document.getElementById('filtro_establecimiento_incidencia');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Todos los establecimientos</option>';

        establecimientos.forEach(item => {
            select.innerHTML += `
                <option value="${item.nombre_establecimiento}">
                    ${item.nombre_establecimiento}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
    }
}

async function cargarIncidencias() {
    const tabla = document.getElementById('tabla-incidencias');

    if (!tabla) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/incidencias`);
        listaIncidencias = await respuesta.json();

        aplicarFiltrosIncidencias();

    } catch (error) {
        console.error(error);
        alert('Error al cargar incidencias');
    }
}

function aplicarFiltrosIncidencias() {
    const tabla = document.getElementById('tabla-incidencias');

    if (!tabla) {
        return;
    }

    const filtroEstablecimiento = document.getElementById('filtro_establecimiento_incidencia')?.value || '';
    const filtroEstado = document.getElementById('filtro_estado_incidencia')?.value || '';
    const fechaDesde = document.getElementById('filtro_fecha_desde')?.value || '';
    const fechaHasta = document.getElementById('filtro_fecha_hasta')?.value || '';

    let incidenciasFiltradas = listaIncidencias;

    if (filtroEstablecimiento !== '') {
        incidenciasFiltradas = incidenciasFiltradas.filter(incidencia =>
            incidencia.sede === filtroEstablecimiento
        );
    }

    if (filtroEstado !== '') {
        incidenciasFiltradas = incidenciasFiltradas.filter(incidencia =>
            incidencia.estado === filtroEstado
        );
    }

    if (fechaDesde !== '') {
        incidenciasFiltradas = incidenciasFiltradas.filter(incidencia => {
            const fechaIncidencia = new Date(incidencia.fecha);
            const desde = new Date(fechaDesde + 'T00:00:00');
            return fechaIncidencia >= desde;
        });
    }

    if (fechaHasta !== '') {
        incidenciasFiltradas = incidenciasFiltradas.filter(incidencia => {
            const fechaIncidencia = new Date(incidencia.fecha);
            const hasta = new Date(fechaHasta + 'T23:59:59');
            return fechaIncidencia <= hasta;
        });
    }

    mostrarIncidenciasEnTabla(incidenciasFiltradas);
}

function limpiarFiltrosIncidencias() {
    const filtroEstablecimiento = document.getElementById('filtro_establecimiento_incidencia');
    const filtroEstado = document.getElementById('filtro_estado_incidencia');
    const fechaDesde = document.getElementById('filtro_fecha_desde');
    const fechaHasta = document.getElementById('filtro_fecha_hasta');

    if (filtroEstablecimiento) {
        filtroEstablecimiento.value = '';
    }

    if (filtroEstado) {
        filtroEstado.value = '';
    }

    if (fechaDesde) {
        fechaDesde.value = '';
    }

    if (fechaHasta) {
        fechaHasta.value = '';
    }

    aplicarFiltrosIncidencias();
}

function mostrarIncidenciasEnTabla(incidencias) {
    const tabla = document.getElementById('tabla-incidencias');

    if (!tabla) {
        return;
    }

    const rol = localStorage.getItem('rol');

    tabla.innerHTML = '';

    if (incidencias.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="9">
                    No se encontraron incidencias con los filtros seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    incidencias.forEach(incidencia => {
        const fila = document.createElement('tr');

        const reporte = incidencia.enviado_jefatura
            ? 'Enviado'
            : 'No enviado';

        const observacionTecnica = incidencia.observacion_tecnica
            ? incidencia.observacion_tecnica
            : 'Sin revisión técnica';

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
                <button onclick="window.location.href='revision.html?id=${incidencia.id}'">
                    Atender / Revisar
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

                <button onclick="window.location.href='revision.html?id=${incidencia.id}'">
                    Atender / Revisar
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
            <td>${observacionTecnica}</td>
            <td>${acciones}</td>
        `;

        tabla.appendChild(fila);
    });
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
    await cargarFiltroEstablecimientosCamaras();
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

async function cargarFiltroEstablecimientosCamaras() {
    try {
        const respuesta = await fetch(`${API_URL}/establecimientos`);
        const establecimientos = await respuesta.json();

        const select = document.getElementById('filtro_establecimiento_camara');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Todos los establecimientos</option>';

        establecimientos.forEach(item => {
            select.innerHTML += `
                <option value="${item.nombre_establecimiento}">
                    ${item.nombre_establecimiento}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
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
            await cargarFiltroEstablecimientosCamaras();
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
        listaCamarasGestion = await respuesta.json();

        aplicarFiltrosCamaras();

    } catch (error) {
        console.error(error);
        alert('Error al cargar cámaras');
    }
}

function aplicarFiltrosCamaras() {
    const tabla = document.getElementById('tabla-camaras');

    if (!tabla) {
        return;
    }

    const filtroEstablecimiento = document.getElementById('filtro_establecimiento_camara')?.value || '';
    const filtroCodigo = document.getElementById('filtro_codigo_camara')?.value.toLowerCase() || '';

    let camarasFiltradas = listaCamarasGestion;

    if (filtroEstablecimiento !== '') {
        camarasFiltradas = camarasFiltradas.filter(camara =>
            camara.nombre_establecimiento === filtroEstablecimiento
        );
    }

    if (filtroCodigo !== '') {
        camarasFiltradas = camarasFiltradas.filter(camara =>
            camara.codigo_camara.toLowerCase().includes(filtroCodigo)
        );
    }

    mostrarCamarasEnTabla(camarasFiltradas);
}

function limpiarFiltrosCamaras() {
    const filtroEstablecimiento = document.getElementById('filtro_establecimiento_camara');
    const filtroCodigo = document.getElementById('filtro_codigo_camara');

    if (filtroEstablecimiento) {
        filtroEstablecimiento.value = '';
    }

    if (filtroCodigo) {
        filtroCodigo.value = '';
    }

    aplicarFiltrosCamaras();
}

function mostrarCamarasEnTabla(camaras) {
    const tabla = document.getElementById('tabla-camaras');

    if (!tabla) {
        return;
    }

    tabla.innerHTML = '';

    if (camaras.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron cámaras con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

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
/* ============================================================
   CRUD USUARIOS Y GESTIÓN DE ROLES
============================================================ */

let listaUsuariosGestion = [];

async function iniciarGestionUsuarios() {
    await cargarPerfilesUsuario();
    await cargarFiltroPerfilesUsuarios();
    await cargarUsuariosGestion();
}

async function cargarPerfilesUsuario(valorSeleccionado = '') {
    try {
        const respuesta = await fetch(`${API_URL}/perfiles`);
        const perfiles = await respuesta.json();

        const select = document.getElementById('id_perfil_usuario');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione perfil</option>';

        perfiles.forEach(perfil => {
            const selected = String(perfil.id_perfil) === String(valorSeleccionado)
                ? 'selected'
                : '';

            select.innerHTML += `
                <option value="${perfil.id_perfil}" ${selected}>
                    ${perfil.nombre_perfil}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar perfiles');
    }
}

async function cargarFiltroPerfilesUsuarios() {
    try {
        const respuesta = await fetch(`${API_URL}/perfiles`);
        const perfiles = await respuesta.json();

        const select = document.getElementById('filtro_perfil_usuario');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Todos los perfiles</option>';

        perfiles.forEach(perfil => {
            select.innerHTML += `
                <option value="${perfil.nombre_perfil}">
                    ${perfil.nombre_perfil}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
    }
}

function limpiarFormularioUsuario() {
    document.getElementById('id_usuario').value = '';
    document.getElementById('nombre_usuario').value = '';
    document.getElementById('correo_usuario').value = '';
    document.getElementById('id_perfil_usuario').value = '';
    document.getElementById('password_usuario').value = '';
    document.getElementById('tituloFormularioUsuario').innerText = 'Registrar Usuario';
}

async function guardarUsuario() {
    const id = document.getElementById('id_usuario').value;
    const nombre = document.getElementById('nombre_usuario').value;
    const correo = document.getElementById('correo_usuario').value;
    const id_perfil = document.getElementById('id_perfil_usuario').value;
    const password = document.getElementById('password_usuario').value;

    if (
        nombre.trim() === '' ||
        correo.trim() === '' ||
        id_perfil === ''
    ) {
        alert('Complete nombre, correo y perfil');
        return;
    }

    if (id === '' && password.trim() === '') {
        alert('Debe ingresar una contraseña para crear el usuario');
        return;
    }

    try {
        if (id === '') {
            const datos = {
                nombre: nombre.trim(),
                correo: correo.trim(),
                id_perfil,
                password: password.trim()
            };

            const respuesta = await fetch(`${API_URL}/usuarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            if (respuesta.ok) {
                alert('Usuario registrado correctamente');
                limpiarFormularioUsuario();
                cargarUsuariosGestion();
            } else {
                const error = await respuesta.json();
                alert(error.mensaje || 'Error al registrar usuario');
            }

        } else {
            const datos = {
                nombre: nombre.trim(),
                correo: correo.trim(),
                id_perfil
            };

            const respuesta = await fetch(`${API_URL}/usuarios/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) {
                const error = await respuesta.json();
                alert(error.mensaje || 'Error al actualizar usuario');
                return;
            }

            if (password.trim() !== '') {
                const respuestaPassword = await fetch(`${API_URL}/usuarios/${id}/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        password: password.trim()
                    })
                });

                if (!respuestaPassword.ok) {
                    const error = await respuestaPassword.json();
                    alert(error.mensaje || 'Usuario actualizado, pero ocurrió un error al cambiar contraseña');
                    return;
                }
            }

            alert('Usuario actualizado correctamente');
            limpiarFormularioUsuario();
            cargarUsuariosGestion();
        }

    } catch (error) {
        console.error(error);
        alert('Error al guardar usuario');
    }
}

async function cargarUsuariosGestion() {
    const tabla = document.getElementById('tabla-usuarios');

    if (!tabla) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/usuarios`);
        listaUsuariosGestion = await respuesta.json();

        aplicarFiltrosUsuarios();

    } catch (error) {
        console.error(error);
        alert('Error al cargar usuarios');
    }
}

function aplicarFiltrosUsuarios() {
    const tabla = document.getElementById('tabla-usuarios');

    if (!tabla) {
        return;
    }

    const filtroTexto = document.getElementById('filtro_texto_usuario')?.value.toLowerCase() || '';
    const filtroPerfil = document.getElementById('filtro_perfil_usuario')?.value || '';

    let usuariosFiltrados = listaUsuariosGestion;

    if (filtroTexto !== '') {
        usuariosFiltrados = usuariosFiltrados.filter(usuario =>
            usuario.nombre.toLowerCase().includes(filtroTexto) ||
            usuario.correo.toLowerCase().includes(filtroTexto)
        );
    }

    if (filtroPerfil !== '') {
        usuariosFiltrados = usuariosFiltrados.filter(usuario =>
            usuario.nombre_perfil === filtroPerfil
        );
    }

    mostrarUsuariosEnTabla(usuariosFiltrados);
}

function limpiarFiltrosUsuarios() {
    const filtroTexto = document.getElementById('filtro_texto_usuario');
    const filtroPerfil = document.getElementById('filtro_perfil_usuario');

    if (filtroTexto) {
        filtroTexto.value = '';
    }

    if (filtroPerfil) {
        filtroPerfil.value = '';
    }

    aplicarFiltrosUsuarios();
}

function mostrarUsuariosEnTabla(usuarios) {
    const tabla = document.getElementById('tabla-usuarios');

    if (!tabla) {
        return;
    }

    tabla.innerHTML = '';

    if (usuarios.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron usuarios con los filtros seleccionados.</td>
            </tr>
        `;
        return;
    }

    usuarios.forEach(usuario => {
        const fila = document.createElement('tr');

        const estado = usuario.estado_usuario
            ? 'Activo'
            : 'Inactivo';

        fila.innerHTML = `
            <td>${usuario.id_usuario}</td>
            <td>${usuario.nombre}</td>
            <td>${usuario.correo}</td>
            <td>${usuario.nombre_perfil}</td>
            <td>${estado}</td>
            <td>
                <button onclick="editarUsuario(${usuario.id_usuario})">
                    Editar
                </button>

                <button onclick="eliminarUsuario(${usuario.id_usuario})">
                    Eliminar
                </button>
            </td>
        `;

        tabla.appendChild(fila);
    });
}

async function editarUsuario(id) {
    try {
        const respuesta = await fetch(`${API_URL}/usuarios/${id}`);

        if (!respuesta.ok) {
            alert('No se pudo obtener el usuario');
            return;
        }

        const usuario = await respuesta.json();

        document.getElementById('tituloFormularioUsuario').innerText = 'Editar Usuario';
        document.getElementById('id_usuario').value = usuario.id_usuario;
        document.getElementById('nombre_usuario').value = usuario.nombre;
        document.getElementById('correo_usuario').value = usuario.correo;
        document.getElementById('password_usuario').value = '';

        await cargarPerfilesUsuario(usuario.id_perfil);

        window.scrollTo(0, 0);

    } catch (error) {
        console.error(error);
        alert('Error al editar usuario');
    }
}

async function eliminarUsuario(id) {
    const confirmar = confirm('¿Desea eliminar este usuario? La eliminación será lógica y el usuario no podrá iniciar sesión.');

    if (!confirmar) {
        return;
    }

    try {
        const id_usuario_actual = localStorage.getItem('id_usuario');

        const respuesta = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_usuario_actual
            })
        });

        if (respuesta.ok) {
            alert('Usuario eliminado lógicamente');
            cargarUsuariosGestion();
        } else {
            const error = await respuesta.json();
            alert(error.mensaje || 'Error al eliminar usuario');
        }

    } catch (error) {
        console.error(error);
        alert('Error al eliminar usuario');
    }
}

/* ============================================================
   REVISIÓN TÉCNICA DE INCIDENCIAS
============================================================ */

function obtenerIdIncidenciaRevisionDesdeURL() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get('id');
}

async function iniciarRevisionTecnica() {
    await cargarEstadosCamaraRevision();
    await cargarDatosIncidenciaRevision();
}

async function cargarEstadosCamaraRevision() {
    try {
        const respuesta = await fetch(`${API_URL}/estados-camara`);
        const estados = await respuesta.json();

        const select = document.getElementById('id_estado_camara_revision');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione estado de cámara revisado</option>';

        estados.forEach(estado => {
            select.innerHTML += `
                <option value="${estado.id_estado}">
                    ${estado.nombre_estado}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar estados de cámara');
    }
}

async function cargarDatosIncidenciaRevision() {
    const id = obtenerIdIncidenciaRevisionDesdeURL();

    if (!id) {
        alert('No se encontró la incidencia');
        window.location.href = 'historial.html';
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}`);

        if (!respuesta.ok) {
            alert('No se pudo cargar la incidencia');
            window.location.href = 'historial.html';
            return;
        }

        const incidencia = await respuesta.json();

        document.getElementById('revision_id_incidencia').innerText = incidencia.id;
        document.getElementById('revision_sede').innerText = incidencia.sede;
        document.getElementById('revision_camara').innerText = incidencia.ubicacion;
        document.getElementById('revision_descripcion').innerText = incidencia.descripcion;
        document.getElementById('revision_estado_actual').innerText = incidencia.estado;

    } catch (error) {
        console.error(error);
        alert('Error al cargar datos de incidencia');
    }
}

async function guardarRevisionTecnica() {
    const id = obtenerIdIncidenciaRevisionDesdeURL();

    const estado_atencion = document.getElementById('estado_atencion_revision').value;
    const id_estado = document.getElementById('id_estado_camara_revision').value;
    const observacion = document.getElementById('observacion_revision').value;

    const id_usuario = localStorage.getItem('id_usuario');
    const nombre_usuario = localStorage.getItem('usuario');

    if (
        estado_atencion === '' ||
        id_estado === '' ||
        observacion.trim() === ''
    ) {
        alert('Complete todos los campos de la revisión');
        return;
    }

    const datos = {
        id_usuario,
        nombre_usuario,
        estado_atencion,
        id_estado,
        observacion: observacion.trim()
    };

    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}/revision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert('Revisión técnica registrada correctamente');
            window.location.href = 'historial.html';
        } else {
            const error = await respuesta.json();
            alert(error.mensaje || 'Error al registrar revisión técnica');
        }

    } catch (error) {
        console.error(error);
        alert('Error al registrar revisión técnica');
    }
}
/* ============================================================
   REGISTROS ELIMINADOS / PAPELERA ADMINISTRATIVA
============================================================ */

let listaRegistrosEliminados = [];

async function iniciarRegistrosEliminados() {
    await cargarRegistrosEliminados();
}

async function cargarRegistrosEliminados() {
    const tabla = document.getElementById('tabla-eliminados');
    const tipo = document.getElementById('tipo_eliminado')?.value || 'incidencias';

    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6">Cargando registros eliminados...</td>
            </tr>
        `;
    }

    try {
        const respuesta = await fetch(`${API_URL}/admin/eliminados/${tipo}`);

        if (!respuesta.ok) {
            if (tabla) {
                tabla.innerHTML = `
                    <tr>
                        <td colspan="6">Error al obtener registros eliminados.</td>
                    </tr>
                `;
            }

            alert('Error al obtener registros eliminados');
            return;
        }

        listaRegistrosEliminados = await respuesta.json();

        aplicarFiltrosEliminados();

    } catch (error) {
        console.error('Error al cargar registros eliminados:', error);

        if (tabla) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="6">Error al conectar con el servidor.</td>
                </tr>
            `;
        }

        alert('Error al cargar registros eliminados');
    }
}

function aplicarFiltrosEliminados() {
    const tabla = document.getElementById('tabla-eliminados');

    if (!tabla) {
        return;
    }

    const filtroTexto = document.getElementById('filtro_texto_eliminado')?.value.toLowerCase() || '';
    const fechaDesde = document.getElementById('filtro_fecha_eliminado_desde')?.value || '';
    const fechaHasta = document.getElementById('filtro_fecha_eliminado_hasta')?.value || '';

    let registrosFiltrados = listaRegistrosEliminados;

    if (filtroTexto !== '') {
        registrosFiltrados = registrosFiltrados.filter(registro =>
            JSON.stringify(registro).toLowerCase().includes(filtroTexto)
        );
    }

    if (fechaDesde !== '') {
        registrosFiltrados = registrosFiltrados.filter(registro => {
            if (!registro.fecha_eliminacion) {
                return false;
            }

            const fechaRegistro = new Date(registro.fecha_eliminacion);
            const desde = new Date(fechaDesde + 'T00:00:00');

            return fechaRegistro >= desde;
        });
    }

    if (fechaHasta !== '') {
        registrosFiltrados = registrosFiltrados.filter(registro => {
            if (!registro.fecha_eliminacion) {
                return false;
            }

            const fechaRegistro = new Date(registro.fecha_eliminacion);
            const hasta = new Date(fechaHasta + 'T23:59:59');

            return fechaRegistro <= hasta;
        });
    }

    mostrarRegistrosEliminados(registrosFiltrados);
}

function limpiarFiltrosEliminados() {
    const filtroTexto = document.getElementById('filtro_texto_eliminado');
    const fechaDesde = document.getElementById('filtro_fecha_eliminado_desde');
    const fechaHasta = document.getElementById('filtro_fecha_eliminado_hasta');

    if (filtroTexto) {
        filtroTexto.value = '';
    }

    if (fechaDesde) {
        fechaDesde.value = '';
    }

    if (fechaHasta) {
        fechaHasta.value = '';
    }

    aplicarFiltrosEliminados();
}

function mostrarRegistrosEliminados(registros) {
    const tabla = document.getElementById('tabla-eliminados');
    const tipo = document.getElementById('tipo_eliminado')?.value || 'incidencias';

    if (!tabla) {
        return;
    }

    tabla.innerHTML = '';

    if (!Array.isArray(registros) || registros.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="6">No se encontraron registros eliminados.</td>
            </tr>
        `;
        return;
    }

    registros.forEach(registro => {
        const fila = document.createElement('tr');
        const datos = obtenerDatosRegistroEliminado(tipo, registro);

        fila.innerHTML = `
            <td>${datos.tipo}</td>
            <td>${datos.id}</td>
            <td>${datos.detalle}</td>
            <td>${datos.extra}</td>
            <td>${datos.fecha}</td>
            <td>
                <button onclick="restaurarRegistroEliminado('${tipo}', ${datos.id})">
                    Restaurar
                </button>
            </td>
        `;

        tabla.appendChild(fila);
    });
}

function obtenerDatosRegistroEliminado(tipo, registro) {
    const fecha = registro.fecha_eliminacion
        ? new Date(registro.fecha_eliminacion).toLocaleString()
        : 'Sin fecha registrada';

    if (tipo === 'usuarios') {
        return {
            tipo: 'Usuario',
            id: registro.id_usuario,
            detalle: `${registro.nombre || 'Sin nombre'} - ${registro.correo || 'Sin correo'}`,
            extra: `Perfil: ${registro.nombre_perfil || 'Sin perfil'}`,
            fecha
        };
    }

    if (tipo === 'incidencias') {
        return {
            tipo: 'Incidencia',
            id: registro.id,
            detalle: `${registro.sede || 'Sin sede'} - ${registro.ubicacion || 'Sin ubicación'}`,
            extra: `Estado: ${registro.estado || 'Sin estado'}`,
            fecha
        };
    }

    if (tipo === 'camaras') {
        return {
            tipo: 'Cámara',
            id: registro.id_camara,
            detalle: `${registro.codigo_camara || 'Sin código'} - ${registro.ubicacion || 'Sin ubicación'}`,
            extra: `Establecimiento: ${registro.nombre_establecimiento || 'Sin establecimiento'}`,
            fecha
        };
    }

    if (tipo === 'establecimientos') {
        return {
            tipo: 'Establecimiento',
            id: registro.id_establecimiento,
            detalle: registro.nombre_establecimiento || 'Sin nombre',
            extra: registro.direccion || 'Sin dirección',
            fecha
        };
    }

        if (tipo === 'revisiones') {
        return {
            tipo: 'Revisión técnica',
            id: registro.id_revision,
            detalle: `${registro.codigo_camara || 'Sin cámara'} - ${registro.ubicacion_camara || 'Sin ubicación'}`,
            extra: `Técnico: ${registro.tecnico_responsable || 'Sin técnico'} | Estado: ${registro.nombre_estado || 'Sin estado'}`,
            fecha
        };
    }

    return {
        tipo: 'Registro',
        id: '',
        detalle: '',
        extra: '',
        fecha
    };
}

async function restaurarRegistroEliminado(tipo, id) {
    const confirmar = confirm('¿Desea restaurar este registro? Volverá a quedar activo en el sistema.');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/admin/restaurar/${tipo}/${id}`, {
            method: 'PUT'
        });

        if (respuesta.ok) {
            alert('Registro restaurado correctamente');
            await cargarRegistrosEliminados();
        } else {
            const error = await respuesta.json();
            alert(error.mensaje || 'Error al restaurar registro');
        }

    } catch (error) {
        console.error('Error al restaurar registro:', error);
        alert('Error al restaurar registro');
    }
}

/* ============================================================
   CRUD REVISIONES TÉCNICAS
============================================================ */

let listaRevisionesTecnicas = [];

async function iniciarGestionRevisionesTecnicas() {
    await cargarEstadosRevisionGestion();
    await cargarFiltroEstadosRevisionGestion();
    await cargarRevisionesTecnicas();
}

async function cargarEstadosRevisionGestion(valorSeleccionado = '') {
    try {
        const respuesta = await fetch(`${API_URL}/estados-camara`);
        const estados = await respuesta.json();

        const select = document.getElementById('id_estado_revision_gestion');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Seleccione estado de cámara</option>';

        estados.forEach(estado => {
            const selected = String(estado.id_estado) === String(valorSeleccionado)
                ? 'selected'
                : '';

            select.innerHTML += `
                <option value="${estado.id_estado}" ${selected}>
                    ${estado.nombre_estado}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
        alert('Error al cargar estados de cámara');
    }
}

async function cargarFiltroEstadosRevisionGestion() {
    try {
        const respuesta = await fetch(`${API_URL}/estados-camara`);
        const estados = await respuesta.json();

        const select = document.getElementById('filtro_estado_revision');

        if (!select) {
            return;
        }

        select.innerHTML = '<option value="">Todos los estados de cámara</option>';

        estados.forEach(estado => {
            select.innerHTML += `
                <option value="${estado.nombre_estado}">
                    ${estado.nombre_estado}
                </option>
            `;
        });

    } catch (error) {
        console.error(error);
    }
}

async function cargarRevisionesTecnicas() {
    const tabla = document.getElementById('tabla-revisiones');

    if (!tabla) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/revisiones`);

        if (!respuesta.ok) {
            alert('Error al obtener revisiones técnicas');
            return;
        }

        listaRevisionesTecnicas = await respuesta.json();

        aplicarFiltrosRevisionesTecnicas();

    } catch (error) {
        console.error(error);
        alert('Error al cargar revisiones técnicas');
    }
}

function aplicarFiltrosRevisionesTecnicas() {
    const tabla = document.getElementById('tabla-revisiones');

    if (!tabla) {
        return;
    }

    const filtroTexto = document.getElementById('filtro_texto_revision')?.value.toLowerCase() || '';
    const filtroEstado = document.getElementById('filtro_estado_revision')?.value || '';
    const fechaDesde = document.getElementById('filtro_revision_desde')?.value || '';
    const fechaHasta = document.getElementById('filtro_revision_hasta')?.value || '';

    let revisionesFiltradas = listaRevisionesTecnicas;

    if (filtroTexto !== '') {
        revisionesFiltradas = revisionesFiltradas.filter(revision =>
            JSON.stringify(revision).toLowerCase().includes(filtroTexto)
        );
    }

    if (filtroEstado !== '') {
        revisionesFiltradas = revisionesFiltradas.filter(revision =>
            revision.nombre_estado === filtroEstado
        );
    }

    if (fechaDesde !== '') {
        revisionesFiltradas = revisionesFiltradas.filter(revision => {
            const fechaRevision = new Date(revision.fecha_revision);
            const desde = new Date(fechaDesde + 'T00:00:00');

            return fechaRevision >= desde;
        });
    }

    if (fechaHasta !== '') {
        revisionesFiltradas = revisionesFiltradas.filter(revision => {
            const fechaRevision = new Date(revision.fecha_revision);
            const hasta = new Date(fechaHasta + 'T23:59:59');

            return fechaRevision <= hasta;
        });
    }

    mostrarRevisionesTecnicas(revisionesFiltradas);
}

function limpiarFiltrosRevisionesTecnicas() {
    const filtroTexto = document.getElementById('filtro_texto_revision');
    const filtroEstado = document.getElementById('filtro_estado_revision');
    const fechaDesde = document.getElementById('filtro_revision_desde');
    const fechaHasta = document.getElementById('filtro_revision_hasta');

    if (filtroTexto) {
        filtroTexto.value = '';
    }

    if (filtroEstado) {
        filtroEstado.value = '';
    }

    if (fechaDesde) {
        fechaDesde.value = '';
    }

    if (fechaHasta) {
        fechaHasta.value = '';
    }

    aplicarFiltrosRevisionesTecnicas();
}

function mostrarRevisionesTecnicas(revisiones) {
    const tabla = document.getElementById('tabla-revisiones');

    if (!tabla) {
        return;
    }

    tabla.innerHTML = '';

    if (!Array.isArray(revisiones) || revisiones.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="9">No se encontraron revisiones técnicas.</td>
            </tr>
        `;
        return;
    }

    revisiones.forEach(revision => {
        const fila = document.createElement('tr');

        const incidencia = revision.id_incidencia
            ? revision.id_incidencia
            : 'Sin incidencia asociada';

        const camara = revision.codigo_camara
            ? `${revision.codigo_camara} - ${revision.ubicacion_camara || ''}`
            : 'Sin cámara asociada';

        fila.innerHTML = `
            <td>${revision.id_revision}</td>
            <td>${incidencia}</td>
            <td>${revision.tecnico_responsable || 'Sin técnico'}</td>
            <td>${revision.nombre_establecimiento || 'Sin establecimiento'}</td>
            <td>${camara}</td>
            <td>${revision.nombre_estado || 'Sin estado'}</td>
            <td>${new Date(revision.fecha_revision).toLocaleString()}</td>
            <td>${revision.observacion || 'Sin observación'}</td>
            <td>
                <button onclick="editarRevisionTecnica(${revision.id_revision})">
                    Editar
                </button>

                <button onclick="anularRevisionTecnica(${revision.id_revision})">
                    Anular
                </button>
            </td>
        `;

        tabla.appendChild(fila);
    });
}

async function editarRevisionTecnica(id) {
    try {
        const respuesta = await fetch(`${API_URL}/revisiones/${id}`);

        if (!respuesta.ok) {
            alert('No se pudo obtener la revisión técnica');
            return;
        }

        const revision = await respuesta.json();

        document.getElementById('tituloFormularioRevisionGestion').innerText = 'Editar Revisión Técnica';
        document.getElementById('id_revision_gestion').value = revision.id_revision;
        document.getElementById('observacion_revision_gestion').value = revision.observacion || '';

        const estadoAtencion = document.getElementById('estado_atencion_revision_gestion');

        if (estadoAtencion) {
            estadoAtencion.value = revision.estado_incidencia || '';
        }

        await cargarEstadosRevisionGestion(revision.id_estado);

        window.scrollTo(0, 0);

    } catch (error) {
        console.error(error);
        alert('Error al editar revisión técnica');
    }
}

function limpiarFormularioRevisionGestion() {
    document.getElementById('id_revision_gestion').value = '';
    document.getElementById('estado_atencion_revision_gestion').value = '';
    document.getElementById('id_estado_revision_gestion').value = '';
    document.getElementById('observacion_revision_gestion').value = '';
    document.getElementById('tituloFormularioRevisionGestion').innerText = 'Editar Revisión Técnica';
}

async function guardarEdicionRevisionTecnica() {
    const id = document.getElementById('id_revision_gestion').value;
    const estado_atencion = document.getElementById('estado_atencion_revision_gestion').value;
    const id_estado = document.getElementById('id_estado_revision_gestion').value;
    const observacion = document.getElementById('observacion_revision_gestion').value;

    if (id === '') {
        alert('Seleccione una revisión para editar');
        return;
    }

    if (
        estado_atencion === '' ||
        id_estado === '' ||
        observacion.trim() === ''
    ) {
        alert('Complete todos los campos de la revisión');
        return;
    }

    const datos = {
        estado_atencion,
        id_estado,
        observacion: observacion.trim()
    };

    try {
        const respuesta = await fetch(`${API_URL}/revisiones/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            alert('Revisión técnica actualizada correctamente');
            limpiarFormularioRevisionGestion();
            cargarRevisionesTecnicas();
        } else {
            const error = await respuesta.json();
            alert(error.mensaje || 'Error al actualizar revisión técnica');
        }

    } catch (error) {
        console.error(error);
        alert('Error al actualizar revisión técnica');
    }
}

async function anularRevisionTecnica(id) {
    const confirmar = confirm('¿Desea anular esta revisión técnica? La eliminación será lógica.');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/revisiones/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert('Revisión técnica anulada lógicamente');
            cargarRevisionesTecnicas();
        } else {
            const error = await respuesta.json();
            alert(error.mensaje || 'Error al anular revisión técnica');
        }

    } catch (error) {
        console.error(error);
        alert('Error al anular revisión técnica');
    }
}