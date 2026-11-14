import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const appPrincipal = document.getElementById('app-principal'); // Pantalla de Compra
const appPrestamo = document.getElementById('app-prestamo');   // Pantalla de Préstamo en blanco
const btnCompra = document.getElementById('btn-compra');
const btnPrestamo = document.getElementById('btn-prestamo');
const btnVolver = document.getElementById('btn-volver');
const btnVolverPrestamo = document.getElementById('btn-volver-prestamo');
const estadoSelect = document.getElementById('estado');

// Al tocar Compra de Efectivo
btnCompra.addEventListener('click', () => {
    pantallaSeleccion.style.display = 'none';
    appPrincipal.style.display = 'block';
    if(estadoSelect) estadoSelect.value = 'Pendiente por retirar';
});

// Al tocar Préstamo
btnPrestamo.addEventListener('click', () => {
    pantallaSeleccion.style.display = 'none';
    appPrestamo.style.display = 'block';
});

// Botones para volver al menú principal
btnVolver.addEventListener('click', () => {
    appPrincipal.style.display = 'none';
    pantallaSeleccion.style.display = 'flex';
});

btnVolverPrestamo.addEventListener('click', () => {
    appPrestamo.style.display = 'none';
    pantallaSeleccion.style.display = 'flex';
});
// ------------------------------------
// 3. Función para GUARDAR registros
const formulario = document.getElementById('formulario');
formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const contacto = document.getElementById('contacto').value;
    const telefono = document.getElementById('telefono').value;
    const monto = document.getElementById('monto').value;
    const estado = document.getElementById('estado').value;
    const fecha = document.getElementById('fecha').value;
    const ubicacion = document.getElementById('ubicacion').value;

    try {
        await addDoc(collection(db, "registros"), {
            contacto: contacto,
            telefono: telefono,
            monto: parseFloat(monto),
            estado: estado,
            fecha: fecha,
            ubicacion: ubicacion
        });
        
        alert("¡Registro guardado exitosamente!");
        formulario.reset(); 
    } catch (error) {
        console.error("Error al guardar: ", error);
        alert("Hubo un error al intentar guardar.");
    }
});

// 4. Función para LEER registros en tiempo real, SUMAR y CREAR DIRECTORIO
const listaRegistros = document.getElementById('lista-registros');
const totalPendienteDOM = document.getElementById('total-pendiente');
const datalistContactos = document.getElementById('sugerencias-contactos');

onSnapshot(collection(db, "registros"), (querySnapshot) => {
    listaRegistros.innerHTML = ''; 
    let totalAcumulado = 0; 
    
    const directorio = {}; // Memoria temporal para guardar los datos únicos del vendedor
    let htmlSugerencias = ''; 
    
    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        const id = documento.id; 
        
        // Sumar solo si no está pagado
        if (dato.estado !== "Pagado") {
            totalAcumulado += parseFloat(dato.monto);
        }
        
        // Guardar en el directorio (Si el vendedor no está guardado aún, lo añade a la lista)
        if (!directorio[dato.contacto]) {
            directorio[dato.contacto] = {
                telefono: dato.telefono,
                ubicacion: dato.ubicacion
            };
            htmlSugerencias += `<option value="${dato.contacto}">`;
        }
        
        let numLimpio = dato.telefono.replace(/[- ]/g, ""); 
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        
        const botonPagado = dato.estado !== "Pagado" 
            ? `<button class="btn-pagado" data-id="${id}" style="flex: 1; margin-top: 0; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer;">✅ Pagado</button>` 
            : '';
        
        listaRegistros.innerHTML += `
            <div class="tarjeta-registro">
                <h3>${dato.contacto}</h3>
                <p><strong>Monto:</strong> $${dato.monto} | <strong>Estado:</strong> ${dato.estado}</p>
                <p><strong>Fecha:</strong> ${dato.fecha} | <strong>Ubicación:</strong> ${dato.ubicacion}</p>
                
                <div style="display: flex; gap: 8px; margin-top: 15px;">
                    <a href="${enlaceWa}" target="_blank" style="flex: 1; background-color: #25D366; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📲 WhatsApp</a>
                    ${botonPagado}
                    <button class="btn-borrar" data-id="${id}" style="flex: 1; margin-top: 0; background-color: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer;">🗑️ Borrar</button>
                </div>
            </div>
        `;
    });

    if (totalPendienteDOM) totalPendienteDOM.innerText = totalAcumulado.toFixed(2);
    if (datalistContactos) datalistContactos.innerHTML = htmlSugerencias;
    
    // Guardar el directorio de forma global para usarlo al escribir
    window.directorioContactos = directorio;
});
// 5. Función para BORRAR registros
listaRegistros.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-borrar')) {
        const idRegistro = e.target.getAttribute('data-id');
        
        if (confirm("¿Estás seguro de que deseas borrar este registro?")) {
            try {
                await deleteDoc(doc(db, "registros", idRegistro));
            } catch (error) {
                console.error("Error al borrar:", error);
            }
        }
    }
});

// 6. Función para MARCAR COMO PAGADO
listaRegistros.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-pagado')) {
        const idRegistro = e.target.getAttribute('data-id');
        
        if (confirm("¿Confirmas que esta persona ya te pagó?")) {
            try {
                await updateDoc(doc(db, "registros", idRegistro), {
                    estado: "Pagado"
                });
            } catch (error) {
                console.error("Error al actualizar:", error);
            }
        }
    }
});
// 7. Función para AUTO-COMPLETAR datos de vendedores frecuentes
const inputContacto = document.getElementById('contacto');
const inputTelefono = document.getElementById('telefono');
const inputUbicacion = document.getElementById('ubicacion');

inputContacto.addEventListener('input', (e) => {
    const nombreEscrito = e.target.value;
    
    // Si el nombre escrito coincide con uno guardado, llenamos el resto automáticamente
    if (window.directorioContactos && window.directorioContactos[nombreEscrito]) {
        inputTelefono.value = window.directorioContactos[nombreEscrito].telefono;
        inputUbicacion.value = window.directorioContactos[nombreEscrito].ubicacion;
    }
});