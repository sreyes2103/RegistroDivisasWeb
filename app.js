import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, where, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5bbZjH6I-x7Rudxk-Zue7OzcPgAzVSZ0",
  authDomain: "registrodivisas.firebaseapp.com",
  projectId: "registrodivisas",
  storageBucket: "registrodivisas.firebasestorage.app",
  messagingSenderId: "939629424328",
  appId: "1:939629424328:web:eab42c8c241fd3ed89bffd"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// --- ELEMENTOS DE NAVEGACIÓN ---
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

// --- ELEMENTOS DE SEGURIDAD ---
const modalBloqueo = document.getElementById('modal-bloqueo');
const mensajeBloqueo = document.getElementById('mensaje-bloqueo');
const inputPin = document.getElementById('input-pin');
const btnDesbloquearPin = document.getElementById('btn-desbloquear-pin');
const btnReintentarBio = document.getElementById('btn-reintentar-bio');
const btnUsarPin = document.getElementById('btn-usar-pin');
const cajaModoPin = document.getElementById('caja-modo-pin');
const btnCancelarBloqueo = document.getElementById('btn-cancelar-bloqueo');
const tituloModalSeguridad = document.getElementById('titulo-modal-seguridad');

let destinoAccion = null;

// --- EVENTOS DE MENÚ PRINCIPAL ---
if(btnCompra) {
    btnCompra.onclick = () => {
        pantallaSeleccion.style.display = 'none';
        appPrincipal.style.display = 'block';
        if(estadoSelect) estadoSelect.value = 'Pendiente por retirar';
    };
}

if(btnPrestamo) {
    btnPrestamo.onclick = () => {
        abrirSeguridad("Sección de Préstamos", () => {
            pantallaSeleccion.style.display = 'none';
            appPrestamo.style.display = 'block';
        });
    };
}

if(btnClientes) {
    btnClientes.onclick = () => {
        abrirSeguridad("Directorio de Clientes", () => {
            pantallaSeleccion.style.display = 'none';
            appClientes.style.display = 'block';
        });
    };
}

// --- BOTONES VOLVER ---
if(btnVolver) {
    btnVolver.onclick = () => {
        appPrincipal.style.display = 'none';
        pantallaSeleccion.style.display = 'flex';
    };
}

if(btnVolverPrestamo) {
    btnVolverPrestamo.onclick = () => {
        appPrestamo.style.display = 'none';
        pantallaSeleccion.style.display = 'flex';
    };
}

if(btnVolverClientes) {
    btnVolverClientes.onclick = () => {
        appClientes.style.display = 'none';
        pantallaSeleccion.style.display = 'flex';
    };
}

// --- LÓGICA DE SEGURIDAD (BIOMETRÍA + PIN) ---
function abrirSeguridad(nombreSeccion, callbackExito) {
    destinoAccion = callbackExito;
    if(tituloModalSeguridad) tituloModalSeguridad.innerText = `Acceso a ${nombreSeccion}`;
    if(modalBloqueo) modalBloqueo.style.display = 'flex';
    
    let pinGuardado = localStorage.getItem('refri_pharma_pin');

    if (!pinGuardado) {
        if(mensajeBloqueo) mensajeBloqueo.innerText = "Configura un PIN numérico de respaldo (4 dígitos):";
        if(cajaModoPin) cajaModoPin.style.display = 'block';
        if(btnUsarPin) btnUsarPin.style.display = 'none';
        if(btnReintentarBio) btnReintentarBio.style.display = 'none';
        if(btnDesbloquearPin) btnDesbloquearPin.innerText = "Guardar PIN y Acceder";
        if(inputPin) { inputPin.value = ''; inputPin.focus(); }
    } else {
        if(cajaModoPin) cajaModoPin.style.display = 'none';
        if(btnUsarPin) btnUsarPin.style.display = 'block';
        if(btnReintentarBio) btnReintentarBio.style.display = 'block';
        if(mensajeBloqueo) mensajeBloqueo.innerText = "Verificando huella o Face ID...";
        dispararBiometria();
    }
}

async function dispararBiometria() {
    if (!window.PublicKeyCredential || window.location.protocol !== 'https:') {
        cambiarAModoPin("Ingresa tu PIN de seguridad:");
        return;
    }

    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        // Si nunca se ha registrado credencial local, la registramos la primera vez
        let credId = localStorage.getItem('refri_pharma_cred_id');
        if (!credId) {
            const cred = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: "Refri Pharma" },
                    user: { id: new Uint8Array(16), name: "admin", displayName: "Admin" },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                    authenticatorSelection: { 
                        authenticatorAttachment: "platform", 
                        userVerification: "required" 
                    },
                    timeout: 30000
                }
            });
            if (cred) {
                localStorage.setItem('refri_pharma_cred_id', cred.id);
                concederAcceso();
            }
        } else {
            const assertion = await navigator.credentials.get({
                publicKey: { 
                    challenge: challenge, 
                    userVerification: "required",
                    timeout: 30000 
                }
            });
            if (assertion) concederAcceso();
        }
    } catch (error) {
        console.log("Biometría no completada:", error);
        if(mensajeBloqueo) mensajeBloqueo.innerText = "No se pudo verificar. Reintenta o usa tu PIN.";
    }
}

