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

// --- ELEMENTOS DE SEGURIDAD (PIN FIJO: 2103) ---
const modalBloqueo = document.getElementById('modal-bloqueo');
const mensajeBloqueo = document.getElementById('mensaje-bloqueo');
const inputPin = document.getElementById('input-pin');
const btnDesbloquearPin = document.getElementById('btn-desbloquear-pin');
const btnCancelarBloqueo = document.getElementById('btn-cancelar-bloqueo');
const tituloModalSeguridad = document.getElementById('titulo-modal-seguridad');

let destinoAccion = null;
const PIN_MAESTRO = "2103";

// --- ESTADO DE VISIBILIDAD DE DINERO EN LA CALLE ---
let montoDineroCalleGlobal = 0;
let montoVisible = true;
const totalDineroCalleDOM = document.getElementById('total-dinero-calle');
const btnToggleVisibilidad = document.getElementById('btn-toggle-visibilidad');

if (btnToggleVisibilidad) {
    btnToggleVisibilidad.onclick = () => {
        montoVisible = !montoVisible;
        if (totalDineroCalleDOM) {
            totalDineroCalleDOM.innerText = montoVisible ? montoDineroCalleGlobal.toFixed(2) : "••••••";
        }
        btnToggleVisibilidad.innerText = montoVisible ? "👁️" : "🙈";
    };
}

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

