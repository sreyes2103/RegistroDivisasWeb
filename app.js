// 1. Importar Firebase desde internet
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. Tus llaves de acceso a Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5bbZjH6I-x7Rudxk-Zue7OzcPgAzVSZ0",
  authDomain: "registrodivisas.firebaseapp.com",
  projectId: "registrodivisas",
  storageBucket: "registrodivisas.firebasestorage.app",
  messagingSenderId: "939629424328",
  appId: "1:939629424328:web:eab42c8c241fd3ed89bffd"
};

// 3. Inicializar Firebase y la Base de Datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. Programar el botón de Guardar
const formulario = document.getElementById('formulario');

formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página parpadee al enviar

    // Capturar lo que escribiste en el formulario
    const contacto = document.getElementById('contacto').value;
    const telefono = document.getElementById('telefono').value;
    const monto = document.getElementById('monto').value;
    const estado = document.getElementById('estado').value;
    const fecha = document.getElementById('fecha').value;
    const ubicacion = document.getElementById('ubicacion').value;

    try {
        // Enviar a la nube (Colección llamada "registros")
        await addDoc(collection(db, "registros"), {
            contacto: contacto,
            telefono: telefono,
            monto: parseFloat(monto), // Asegura que se guarde como número
            estado: estado,
            fecha: fecha,
            ubicacion: ubicacion
        });
        
        // Avisar que fue exitoso y limpiar las casillas
        alert("¡Registro de divisa guardado exitosamente!");
        formulario.reset(); 
        
    } catch (error) {
        console.error("Error al guardar: ", error);
        alert("Hubo un error al intentar guardar.");
    }
});