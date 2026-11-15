import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Tus llaves de acceso a Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5bbZjH6I-x7Rudxk-Zue7OzcPgAzVSZ0",
  authDomain: "registrodivisas.firebaseapp.com",
  projectId: "registrodivisas",
  storageBucket: "registrodivisas.firebasestorage.app",
  messagingSenderId: "939629424328",
  appId: "1:939629424328:web:eab42c8c241fd3ed89bffd"
};

// 2. Inicializar Firebase y la Base de Datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- SISTEMA DE NAVEGACIÓN Y MENÚ ---
const pantallaSeleccion = document.getElementById('pantalla-seleccion');
const appPrincipal = document.getElementById('app-principal'); 
const appPrestamo = document.getElementById('app-prestamo');   
const appClientes = document.getElementById('app-clientes');   

const btnCompra = document.getElementById('btn-compra');
const btnPrestamo = document.getElementById('btn-prestamo');
const btnClientes = document.getElementById('btn-clientes');

const btnVolver = document.getElementById('btn-volver');
const btnVolverPrestamo = document.getElementById('btn-volver-prestamo');
const btnVolverClientes = document.getElementById('btn-volver-clientes');
const estadoSelect = document.getElementById('estado');

btnCompra.addEventListener('click', () => {
    pantallaSeleccion.style.display = 'none';
    appPrincipal.style.display = 'block';
    if(estadoSelect) estadoSelect.value = 'Pendiente por retirar';
});

btnPrestamo.addEventListener('click', () => {
    pantallaSeleccion.style.display = 'none';
    appPrestamo.style.display = 'block';
});

btnClientes.addEventListener('click', () => {
    pantallaSeleccion.style.display = 'none';
    appClientes.style.display = 'block';
});

btnVolver.addEventListener('click', () => {
    appPrincipal.style.display = 'none';
    pantallaSeleccion.style.display = 'flex';
});

btnVolverPrestamo.addEventListener('click', () => {
    appPrestamo.style.display = 'none';
    pantallaSeleccion.style.display = 'flex';
});

btnVolverClientes.addEventListener('click', () => {
    appClientes.style.display = 'none';
    pantallaSeleccion.style.display = 'flex';
});

// --- MÓDULO DE TRANSACCIONES (COMPRA DE EFECTIVO) ---

// 3. Función para GUARDAR registros de divisas
const formulario = document.getElementById('formulario');
formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const contacto = document.getElementById('contacto').value.trim();
    const telefono = document.getElementById('telefono').value;
    const montoNuevo = parseFloat(document.getElementById('monto').value);
    const estado = document.getElementById('estado').value;
    const fecha = document.getElementById('fecha').value;
    const ubicacion = document.getElementById('ubicacion').value;

    try {
        const q = query(collection(db, "registros"), where("contacto", "==", contacto));
        const consulta = await getDocs(q);
        let registroPendiente = null;
        
        consulta.forEach((documento) => {
            if (documento.data().estado !== "Pagado") {
                registroPendiente = documento;
            }
        });

        if (registroPendiente) {
            const montoAnterior = parseFloat(registroPendiente.data().monto);
            const totalActualizado = montoAnterior + montoNuevo;
            await updateDoc(doc(db, "registros", registroPendiente.id), {
                monto: totalActualizado,
                fecha: fecha,
                ubicacion: ubicacion
            });
            alert(`Monto sumado. La nueva deuda total de ${contacto} es de $${totalActualizado.toFixed(2)}`);
        } else {
            await addDoc(collection(db, "registros"), {
                contacto: contacto,
                telefono: telefono,
                monto: montoNuevo,
                estado: estado,
                fecha: fecha,
                ubicacion: ubicacion
            });
            alert("¡Registro de divisa guardado exitosamente!");
        }

        // Alerta inteligente: Preguntar si desea guardar al cliente si es nuevo
        if (!window.directorioClientes || !window.directorioClientes[contacto]) {
            if (confirm(`El contacto "${contacto}" no está registrado en tu directorio. ¿Deseas agregarlo a tu lista de Clientes para el futuro?`)) {
                await addDoc(collection(db, "clientes"), {
                    nombre: contacto,
                    telefono: telefono,
                    ubicacion: ubicacion
                });
                alert("¡Cliente añadido exitosamente al directorio!");
            }
        }
        
        formulario.reset(); 
    } catch (error) {
        console.error("Error al guardar: ", error);
        alert("Hubo un error al intentar guardar.");
    }
});