// --- LÓGICA DE SEGURIDAD POR PIN FIJO ---
function abrirSeguridad(nombreSeccion, callbackExito) {
    destinoAccion = callbackExito;
    if(tituloModalSeguridad) tituloModalSeguridad.innerText = `Acceso a ${nombreSeccion}`;
    if(modalBloqueo) modalBloqueo.style.display = 'flex';
    
    if(mensajeBloqueo) mensajeBloqueo.innerText = "Ingresa tu PIN de seguridad de 4 dígitos:";
    if(btnDesbloquearPin) btnDesbloquearPin.innerText = "Desbloquear";
    
    if(inputPin) { 
        inputPin.value = ''; 
        inputPin.focus(); 
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

if (btnCancelarBloqueo) {
    btnCancelarBloqueo.onclick = () => {
        destinoAccion = null; 
        if(modalBloqueo) modalBloqueo.style.display = 'none';
    };
}

if (btnDesbloquearPin) {
    btnDesbloquearPin.onclick = () => {
        const valor = inputPin ? inputPin.value.trim() : '';

        if (valor.length !== 4 || isNaN(valor)) {
            alert("Por favor ingresa exactamente 4 números.");
            return;
        }

        if (valor === PIN_MAESTRO) {
            concederAcceso();
        } else {
            alert("❌ PIN incorrecto.");
            if(inputPin) inputPin.value = '';
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
// MÓDULO DE PRÉSTAMOS
// =========================================================
const checkInteres = document.getElementById('check-interes');
const cajaPorcentaje = document.getElementById('caja-porcentaje');
const montoPrestamoInput = document.getElementById('monto-prestamo');
const porcentajeInput = document.getElementById('porcentaje-interes');
const displayTotalPrestamo = document.getElementById('display-total-prestamo');
const formPrestamo = document.getElementById('formulario-prestamo');

const calcularTotal = () => {
    let montoBase = parseFloat(montoPrestamoInput ? montoPrestamoInput.value : 0) || 0;
    if (checkInteres && checkInteres.checked) {
        let porcentaje = parseFloat(porcentajeInput ? porcentajeInput.value : 0) || 0;
        let total = montoBase + (montoBase * (porcentaje / 100));
        if(displayTotalPrestamo) displayTotalPrestamo.innerText = `Monto a pagar: $${total.toFixed(2)}`;
        return total;
    } else {
        if(displayTotalPrestamo) displayTotalPrestamo.innerText = `Monto a pagar: $${montoBase.toFixed(2)}`;
        return montoBase;
    }
};

if(checkInteres) {
    checkInteres.addEventListener('change', (e) => {
        if(cajaPorcentaje) cajaPorcentaje.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked && porcentajeInput) porcentajeInput.value = '';
        calcularTotal();
    });
}

if(montoPrestamoInput) montoPrestamoInput.addEventListener('input', calcularTotal);
if(porcentajeInput) porcentajeInput.addEventListener('input', calcularTotal);

if(formPrestamo) {
    formPrestamo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contacto = document.getElementById('contacto-prestamo').value.trim();
        const telefono = document.getElementById('telefono-prestamo').value;
        const montoBase = parseFloat(montoPrestamoInput.value);
        const montoTotal = calcularTotal();
        const estado = document.getElementById('estado-prestamo').value;
        const fechaInicio = document.getElementById('fecha-prestamo').value;
        const fechaFin = document.getElementById('fecha-cancelar').value;
        const ubicacion = document.getElementById('ubicacion-prestamo').value;
        const nota = document.getElementById('nota-prestamo').value.trim(); 

        const nuevoDetalle = {
            montoBase: montoBase,
            montoTotal: montoTotal,
            saldoPendiente: montoTotal,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            nota: nota,
            estado: estado,
            abonos: []
        };

        try {
            const q = query(collection(db, "prestamos"), where("contacto", "==", contacto));
            const consulta = await getDocs(q);
            let prestamoActivo = null;

            consulta.forEach((doc) => {
                if (doc.data().estado !== "Pagado") prestamoActivo = doc;
            });

            if (prestamoActivo) {
                const dataActual = prestamoActivo.data();
                const historialAnterior = dataActual.historial || [];
                historialAnterior.push(nuevoDetalle);

                await updateDoc(doc(db, "prestamos", prestamoActivo.id), {
                    historial: historialAnterior,
                    ubicacion: ubicacion
                });
                alert(`¡Préstamo sumado a la cuenta de ${contacto}!`);
            } else {
                await addDoc(collection(db, "prestamos"), {
                    contacto: contacto,
                    telefono: telefono,
                    estado: estado,
                    ubicacion: ubicacion,
                    historial: [nuevoDetalle]
                });
                alert("¡Préstamo guardado exitosamente!");
            }

            if (!window.directorioClientes || !window.directorioClientes[contacto]) {
                await addDoc(collection(db, "clientes"), { nombre: contacto, telefono: telefono, ubicacion: ubicacion });
            }
            formPrestamo.reset();
            if(cajaPorcentaje) cajaPorcentaje.style.display = 'none';
            calcularTotal();
        } catch (error) {
            console.error("Error al guardar préstamo:", error);
        }
    });
}

const listaPrestamosDOM = document.getElementById('lista-prestamos');

onSnapshot(collection(db, "prestamos"), (querySnapshot) => {
    if(!listaPrestamosDOM) return;
    listaPrestamosDOM.innerHTML = '';
    let dineroEnCalle = 0;

    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        const id = documento.id;
        
        let totalSaldoGlobal = 0;
        let totalCapitalGlobal = 0;
        let historialActivos = 0;
        let detallesHTML = '';
        let totalPrestamosCliente = dato.historial ? dato.historial.length : 0;

        if (dato.historial && dato.historial.length > 0) {
            dato.historial.forEach((item, i) => {
                if (item.saldoPendiente === undefined) item.saldoPendiente = item.montoTotal;
                let saldo = item.saldoPendiente;
                let abonos = item.abonos || [];

                totalSaldoGlobal += saldo;
                totalCapitalGlobal += item.montoBase;
                if(saldo > 0) historialActivos++;

                let abonosVisual = '';
                if(abonos.length > 0) {
                    abonosVisual = `<ul style="margin:5px 0 5px 15px; padding:0; font-size:0.8rem; color:#16a34a; list-style-type:circle;">`;
                    abonos.forEach(ab => { abonosVisual += `<li>Abono: $${ab.monto.toFixed(2)} (${ab.fecha})</li>`; });
                    abonosVisual += `</ul>`;
                }

                const notaExtra = item.nota ? `<p style="margin:8px 0 0 0; font-size: 0.85rem; color: #4b5563; background: #f3f4f6; padding: 6px; border-radius: 4px; border-left: 3px solid #3b82f6;"><strong>Nota:</strong> ${item.nota}</p>` : '';
                
                let botonesSub = '';
                let btnEditarSub = `<button class="btn-editar-sub" data-id="${id}" data-index="${i}" style="background-color: #8b5cf6; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer; font-weight:bold; flex: 1;">✏️ Editar</button>`;
                let btnAbonoSub = `<button class="btn-abono-sub" data-id="${id}" data-index="${i}" style="flex: 1; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer; font-weight:bold;">💵 Abono</button>`;
                let btnPagadoSub = `<button class="btn-pagado-sub" data-id="${id}" data-index="${i}" style="flex: 1; background-color: #10b981; color: white; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer; font-weight:bold;">✅ Pagado</button>`;

                if(saldo > 0) {
                    botonesSub = `
                        <div style="display: flex; gap: 6px; margin-top: 10px;">
                            ${btnAbonoSub}
                            ${btnPagadoSub}
                            ${btnEditarSub}
                        </div>
                    `;
                } else {
                    botonesSub = `
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
                            <p style="color: #10b981; font-weight: bold; font-size: 0.85rem; margin: 0;">✅ Préstamo liquidado</p>
                            <div style="display: flex; gap: 6px;">
                                ${btnEditarSub}
                                <button class="btn-borrar-sub" data-id="${id}" data-index="${i}" style="background-color: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 0.85rem; cursor: pointer; font-weight:bold;">🗑️ Borrar</button>
                            </div>
                        </div>
                    `;
                }

                detallesHTML += `
                    <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                        <p style="margin:0 0 5px 0; font-size: 0.95rem; color: #1e3a8a;"><strong>Préstamo #${i + 1}</strong></p>
                        <p style="margin:0; font-size: 0.85rem; color: #475569;"><strong>Fecha:</strong> ${item.fechaInicio}</p>
                        <p style="margin:0 0 5px 0; font-size: 0.85rem; color: #b91c1c;"><strong>A Cancelar:</strong> ${item.fechaFin}</p>
                        <p style="margin:0; font-size: 0.85rem; color: #333;"><strong>Capital Original:</strong> $${item.montoBase.toFixed(2)} | <strong>Deuda Original:</strong> $${item.montoTotal.toFixed(2)}</p>
                        <p style="margin:5px 0 0 0; font-size: 0.95rem; color: #b91c1c;"><strong>Saldo Pendiente: $${saldo.toFixed(2)}</strong></p>
                        ${abonosVisual}
                        ${notaExtra}
                        ${botonesSub}
                    </div>
                `;
            });
        }

        if (totalSaldoGlobal > 0) dineroEnCalle += parseFloat(totalSaldoGlobal);
        
        let numLimpio = dato.telefono.replace(/[- ]/g, "");
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        const enlaceMapa = dato.ubicacion.startsWith('http') ? dato.ubicacion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dato.ubicacion)}`;

        let textoEstado = totalSaldoGlobal > 0 ? "Deuda activa" : "Pagado";

        // SI TIENE 1 SOLO PRÉSTAMO: Mostramos el detalle completo directo en la tarjeta principal (Sin botón "Ver Detalles")
        if (totalPrestamosCliente === 1) {
            let itemUnico = dato.historial[0];
            let saldoUnico = itemUnico.saldoPendiente;
            let abonosUnico = itemUnico.abonos || [];
            let abonosVisualUnico = '';
            
            if(abonosUnico.length > 0) {
                abonosVisualUnico = `<ul style="margin:5px 0 5px 15px; padding:0; font-size:0.8rem; color:#16a34a; list-style-type:circle;">`;
                abonosUnico.forEach(ab => { abonosVisualUnico += `<li>Abono: $${ab.monto.toFixed(2)} (${ab.fecha})</li>`; });
                abonosVisualUnico += `</ul>`;
            }

            let notaExtraUnica = itemUnico.nota ? `<p style="margin:8px 0 0 0; font-size: 0.85rem; color: #4b5563; background: #f3f4f6; padding: 6px; border-radius: 4px; border-left: 3px solid #3b82f6;"><strong>Nota:</strong> ${itemUnico.nota}</p>` : '';

            listaPrestamosDOM.innerHTML += `
                <div class="tarjeta-registro" style="border-left: 4px solid #f59e0b;">
                    <h3>${dato.contacto}</h3>
                    <p style="margin:2px 0;"><strong>Fecha:</strong> ${itemUnico.fechaInicio} | <span style="color: #b91c1c;"><strong>A Cancelar:</strong> ${itemUnico.fechaFin}</span></p>
                    <p style="margin:2px 0;"><strong>Capital Original:</strong> $${itemUnico.montoBase.toFixed(2)} | <strong>Deuda Original:</strong> $${itemUnico.montoTotal.toFixed(2)}</p>
                    <p style="font-size:1.05rem; margin:5px 0;"><strong>Saldo Pendiente: <span style="color:#b91c1c;">$${saldoUnico.toFixed(2)}</span></strong></p>
                    ${abonosVisualUnico}
                    ${notaExtraUnica}
                    <p style="font-size: 0.85rem; color: #64748b; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Ubi:</strong> ${dato.ubicacion}</p>
                    
                    <div style="display: flex; gap: 8px; margin-top: 15px;">
                        <a href="${enlaceWa}" target="_blank" style="flex: 1; background-color: #25D366; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📲 WhatsApp</a>
                        <a href="${enlaceMapa}" target="_blank" style="flex: 1; background-color: #f59e0b; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📍 Mapa</a>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                     <button class="btn-abono-sub" data-id="${id}" data-index="0" style="flex: 1 1 30%; background-color: #3b82f6; color: white; border: none; padding: 9px; cursor: pointer;">💵 Abono</button>
                     <button class="btn-pagado-sub" data-id="${id}" data-index="0" style="flex: 1 1 30%; background-color: #10b981; color: white; border: none; padding: 9px; cursor: pointer;">✅ Pagado</button>
                     <button class="btn-editar-sub" data-id="${id}" data-index="0" style="flex: 1 1 30%; background-color: #8b5cf6; color: white; border: none; padding: 9px; cursor: pointer;">✏️ Editar</button>
                     <button class="btn-borrar-prestamo" data-id="${id}" style="width: 100%; background-color: #ef4444; color: white; border: none; padding: 8px; cursor: pointer;">🗑️ Borrar Préstamo</button>
                    </div>
                </div>
            `;
        } else {
            // SI TIENE VARIOS PRÉSTAMOS: Muestra el resumen y el botón para expandir detalles
            let btnPagadoGlobal = historialActivos === 1 && totalSaldoGlobal > 0 ? `<button class="btn-pagar-global" data-id="${id}" style="flex: 1; background-color: #10b981; color: white; border: none; border-radius: 6px; padding: 8px; cursor: pointer; font-weight:bold;">✅ Pagado</button>` : '';
            let btnAbonoGlobal = totalSaldoGlobal > 0 ? `<button class="btn-abono-global" data-id="${id}" style="flex: 1; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px; cursor: pointer; font-weight:bold;">💵 Abono Global</button>` : '';

            listaPrestamosDOM.innerHTML += `
                <div class="tarjeta-registro" style="border-left: 4px solid #f59e0b;">
                    <h3>${dato.contacto}</h3>
                    <p style="font-size:1.1rem; margin-bottom:5px;"><strong>Total Deuda Pendiente: <span style="color:#b91c1c;">$${totalSaldoGlobal.toFixed(2)}</span></strong></p>
                    <p><strong>Estado:</strong> ${textoEstado} | <strong>Capital Invertido:</strong> $${totalCapitalGlobal.toFixed(2)}</p>
                    <p style="font-size: 0.85rem; color: #64748b; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Ubi:</strong> ${dato.ubicacion}</p>
                    
                    <button class="btn-ver-detalles" data-target="detalles-${id}" style="width: 100%; background-color: #e2e8f0; color: #334155; border: none; border-radius: 6px; padding: 8px; font-size: 0.9rem; cursor: pointer; margin-top: 10px; font-weight: bold;">Ver los ${totalPrestamosCliente} Préstamos 🔽</button>
                    
                    <div id="detalles-${id}" style="display: none; margin-top: 10px; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">
                        ${detallesHTML}
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 15px;">
                        <a href="${enlaceWa}" target="_blank" style="flex: 1; background-color: #25D366; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📲 WhatsApp</a>
                        <a href="${enlaceMapa}" target="_blank" style="flex: 1; background-color: #f59e0b; color: white; text-align: center; padding: 8px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.9rem;">📍 Mapa</a>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        ${btnAbonoGlobal}
                        ${btnPagadoGlobal}
                        <button class="btn-borrar-prestamo" data-id="${id}" style="flex: 1; background-color: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px; cursor: pointer; font-weight:bold;">🗑️ Borrar Todo</button>
                    </div>
                </div>
            `;
        }
    });

    montoDineroCalleGlobal = dineroEnCalle;
    if (totalDineroCalleDOM) {
        totalDineroCalleDOM.innerText = montoVisible ? dineroEnCalle.toFixed(2) : "••••••";
    }
});

if (listaPrestamosDOM) {
    listaPrestamosDOM.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-borrar-prestamo')) {
            if (confirm("¿Seguro de borrar toda la ficha de préstamos de este cliente?")) {
                await deleteDoc(doc(db, "prestamos", e.target.getAttribute('data-id')));
            }
        }

        if (e.target.classList.contains('btn-borrar-sub')) {
            if (confirm("¿Estás seguro de que deseas eliminar este préstamo específico del historial?")) {
                const docRef = doc(db, "prestamos", e.target.getAttribute('data-id'));
                const indexSub = parseInt(e.target.getAttribute('data-index'));
                
                const docSnap = await getDoc(docRef);
                if(docSnap.exists()){
                    let data = docSnap.data();
                    data.historial.splice(indexSub, 1);
                    
                    if(data.historial.length === 0) {
                        await deleteDoc(docRef);
                    } else {
                        let todosPagados = data.historial.every(h => {
                            let saldo = h.saldoPendiente !== undefined ? h.saldoPendiente : h.montoTotal;
                            return saldo === 0;
                        });
                        await updateDoc(docRef, { 
                            historial: data.historial, 
                            estado: todosPagados ? "Pagado" : "Deuda activa" 
                        });
                    }
                }
            }
        }
        
        if (e.target.classList.contains('btn-ver-detalles')) {
            const divDetalles = document.getElementById(e.target.getAttribute('data-target'));
            if (divDetalles.style.display === 'none') {
                divDetalles.style.display = 'block';
                e.target.innerText = 'Ocultar Préstamos 🔼';
            } else {
                divDetalles.style.display = 'none';
                e.target.innerText = 'Ver Préstamos 🔽';
            }
        }

        // --- FUNCIÓN DE EDICIÓN DE PRÉSTAMO ---
        const ejecutarEdicionPrestamo = async (docId, indexSub) => {
            const docRef = doc(db, "prestamos", docId);
            const docSnap = await getDoc(docRef);
            if(!docSnap.exists()) return;
            
            let data = docSnap.data();
            let item = data.historial[indexSub];
            if(item.saldoPendiente === undefined) item.saldoPendiente = item.montoTotal;

            let nuevoMontoStr = prompt("Modificar Capital Base (Monto del préstamo):", item.montoBase);
            if(nuevoMontoStr === null) return;
            let nuevoMonto = parseFloat(nuevoMontoStr);
            if(isNaN(nuevoMonto) || nuevoMonto <= 0) {
                alert("Monto inválido.");
                return;
            }

            let nuevaFechaInicio = prompt("Modificar Fecha de Inicio:", item.fechaInicio);
            if(nuevaFechaInicio === null) return;

            let nuevaFechaFin = prompt("Modificar Fecha a Cancelar:", item.fechaFin);
            if(nuevaFechaFin === null) return;

            let nuevaNota = prompt("Modificar Nota / Observación:", item.nota || "");
            if(nuevaNota === null) return;

            let diferenciaOriginal = item.montoTotal - item.montoBase;
            let porcentajeEstimado = item.montoBase > 0 ? (diferenciaOriginal / item.montoBase) : 0;
            let nuevoMontoTotal = nuevoMonto + (nuevoMonto * porcentajeEstimado);

            let totalAbonado = 0;
            if(item.abonos) {
                item.abonos.forEach(ab => totalAbonado += ab.monto);
            }

            let nuevoSaldoPendiente = nuevoMontoTotal - totalAbonado;
            if(nuevoSaldoPendiente < 0) nuevoSaldoPendiente = 0;

            item.montoBase = nuevoMonto;
            item.montoTotal = nuevoMontoTotal;
            item.saldoPendiente = nuevoSaldoPendiente;
            item.fechaInicio = nuevaFechaInicio;
            item.fechaFin = nuevaFechaFin;
            item.nota = nuevaNota;

            if(nuevoSaldoPendiente === 0) {
                item.estado = "Pagado";
            } else if(item.estado === "Pagado" && nuevoSaldoPendiente > 0) {
                item.estado = "Deuda activa";
            }

            let todosPagados = data.historial.every(h => {
                let s = h.saldoPendiente !== undefined ? h.saldoPendiente : h.montoTotal;
                return s === 0;
            });

            await updateDoc(docRef, {
                historial: data.historial,
                estado: todosPagados ? "Pagado" : "Deuda activa"
            });
            alert("¡Préstamo actualizado correctamente!");
        };

        if (e.target.classList.contains('btn-editar-sub')) {
            await ejecutarEdicionPrestamo(e.target.getAttribute('data-id'), parseInt(e.target.getAttribute('data-index')));
        }

        const procesarPago = async (docId, indexSub, montoAbono, esAbono = true, esGlobal = false) => {
            const docRef = doc(db, "prestamos", docId);
            const docSnap = await getDoc(docRef);
            if(docSnap.exists()){
                let data = docSnap.data();
                let hoy = new Date().toLocaleDateString('es-VE');

                if(esGlobal) {
                    let montoRestante = montoAbono;
                    data.historial.forEach(h => {
                        if(h.saldoPendiente === undefined) h.saldoPendiente = h.montoTotal;
                        let saldo = h.saldoPendiente;
                        
                        if(saldo > 0) {
                            if(!h.abonos) h.abonos = [];
                            if(esAbono && montoRestante > 0) {
                                if(montoRestante >= saldo) {
                                    montoRestante -= saldo;
                                    h.abonos.push({fecha: hoy, monto: saldo});
                                    h.saldoPendiente = 0;
                                    h.estado = "Pagado";
                                } else {
                                    h.saldoPendiente = saldo - montoRestante;
                                    h.abonos.push({fecha: hoy, monto: montoRestante});
                                    montoRestante = 0;
                                }
                            } else if (!esAbono) {
                                h.abonos.push({fecha: hoy, monto: saldo});
                                h.saldoPendiente = 0;
                                h.estado = "Pagado";
                            }
                        }
                    });
                } else {
                    let target = data.historial[parseInt(indexSub)];
                    if(target) {
                        if(target.saldoPendiente === undefined) target.saldoPendiente = target.montoTotal;
                        if(!target.abonos) target.abonos = [];
                        
                        if(target.saldoPendiente > 0) {
                            if(esAbono) {
                                if(montoAbono > target.saldoPendiente) {
                                    alert(`El abono supera la deuda. Se ajustará al saldo pendiente de $${target.saldoPendiente.toFixed(2)}.`);
                                    montoAbono = target.saldoPendiente;
                                }
                                target.saldoPendiente -= montoAbono;
                                target.abonos.push({fecha: hoy, monto: montoAbono});
                                if(target.saldoPendiente <= 0) target.estado = "Pagado";
                            } else {
                                target.abonos.push({fecha: hoy, monto: target.saldoPendiente});
                                target.saldoPendiente = 0;
                                target.estado = "Pagado";
                            }
                        }
                    }
                }
                let todosPagados = data.historial.every(h => h.saldoPendiente === 0);
                await updateDoc(docRef, { historial: data.historial, estado: todosPagados ? "Pagado" : "Deuda activa" });
            }
        };

        if (e.target.classList.contains('btn-abono-global')) {
            let abono = prompt("Ingresa el monto a abonar al total de la deuda:");
            if(abono !== null && parseFloat(abono) > 0) {
                await procesarPago(e.target.getAttribute('data-id'), null, parseFloat(abono), true, true);
            }
        }
        
        if (e.target.classList.contains('btn-pagar-global')) {
            if (confirm("¿Confirmas que se pagó la deuda completa?")) {
                await procesarPago(e.target.getAttribute('data-id'), null, null, false, true);
            }
        }

        if (e.target.classList.contains('btn-abono-sub')) {
            let abono = prompt("Ingresa el monto a abonar al préstamo específico:");
            if(abono !== null && parseFloat(abono) > 0) {
                await procesarPago(e.target.getAttribute('data-id'), e.target.getAttribute('data-index'), parseFloat(abono), true, false);
            }
        }

        if (e.target.classList.contains('btn-pagado-sub')) {
            if (confirm("¿Confirmas que se liquidó este préstamo específico?")) {
                await procesarPago(e.target.getAttribute('data-id'), e.target.getAttribute('data-index'), null, false, false);
            }
        }
    });
}


// =========================================================
// MÓDULO DE CLIENTES (CRM)
// =========================================================
const formClientes = document.getElementById('form-clientes');
const listaClientesDOM = document.getElementById('lista-clientes');
const datalistContactos = document.getElementById('sugerencias-contactos');
window.directorioClientes = {}; 

if (formClientes) {
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    const btnGuardarCliente = document.getElementById('btn-guardar-cliente');
    const inputEditId = document.getElementById('edit-cliente-id');
    const inputNombreOriginal = document.getElementById('edit-cliente-nombre-original');

    const resetFormularioClientes = () => {
        formClientes.reset();
        inputEditId.value = "";
        if (inputNombreOriginal) inputNombreOriginal.value = ""; 
        btnGuardarCliente.innerText = "Guardar Cliente";
        btnGuardarCliente.style.backgroundColor = "#10b981";
        if(btnCancelarEdicion) btnCancelarEdicion.style.display = "none";
    };

    formClientes.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-cliente').value.trim();
        const telefono = document.getElementById('telefono-cliente').value;
        const ubicacion = document.getElementById('ubicacion-cliente').value;
        const editId = inputEditId.value; 
        const nombreOriginal = inputNombreOriginal ? inputNombreOriginal.value : ""; 

        try {
            if (editId) {
                await updateDoc(doc(db, "clientes", editId), { nombre: nombre, telefono: telefono, ubicacion: ubicacion });
                if (nombreOriginal) {
                    const qSyncReg = query(collection(db, "registros"), where("contacto", "==", nombreOriginal));
                    const consultaSyncReg = await getDocs(qSyncReg);
                    consultaSyncReg.forEach(docRegistro => { updateDoc(doc(db, "registros", docRegistro.id), { contacto: nombre, telefono: telefono, ubicacion: ubicacion }); });

                    const qSyncPres = query(collection(db, "prestamos"), where("contacto", "==", nombreOriginal));
                    const consultaSyncPres = await getDocs(qSyncPres);
                    consultaSyncPres.forEach(docPres => { updateDoc(doc(db, "prestamos", docPres.id), { contacto: nombre, telefono: telefono, ubicacion: ubicacion }); });
                }
                alert("¡Cliente actualizado!");
            } else {
                await addDoc(collection(db, "clientes"), { nombre: nombre, telefono: telefono, ubicacion: ubicacion });
                alert("¡Cliente guardado exitosamente!");
            }
            resetFormularioClientes();
        } catch (error) { console.error(error); }
    });
    if (btnCancelarEdicion) btnCancelarEdicion.addEventListener('click', resetFormularioClientes);
}

onSnapshot(collection(db, "clientes"), (querySnapshot) => {
    if (listaClientesDOM) listaClientesDOM.innerHTML = '';
    let htmlSugerencias = '';
    window.directorioClientes = {}; 

    querySnapshot.forEach((documento) => {
        const dato = documento.data();
        window.directorioClientes[dato.nombre] = { telefono: dato.telefono, ubicacion: dato.ubicacion };
        htmlSugerencias += `<option value="${dato.nombre}">`;

        let numLimpio = dato.telefono.replace(/[- ]/g, "");
        if(numLimpio.startsWith("0")) numLimpio = numLimpio.substring(1);
        const enlaceWa = `https://wa.me/58${numLimpio}`;
        const enlaceMapa = dato.ubicacion.startsWith('http') ? dato.ubicacion : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dato.ubicacion)}`;

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
                        <button class="btn-editar-cliente" data-id="${documento.id}" data-nombre="${dato.nombre}" data-telefono="${dato.telefono}" data-ubicacion="${dato.ubicacion}" style="flex: 1; background-color: #3b82f6; color: white; border: none; border-radius: 6px; padding: 6px; font-size: 0.85rem; cursor: pointer;">✏️ Editar</button>
                        <button class="btn-borrar-cliente" data-id="${documento.id}" style="flex: 1; background-color: #ef4444; color: white; border: none; border-radius: 6px; padding: 6px; font-size: 0.85rem; cursor: pointer;">🗑️ Borrar</button>
                    </div>
                </div>
            `;
        }
    });
    if (datalistContactos) datalistContactos.innerHTML = htmlSugerencias;
});

