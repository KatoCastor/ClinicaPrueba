/* js/app.js
   SPA básico para "Clínica Virtual" - almacenamiento en localStorage
   Soporta: registro, login por rol, crear consulta (paciente), ver historial (paciente),
   ver lista de consultas pendientes (médico) y responder (médico).
*/

/* --------------------------
   CLASES (POO en JS)
   -------------------------- */
class Usuario {
  constructor(username, password, nombre, rol) {
    this.username = username;
    this.password = password;
    this.nombre = nombre;
    this.rol = rol; // 'paciente' | 'medico' | 'admin'
  }
}

class Consulta {
  constructor(id, pacienteUsername, sintomas, fecha) {
    this.id = id;
    this.pacienteUsername = pacienteUsername;
    this.sintomas = sintomas;
    this.fecha = fecha; // ISO string o fecha legible
    this.respondida = false;
    this.respuesta = null; // { medico: '', diagnostico:'', recomendaciones:'', fechaRespuesta:'' }
  }
}

/* --------------------------
   Storage helper (localStorage)
   -------------------------- */
const STORAGE_USERS = "cv_users_v1";
const STORAGE_CONSULTAS = "cv_consultas_v1";

function cargarUsuarios() {
  const raw = localStorage.getItem(STORAGE_USERS);
  return raw ? JSON.parse(raw) : [];
}
function guardarUsuarios(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}
function cargarConsultas() {
  const raw = localStorage.getItem(STORAGE_CONSULTAS);
  return raw ? JSON.parse(raw) : [];
}
function guardarConsultas(list) {
  localStorage.setItem(STORAGE_CONSULTAS, JSON.stringify(list));
}

/* --------------------------
   Inicialización con datos demo
   -------------------------- */
function inicializarDemo() {
  let users = cargarUsuarios();
  if (users.length === 0) {
    users = [
      new Usuario("paciente", "123", "Paciente Demo", "paciente"),
      new Usuario("medico", "123", "Dr. Demo", "medico"),
      new Usuario("admin", "123", "Admin Demo", "admin"),
    ];
    guardarUsuarios(users);
  }

  let consultas = cargarConsultas();
  if (consultas.length === 0) {
    // un par de consultas de ejemplo
    const c1 = new Consulta(generateId(), "paciente", "Fiebre y dolor de cabeza", ahora());
    const c2 = new Consulta(generateId(), "paciente", "Dolor abdominal leve", ahora());
    guardarConsultas([c1, c2]);
  }
}

/* --------------------------
   Utiles
   -------------------------- */
function generateId() {
  return "c" + Math.random().toString(36).slice(2, 9);
}
function ahora() {
  return new Date().toLocaleString();
}

/* --------------------------
   Manejo de secciones (SPA)
   -------------------------- */