// 4. Función para LEER registros en tiempo real (Divisas)
const listaRegistros = document.getElementById('lista-registros');
const totalPendienteDOM = document.getElementById('total-pendiente');

onSnapshot(collection(db, "registros"), (querySnapshot) => {
    listaRegistros.innerHTML = ''; 
    let totalAcumulado = 0; 
    
    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        const id = documento.id; 
        
        if (dato.estado !== "Pagado") {
            totalAcumulado += parseFloat(dato.monto);
        }
        
        let numLimpio = dato.telefono.replace(/[- ]/g, ""); 
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        const enlaceMapa = dato.ubicacion.startsWith('http') 
            ? dato.ubicacion 
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dato.ubicacion)}`;
        
        const botonPagado = dato.estado !== "Pagado" 
            ? `<button class="btn-pagado" data-id="${id}" style="flex: 1; margin-top: 0; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer;">✅ Pagado</button>` 
            : '';
        
        listaRegistros.innerHTML += `
            <div class="tarjeta-registro">
                <h3>${dato.contacto}</h3>
                <p><strong>Monto:</strong> $${dato.monto} | <strong>Estado:</strong> ${dato.estado}</p>
                <p><strong>Fecha:</strong> ${dato.fecha}</p>
                <p style="font-size: 0.85rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Ubi:</strong> ${dato.ubicacion}</p>
                
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <a href="${enlaceWa}" target="_blank" style="flex: 1; background-color: #25D366; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📲 WhatsApp</a>
                    <a href="${enlaceMapa}" target="_blank" style="flex: 1; background-color: #f59e0b; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📍 Mapa</a>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    ${botonPagado}
                    <button class="btn-borrar" data-id="${id}" style="flex: 1; margin-top: 0; background-color: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer;">🗑️ Borrar</button>
                </div>
            </div>
        `;
    });

    if (totalPendienteDOM) totalPendienteDOM.innerText = totalAcumulado.toFixed(2);
});

// 5. Borrar transacciones de divisas
listaRegistros.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-borrar')) {
        const idRegistro = e.target.getAttribute('data-id');
        if (confirm("¿Estás seguro de que deseas borrar este registro de divisas?")) {
            await deleteDoc(doc(db, "registros", idRegistro));
        }
    }
});

// 6. Marcar divisas como pagadas
listaRegistros.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-pagado')) {
        const idRegistro = e.target.getAttribute('data-id');
        if (confirm("¿Confirmas que esta persona ya te pagó?")) {
            await updateDoc(doc(db, "registros", idRegistro), { estado: "Pagado" });
        }
    }
});

// --- MÓDULO DE CLIENTES (CRM Y AUTOCOMPLETADO) ---
const formClientes = document.getElementById('form-clientes');
const listaClientesDOM = document.getElementById('lista-clientes');
const datalistContactos = document.getElementById('sugerencias-contactos');
window.directorioClientes = {}; 

// 7. Función para GUARDAR o ACTUALIZAR Clientes
if (formClientes) {
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    const btnGuardarCliente = document.getElementById('btn-guardar-cliente');
    const inputEditId = document.getElementById('edit-cliente-id');

    const resetFormularioClientes = () => {
        formClientes.reset();
        inputEditId.value = "";
        btnGuardarCliente.innerText = "Guardar Cliente";
        btnGuardarCliente.style.backgroundColor = "#10b981";
        btnCancelarEdicion.style.display = "none";
    };

    formClientes.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-cliente').value.trim();
        const telefono = document.getElementById('telefono-cliente').value;
        const ubicacion = document.getElementById('ubicacion-cliente').value;
        const editId = inputEditId.value; 

        try {
            if (editId) {
                // Modo Actualizar
                await updateDoc(doc(db, "clientes", editId), {
                    nombre: nombre,
                    telefono: telefono,
                    ubicacion: ubicacion
                });
                alert("¡Cliente actualizado exitosamente!");
            } else {
                // Modo Crear Nuevo
                await addDoc(collection(db, "clientes"), {
                    nombre: nombre,
                    telefono: telefono,
                    ubicacion: ubicacion
                });
                alert("¡Cliente guardado exitosamente en el directorio!");
            }
            resetFormularioClientes();
        } catch (error) {
            console.error("Error al procesar cliente:", error);
        }
    });

    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', resetFormularioClientes);
    }
}

// 8. Función para LEER Clientes (Llena la lista visual y el directorio interno)
onSnapshot(collection(db, "clientes"), (querySnapshot) => {
    if (listaClientesDOM) listaClientesDOM.innerHTML = '';
    let htmlSugerencias = '';
    window.directorioClientes = {}; 

    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        const id = documento.id;

        window.directorioClientes[dato.nombre] = {
            telefono: dato.telefono,
            ubicacion: dato.ubicacion
        };
        htmlSugerencias += `<option value="${dato.nombre}">`;

        let numLimpio = dato.telefono.replace(/[- ]/g, "");
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        const enlaceMapa = dato.ubicacion.startsWith('http') 
            ? dato.ubicacion 
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dato.ubicacion)}`;

        if (listaClientesDOM) {
            listaClientesDOM.innerHTML += `
                <div class="tarjeta-registro">
                    <h3>${dato.nombre}</h3>
                    <p><strong>Tel:</strong> ${dato.telefono}</p>
                    <p style="font-size: 0.85rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Ubi:</strong> ${dato.ubicacion}</p>
                    
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <a href="${enlaceWa}" target="_blank" style="flex: 1; background-color: #25D366; color: white; text-align: center; padding: 6px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">📲 WA</a>
                        <a href="${enlaceMapa}" target="_blank" style="flex: 1; background-color: #f59e0b; color: white; text-align: center; padding: 6px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">📍 Mapa</a>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button class="btn-editar-cliente" data-id="${id}" data-nombre="${dato.nombre}" data-telefono="${dato.telefono}" data-ubicacion="${dato.ubicacion}" style="flex: 1; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 6px; font-size: 0.85rem; cursor: pointer;">✏️ Editar</button>
                        <button class="btn-borrar-cliente" data-id="${id}" style="flex: 1; background-color: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px; font-size: 0.85rem; cursor: pointer;">🗑️ Borrar</button>
                    </div>
                </div>
            `;
        }
    });

    if (datalistContactos) {
        datalistContactos.innerHTML = htmlSugerencias;
    }
});

