document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const nombreInput = document.getElementById("nombre");
  const mensajeError = document.getElementById("mensajeError");

  // Si estás en la pantalla donde se muestra el saludo:
  const spanNombre = document.querySelector(".nombre");
  const nombreGuardado = localStorage.getItem("nombreUsuario");

  if (spanNombre && nombreGuardado) {
    spanNombre.textContent = nombreGuardado;
  }

  // Si estás en la pantalla donde se ingresa el nombre:
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const nombre = nombreInput.value.trim();
      if (nombre) {
        localStorage.setItem("nombreUsuario", nombre);
        window.location.href = "prueba.html";
      } else {
        mensajeError.classList.remove("hidden");
        setTimeout(() => mensajeError.classList.add("hidden"), 3500);
      }
    });
  }
});


function cerrarModal() {
  document.getElementById("modal").classList.add("hidden");
}

function mostrarTabla(id) {
  // Oculta todas las tablas
  document.querySelectorAll(".tabla-contenido").forEach(t => t.classList.remove("active"));

  // Quita clase activa de todos los botones
  document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));

  // Muestra la tabla seleccionada
  document.getElementById(id).classList.add("active");

  // Activa el botón correspondiente usando data-tab
  const btn = document.querySelector(`.tab-button[data-tab="${id}"]`);
  if (btn) btn.classList.add("active");
}


document.addEventListener('DOMContentLoaded', function () {
    const infoBtn = document.getElementById('infoBtn');
    const modal = document.getElementById('modal');
    const btnCerrarModal = document.getElementById('btnCerrarModal');

    infoBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    btnCerrarModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
});