function concederAcceso() {
    if(modalBloqueo) modalBloqueo.style.display = 'none';
    if (destinoAccion) {
        let ejecutar = destinoAccion;
        destinoAccion = null;
        ejecutar();
    }
}

function cambiarAModoPin(texto) {
    if(mensajeBloqueo) mensajeBloqueo.innerText = texto;
    if(cajaModoPin) cajaModoPin.style.display = 'block';
    if(btnUsarPin) btnUsarPin.style.display = 'none';
    if(btnDesbloquearPin) btnDesbloquearPin.innerText = "Desbloquear";
    if(inputPin) { inputPin.value = ''; inputPin.focus(); }
}

if (btnReintentarBio) {
    btnReintentarBio.onclick = () => {
        if(mensajeBloqueo) mensajeBloqueo.innerText = "Escanea tu huella o Face ID...";
        dispararBiometria();
    };
}

if (btnUsarPin) {
    btnUsarPin.onclick = () => {
        cambiarAModoPin("Ingresa tu PIN numérico de 4 dígitos:");
    };
}

if (btnCancelarBloqueo) {
    btnCancelarBloqueo.onclick = () => {
        destinoAccion = null; 
        if(modalBloqueo) modalBloqueo.style.display = 'none';
    };
}

if (btnDesbloquearPin) {
    btnDesbloquearPin.onclick = () => {
        let pinGuardado = localStorage.getItem('refri_pharma_pin');
        const valor = inputPin.value.trim();

        if (valor.length !== 4 || isNaN(valor)) {
            alert("Por favor ingresa exactamente 4 números.");
            return;
        }

        if (!pinGuardado) {
            localStorage.setItem('refri_pharma_pin', valor);
            alert("✅ PIN configurado con éxito.");
            concederAcceso();
        } else {
            if (valor === pinGuardado) {
                concederAcceso();
            } else {
                alert("❌ PIN incorrecto.");
                inputPin.value = '';
            }
        }
    };
}

if (inputPin) {
    inputPin.onkeypress = (e) => {
        if (e.key === 'Enter' && btnDesbloquearPin) btnDesbloquearPin.click();
    };
}


// =========================================================
// MÓDULO DE TRANSACCIONES (COMPRA DE EFECTIVO)
// =========================================================
const formulario = document.getElementById('formulario');
if(formulario) {
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
                    monto: totalActualizado, fecha: fecha, ubicacion: ubicacion
                });
                alert(`Monto sumado. La nueva deuda total de ${contacto} es de $${totalActualizado.toFixed(2)}`);
            } else {
                await addDoc(collection(db, "registros"), {
                    contacto: contacto, telefono: telefono, monto: montoNuevo, estado: estado, fecha: fecha, ubicacion: ubicacion
                });
                alert("¡Registro de divisa guardado exitosamente!");
            }

            if (!window.directorioClientes || !window.directorioClientes[contacto]) {
                await addDoc(collection(db, "clientes"), { nombre: contacto, telefono: telefono, ubicacion: ubicacion });
            }
            formulario.reset(); 
        } catch (error) {
            console.error("Error al guardar: ", error);
            alert("Hubo un error al intentar guardar.");
        }
    });
}

const listaRegistros = document.getElementById('lista-registros');
const totalPendienteDOM = document.getElementById('total-pendiente');

onSnapshot(collection(db, "registros"), (querySnapshot) => {
    if(!listaRegistros) return;
    listaRegistros.innerHTML = ''; 
    let totalAcumulado = 0; 
    
    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        const id = documento.id; 
        
        if (dato.estado !== "Pagado") totalAcumulado += parseFloat(dato.monto);
        
        let numLimpio = dato.telefono.replace(/[- ]/g, ""); 
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        const enlaceMapa = dato.ubicacion.startsWith('http') ? dato.ubicacion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dato.ubicacion)}`;
        
        const botonPagado = dato.estado !== "Pagado" ? `<button class="btn-pagado" data-id="${id}" style="flex: 1; margin-top: 0; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer;">✅ Pagado</button>` : '';
        
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

if(listaRegistros) {
    listaRegistros.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-borrar')) {
            if (confirm("¿Estás seguro de que deseas borrar este registro de divisas?")) {
                await deleteDoc(doc(db, "registros", e.target.getAttribute('data-id')));
            }
        }
        if (e.target.classList.contains('btn-pagado')) {
            if (confirm("¿Confirmas que esta persona ya te pagó?")) {
                await updateDoc(doc(db, "registros", e.target.getAttribute('data-id')), { estado: "Pagado" });
            }
        }
    });
}


// =========================================================
// MÓDULO DE PRÉSTAMOS (CON ABONOS Y CHECK DE INTERÉS)
// =========================================================