// 9. Borrar y Editar Clientes en la Lista
if (listaClientesDOM) {
    listaClientesDOM.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-borrar-cliente')) {
            const idRegistro = e.target.getAttribute('data-id');
            if (confirm("¿Estás seguro de borrar a este cliente del directorio?")) {
                await deleteDoc(doc(db, "clientes", idRegistro));
            }
        }

        if (e.target.classList.contains('btn-editar-cliente')) {
            const idRegistro = e.target.getAttribute('data-id');
            const nombre = e.target.getAttribute('data-nombre');
            const telefono = e.target.getAttribute('data-telefono');
            const ubicacion = e.target.getAttribute('data-ubicacion');

            document.getElementById('edit-cliente-id').value = idRegistro;
            document.getElementById('nombre-cliente').value = nombre;
            document.getElementById('telefono-cliente').value = telefono;
            document.getElementById('ubicacion-cliente').value = ubicacion;

            document.getElementById('btn-guardar-cliente').innerText = "Actualizar Cliente";
            document.getElementById('btn-guardar-cliente').style.backgroundColor = "#3b82f6";
            document.getElementById('btn-cancelar-edicion').style.display = "block";
            document.getElementById('form-clientes').scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// 10. Función para AUTO-COMPLETAR en Compra de Efectivo
const inputContacto = document.getElementById('contacto');
const inputTelefono = document.getElementById('telefono');
const inputUbicacion = document.getElementById('ubicacion');

inputContacto.addEventListener('input', (e) => {
    const nombreEscrito = e.target.value;
    if (window.directorioClientes && window.directorioClientes[nombreEscrito]) {
        inputTelefono.value = window.directorioClientes[nombreEscrito].telefono;
        inputUbicacion.value = window.directorioClientes[nombreEscrito].ubicacion;
    }
});