if (listaClientesDOM) {
    listaClientesDOM.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-borrar-cliente')) {
            if (confirm("¿Borrar este cliente del directorio?")) await deleteDoc(doc(db, "clientes", e.target.getAttribute('data-id')));
        }
        if (e.target.classList.contains('btn-editar-cliente')) {
            document.getElementById('edit-cliente-id').value = e.target.getAttribute('data-id');
            if (document.getElementById('edit-cliente-nombre-original')) document.getElementById('edit-cliente-nombre-original').value = e.target.getAttribute('data-nombre');
            document.getElementById('nombre-cliente').value = e.target.getAttribute('data-nombre');
            document.getElementById('telefono-cliente').value = e.target.getAttribute('data-telefono');
            document.getElementById('ubicacion-cliente').value = e.target.getAttribute('data-ubicacion');
            document.getElementById('btn-guardar-cliente').innerText = "Actualizar Cliente";
            document.getElementById('btn-guardar-cliente').style.backgroundColor = "#3b82f6";
            const btnCancel = document.getElementById('btn-cancelar-edicion');
            if(btnCancel) btnCancel.style.display = "block";
            document.getElementById('form-clientes').scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// Autocompletado de formularios
const inputContacto = document.getElementById('contacto');
if (inputContacto) {
    inputContacto.addEventListener('input', (e) => {
        const nom = e.target.value;
        if (window.directorioClientes && window.directorioClientes[nom]) {
            document.getElementById('telefono').value = window.directorioClientes[nom].telefono;
            document.getElementById('ubicacion').value = window.directorioClientes[nom].ubicacion;
        }
    });
}

const inputContactoPrestamo = document.getElementById('contacto-prestamo');
if (inputContactoPrestamo) {
    inputContactoPrestamo.addEventListener('input', (e) => {
        const nom = e.target.value;
        if (window.directorioClientes && window.directorioClientes[nom]) {
            document.getElementById('telefono-prestamo').value = window.directorioClientes[nom].telefono;
            document.getElementById('ubicacion-prestamo').value = window.directorioClientes[nom].ubicacion;
        }
    });
}

// =========================================================
// SISTEMA DE BÚSQUEDA EN VIVO
// =========================================================
const configurarBuscador = (inputElement, selectorTarjetas) => {
    if (inputElement) {
        inputElement.addEventListener('input', (e) => {
            const textoBusqueda = e.target.value.toLowerCase();
            document.querySelectorAll(selectorTarjetas).forEach(tarjeta => {
                tarjeta.style.display = tarjeta.innerText.toLowerCase().includes(textoBusqueda) ? 'block' : 'none';
            });
        });
    }
};

configurarBuscador(document.getElementById('buscador-registros'), '#lista-registros .tarjeta-registro');
configurarBuscador(document.getElementById('buscador-clientes'), '#lista-clientes .tarjeta-registro');
configurarBuscador(document.getElementById('buscador-prestamos'), '#lista-prestamos .tarjeta-registro');