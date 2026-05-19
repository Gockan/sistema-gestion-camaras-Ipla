const API_URL = 'https://sistema-gestion-camaras-ipla.onrender.com';
async function cargarEstablecimientos(){

try{

const respuesta=
await fetch(
`${API_URL}/establecimientos`
);

const datos=
await respuesta.json();

const select=
document.getElementById(
'establecimiento'
);

if(!select)return;

datos.forEach(item=>{

select.innerHTML+=`
<option value="${item.nombre_establecimiento}">
${item.nombre_establecimiento}
</option>
`;

});

}catch(error){

console.error(error);

}

}

async function cargarCamaras(){

try{

const respuesta=
await fetch(
`${API_URL}/camaras`
);

const datos=
await respuesta.json();

const select=
document.getElementById(
'camara'
);

if(!select)return;

datos.forEach(item=>{

select.innerHTML+=`
<option value="${item.codigo_camara}">
${item.codigo_camara}
-
${item.ubicacion}
</option>
`;

});

}catch(error){

console.error(error);

}

}

async function registrarIncidencia(){

const sede=
document.getElementById(
'establecimiento'
).value;

const ubicacion=
document.getElementById(
'camara'
).value;

const descripcion=
document.getElementById(
'descripcion'
).value;

const estado='Pendiente';

const enviado_jefatura=
document.getElementById(
'enviado_jefatura'
).checked;


if(

sede==='' ||
ubicacion==='' ||
descripcion.trim()===''

){

alert(
'Complete todos los campos'
);

return;

}

const datos={

sede,
ubicacion,
descripcion,
estado,
enviado_jefatura

};

try{

const respuesta=
await fetch(
`${API_URL}/incidencias`,
{
method:'POST',
headers:{
'Content-Type':'application/json'
},
body:JSON.stringify(datos)
}
);

if(respuesta.ok){

alert(
'Incidencia registrada'
);

window.location.href=
'historial.html';

}

}catch(error){

console.error(error);

alert(
'Error al registrar'
);

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
    const confirmar = confirm('¿Desea eliminar esta incidencia?');

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/incidencias/${id}`, {
            method: 'DELETE'
        });

        if (respuesta.ok) {
            alert('Incidencia eliminada');
            cargarIncidencias();
        } else {
            alert('Error al eliminar incidencia');
        }

    } catch (error) {
        console.error(error);
        alert('Error al eliminar incidencia');
    }
}