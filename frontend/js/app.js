async function registrarIncidencia() {

    const sede = document.getElementById('sede').value;
    const ubicacion = document.getElementById('ubicacion').value;
    const descripcion = document.getElementById('descripcion').value;
    const estado = document.getElementById('estado').value;
    if(
        sede.trim() === '' ||
        ubicacion.trim() === '' ||
        descripcion.trim() === ''
    ){
        alert('Complete todos los campos');
    return;
    }

    const datos = {
        sede,
        ubicacion,
        descripcion,
        estado
    };

    try {

        const respuesta = await fetch(
            'http://localhost:3000/incidencias',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            }
        );

        if(respuesta.ok){

            alert('Incidencia registrada correctamente');

            window.location.href = 'historial.html';
        }

    } catch(error){

        console.error(error);

        alert('Error al registrar incidencia');
    }
}
async function cargarIncidencias() {

    const tabla = document.getElementById('tabla-incidencias');

    try {

        const respuesta = await fetch('http://localhost:3000/incidencias');
        const incidencias = await respuesta.json();

        tabla.innerHTML = '';

        incidencias.forEach(incidencia => {

            const fila = document.createElement('tr');

            fila.innerHTML = `
                <td>${incidencia.id}</td>
                <td>${incidencia.sede}</td>
                <td>${incidencia.ubicacion}</td>
                <td>${incidencia.descripcion}</td>
                <td>${incidencia.estado}</td>
                <td>${new Date(incidencia.fecha).toLocaleString()}</td>

                <td>
                    <button onclick="eliminarIncidencia(${incidencia.id})">
                        Eliminar
                    </button>
                </td>
            `;

            tabla.appendChild(fila);
        });

    } catch (error) {

        console.error(error);
        alert('Error al cargar incidencias');
    }
    
}
async function eliminarIncidencia(id) {

    const confirmar = confirm(
        '¿Desea eliminar esta incidencia?'
    );

    if(!confirmar){
        return;
    }

    try {

        const respuesta = await fetch(
            `http://localhost:3000/incidencias/${id}`,
            {
                method: 'DELETE'
            }
        );

        if(respuesta.ok){

            alert('Incidencia eliminada');

            cargarIncidencias();
        }

    } catch(error){

        console.error(error);

        alert('Error al eliminar incidencia');
    }
}