function mostrarSeccion(id) {
  document.querySelectorAll("main section").forEach(sec => {
    sec.classList.remove("visible");
    sec.classList.add("oculto");
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.remove("oculto");
    target.classList.add("visible");
  }
}

/* --------------------------
   Estado actual (usuario logueado)
   -------------------------- */
let currentUser = null;

function setCurrentUser(userObj) {
  currentUser = userObj;
  if (userObj) {
    localStorage.setItem("cv_current_user", JSON.stringify(userObj));
  } else {
    localStorage.removeItem("cv_current_user");
  }
}
function loadCurrentUser() {
  const raw = localStorage.getItem("cv_current_user");
  if (raw) currentUser = JSON.parse(raw);
}

/* --------------------------
   RENDER: Historial paciente
   -------------------------- */
function renderHistorial() {
  const tbody = document.getElementById("tablaHistorial");
  tbody.innerHTML = "";
  const all = cargarConsultas();
  const mine = all.filter(c => c.pacienteUsername === currentUser.username);
  if (mine.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">No hay consultas aún</td></tr>`;
    return;
  }
  mine.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.fecha}</td>
      <td>${escapeHtml(c.sintomas)}</td>
      <td>${c.respondida ? `<strong>${escapeHtml(c.respuesta.diagnostico)}</strong><br>${escapeHtml(c.respuesta.recomendaciones)}<br><em>${c.respuesta.medico} - ${c.respuesta.fechaRespuesta}</em>` : '<em>Pendiente</em>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* --------------------------
   RENDER: Lista consultas (médico)
   -------------------------- */
function renderListaConsultas() {
  const cont = document.getElementById("listaConsultas");
  cont.innerHTML = "";
  const all = cargarConsultas();
  if (all.length === 0) {
    cont.innerHTML = "<p>No hay consultas registradas.</p>";
    return;
  }
  // Orden: pendientes primero
  all.sort((a,b) => a.respondida - b.respondida);
  all.forEach(c => {
    const card = document.createElement("div");
    card.className = "consulta-card";
    card.innerHTML = `
      <p><strong>Id:</strong> ${c.id} <strong>Fecha:</strong> ${c.fecha}</p>
      <p><strong>Paciente:</strong> ${c.pacienteUsername}</p>
      <p><strong>Síntomas:</strong> ${escapeHtml(c.sintomas)}</p>
      <p><strong>Estado:</strong> ${c.respondida ? 'Respondida' : 'Pendiente'}</p>
      <div class="consulta-acciones"></div>
      <hr>
    `;
    const acciones = card.querySelector(".consulta-acciones");
    if (!c.respondida) {
      const btnResp = document.createElement("button");
      btnResp.textContent = "Responder";
      btnResp.className = "btn";
      btnResp.onclick = () => responderConsultaPrompt(c.id);
      acciones.appendChild(btnResp);
    } else {
      const btnVer = document.createElement("button");
      btnVer.textContent = "Ver respuesta";
      btnVer.className = "btn-secundario";
      btnVer.onclick = () => {
        alert(`Diagnóstico: ${c.respuesta.diagnostico}\nRecomendaciones: ${c.respuesta.recomendaciones}\nPor: ${c.respuesta.medico} (${c.respuesta.fechaRespuesta})`);
      };
      acciones.appendChild(btnVer);
    }
    cont.appendChild(card);
  });
}

/* --------------------------
   RESPONDER consulta (prompt simple)
   -------------------------- */
function responderConsultaPrompt(consultaId) {
  const diagnostico = prompt("Ingrese diagnóstico tentativo:");
  if (!diagnostico) return alert("Diagnóstico requerido.");
  const recomendaciones = prompt("Ingrese recomendaciones:");
  if (recomendaciones === null) return;
  const consultas = cargarConsultas();
  const c = consultas.find(x => x.id === consultaId);
  if (!c) return alert("Consulta no encontrada.");
  c.respondida = true;
  c.respuesta = {
    medico: currentUser ? currentUser.nombre : "Médico",
    diagnostico: diagnostico,
    recomendaciones: recomendaciones,
    fechaRespuesta: ahora()
  };
  guardarConsultas(consultas);
  renderListaConsultas();
  alert("Respuesta guardada.");
}

/* --------------------------
   EVENTOS y lógica de formularios
   -------------------------- */
function bindEvents() {
  // Links para cambiar de sección
  document.getElementById("irRegistro").addEventListener("click", (e) => { e.preventDefault(); mostrarSeccion("registro"); });
  document.getElementById("irLogin").addEventListener("click", (e) => { e.preventDefault(); mostrarSeccion("login"); });

  // LOGIN
  document.getElementById("formLogin").addEventListener("submit", function(e) {
    e.preventDefault();
    const u = document.getElementById("usuario").value.trim();
    const p = document.getElementById("password").value;
    const users = cargarUsuarios();
    const found = users.find(x => x.username === u && x.password === p);
    if (!found) return alert("Usuario o contraseña incorrectos (usa demo: paciente/123, medico/123, admin/123)");
    setCurrentUser(found);
    // Redirige según rol
    if (found.rol === "paciente") {
      mostrarSeccion("panelPaciente");
    } else if (found.rol === "medico") {
      mostrarSeccion("panelMedico");
    } else {
      mostrarSeccion("panelPaciente"); // admin podría ir a panel distinto si lo implementas
    }
    actualizarUISegunUsuario();
  });

  // REGISTRO
  document.getElementById("formRegistro").addEventListener("submit", function(e) {
    e.preventDefault();
    const uname = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const rol = document.getElementById("rol").value;
    const pw = document.getElementById("regPassword").value;
    if (!uname || !correo || !rol || !pw) return alert("Completa todos los campos.");
    // crea username simple (correo antes del @)
    const suggested = correo.split("@")[0];
    const users = cargarUsuarios();
    if (users.some(u => u.username === suggested)) {
      // si existe, agrega sufijo
      let i = 1;
      let s = suggested + i;
      while (users.some(u => u.username === s)) { i++; s = suggested + i; }
      suggested = s;
    }
    const newUser = new Usuario(suggested, pw, uname, rol);
    users.push(newUser);
    guardarUsuarios(users);
    alert(`Registro simulado exitoso. Tu usuario: ${suggested}`);
    mostrarSeccion("login");
  });

  // Panel paciente: botones
  document.getElementById("btnNuevaConsulta").addEventListener("click", () => mostrarSeccion("nuevaConsulta"));
  document.getElementById("btnHistorial").addEventListener("click", () => { renderHistorial(); mostrarSeccion("historial"); });
  document.getElementById("cerrarSesion").addEventListener("click", () => { setCurrentUser(null); mostrarSeccion("login"); actualizarUISegunUsuario(); });

  // Form enviar consulta
  document.getElementById("formConsulta").addEventListener("submit", function(e) {
    e.preventDefault();
    const sintomas = document.getElementById("sintomas").value.trim();
    if (!sintomas) return alert("Describe tus síntomas.");
    const consultas = cargarConsultas();
    const c = new Consulta(generateId(), currentUser.username, sintomas, ahora());
    consultas.push(c);
    guardarConsultas(consultas);
    alert("Consulta registrada (simulada).");
    document.getElementById("sintomas").value = "";
    mostrarSeccion("panelPaciente");
  });

  // volver botones
  document.getElementById("volverPaciente").addEventListener("click", () => mostrarSeccion("panelPaciente"));
  document.getElementById("volverPaciente2").addEventListener("click", () => mostrarSeccion("panelPaciente"));

  // Panel medico: cerrar sesión
  document.getElementById("cerrarSesionMedico").addEventListener("click", () => { setCurrentUser(null); mostrarSeccion("login"); actualizarUISegunUsuario(); });
}

/* --------------------------
   UI según usuario actual (opciones disponibles)
   -------------------------- */
function actualizarUISegunUsuario() {
  // Si no hay usuario, no mostramos paneles
  if (!currentUser) {
    // limpiar inputs
    document.getElementById("formLogin").reset();
    return;
  }
  if (currentUser.rol === "paciente") {
    // no extra acciones por ahora
  } else if (currentUser.rol === "medico") {
    renderListaConsultas();
  }
}

/* --------------------------
   Helpers
   -------------------------- */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"'`]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[m]);
}

/* --------------------------
   INIT
   -------------------------- */
function initApp() {
  inicializarDemo();
  bindEvents();
  loadCurrentUser();
  if (currentUser) {
    // si ya estaba logueado, mostrar su panel
    if (currentUser.rol === "paciente") mostrarSeccion("panelPaciente");
    else if (currentUser.rol === "medico") { mostrarSeccion("panelMedico"); renderListaConsultas(); }
    else mostrarSeccion("panelPaciente");
    actualizarUISegunUsuario();
  } else {
    mostrarSeccion("login");
  }
}

/* lanzar inicialización cuando DOM esté listo */
document.addEventListener("DOMContentLoaded", initApp);
