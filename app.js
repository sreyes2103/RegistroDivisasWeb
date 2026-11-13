import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 4. Función para LEER registros en tiempo real y SUMAR totales
const listaRegistros = document.getElementById('lista-registros');
const totalPendienteDOM = document.getElementById('total-pendiente');

onSnapshot(collection(db, "registros"), (querySnapshot) => {
    listaRegistros.innerHTML = ''; 
    let totalAcumulado = 0; // Iniciar la calculadora en cero
    
    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        const id = documento.id; 
        
        // Sumar al total SOLO si el estado no es "Pagado"
        if (dato.estado !== "Pagado") {
            totalAcumulado += parseFloat(dato.monto);
        }
        
        // Limpieza de número para WhatsApp
        let numLimpio = dato.telefono.replace(/[- ]/g, ""); 
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        
        listaRegistros.innerHTML += `
            <div class="tarjeta-registro">
                <h3>${dato.contacto}</h3>
                <p><strong>Monto:</strong> $${dato.monto} | <strong>Estado:</strong> ${dato.estado}</p>
                <p><strong>Fecha:</strong> ${dato.fecha} | <strong>Ubicación:</strong> ${dato.ubicacion}</p>
                
                <!-- Botones de acción -->
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <a href="${enlaceWa}" target="_blank" style="flex: 1; background-color: #25D366; color: white; text-align: center; padding: 10px; text-decoration: none; border-radius: 6px; font-weight: bold;">📲 WhatsApp</a>
                    <button class="btn-borrar" data-id="${id}" style="flex: 1; margin-top: 0; background-color: #ef4444; padding: 10px;">🗑️ Borrar</button>
                </div>
            </div>
        `;
    });

    // Mostrar el resultado final en la pantalla con dos decimales
    if (totalPendienteDOM) {
        totalPendienteDOM.innerText = totalAcumulado.toFixed(2);
    }
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
                alert("No se pudo borrar el registro.");
            }
        }
    }
});