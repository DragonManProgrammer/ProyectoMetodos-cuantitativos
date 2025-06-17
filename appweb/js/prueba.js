// // =====================
// // Elimina una fila de una tabla de probabilidades
// // =====================
// function eliminarFila(btn) {
//   const fila = btn.parentNode.parentNode;
//   fila.remove();
// }

// // =====================
// // Agrega una fila editable a una tabla de probabilidades
// // =====================
// function agregarFila(tablaId) {
//   const tabla = document
//     .getElementById(tablaId)
//     .getElementsByTagName("tbody")[0];
//   const fila = tabla.insertRow();
//   for (let i = 0; i < 4; i++) {
//     const celda = fila.insertCell();
//     celda.contentEditable = true;
//     celda.innerText = "";
//   }
//   const celdaBoton = fila.insertCell();
//   const boton = document.createElement("button");
//   boton.innerText = "Eliminar";
//   boton.onclick = () => eliminarFila(boton);
//   celdaBoton.appendChild(boton);
// }

// =====================
// Habilita los botones para ver resultados
// =====================
function habilitarBotonesResultados() {
  // document.getElementById("btnModalResultados").disabled = false;
  document.getElementById("btnVerResultados").disabled = false;
}

// =====================
// Deshabilita los botones para ver resultados
// =====================
function deshabilitarBotonesResultados() {
  // document.getElementById("btnModalResultados").disabled = true;
  document.getElementById("btnVerResultados").disabled = true;
}

// =====================
// obtiene los costos
// =====================
function obtenerCostos() {
  return {
    costoPorRetraso: parseFloat(document.getElementById("costoInputRetraso").value) || 0,
    costoPorEstadia: parseFloat(document.getElementById("costoInputEstadia").value) || 0,
    costoPorPerdida: parseFloat(document.getElementById("costoInputPerdida").value) || 0,
  };
}


// =====================
// Esta función genera la simulación y actualiza la tabla principal y los costos
// =====================
function generarSimulacion() {
  const min = parseInt(document.getElementById("rangoMin").value);
  const max = parseInt(document.getElementById("rangoMax").value);
  const dias = parseInt(document.getElementById("dias").value);
  const tbody = document
    .getElementById("tablaSimulacion")
    .querySelector("tbody");
  tbody.innerHTML = "";

  let retrasosAnterior = 0;
  let totalRetrasos = 0,
    totalLlegadas = 0,
    totalDescargas = 0,
    totalADescargarSuma = 0;
  let totalCostoRetraso = 0,
    totalCostoEstadia = 0,
    totalCostoPerdida = 0;
  totalCostoPerdida = 0;

  // Costos unitarios
  const { costoPorRetraso, costoPorEstadia, costoPorPerdida } = obtenerCostos();

  const resultadosDiarios = [];

  let colaBarcazas = []; // arreglo para seguimiento de espera de barcazas


  // Simulación día a día
  // Día actual
  for (let i = 1; i <= dias; i++) {
    const rLlegada = Math.floor(Math.random() * (max - min + 1)) + min;
    const rDescarga = Math.floor(Math.random() * (max - min + 1)) + min;
    const llegadas = calcularLlegadas(rLlegada);

    // Tiempo máximo de espera
    const tiempoMaxEspera = parseInt(document.getElementById("tiempoMaxEspera").value);

    // 1. Aumentar espera de las que ya estaban
    colaBarcazas = colaBarcazas.map(d => d + 1);

    // 2. Identificar y eliminar barcazas perdidas
    const perdidasHoy = colaBarcazas.filter(d => d > tiempoMaxEspera).length;
    colaBarcazas = colaBarcazas.filter(d => d <= tiempoMaxEspera); // eliminar barcazas perdidas

    // 3. Calcular retrasos visibles reales (las que aún están en cola)
    const retrasosVisibles = colaBarcazas.length;

    // 4. Calcular total a descargar del día: lo visible + las nuevas llegadas
    const totalADescargar = retrasosVisibles + llegadas;

    // 5. Calcular descargas base
    let descargas = Math.min(totalADescargar, calcularDescargas(rDescarga));

    // 6. Aplicar afectación del evento
    let tipoEvento = "ninguno";
    let afectacion = 0;
    if (tipoEvento !== "ninguno") {
      descargas = Math.floor(descargas * (1 - afectacion / 100));
    }

    // 7. Descargar barcazas más antiguas (las de la cola y las nuevas)
    for (let j = 0; j < descargas && colaBarcazas.length > 0; j++) {
      colaBarcazas.shift();
    }

    //las nuevas q si se descargan lo hacen implicitamente al no entrar a la cola

    // 8. Agregar las nuevas no descargadas
    const noDescargadas = totalADescargar - descargas;
    for (let j = 0; j < noDescargadas; j++) {
      colaBarcazas.push(1);
    }

    // 9. Costos y actualización de estado
    const costoRetrasoDia = retrasosVisibles * costoPorRetraso;
    const costoEstadiaDia = totalADescargar * costoPorEstadia;
    const costoPerdidaDia = perdidasHoy * costoPorPerdida;

    totalCostoRetraso += costoRetrasoDia;
    totalCostoEstadia += costoEstadiaDia;
    totalCostoPerdida += costoPerdidaDia;

    retrasosAnterior = colaBarcazas.length;

    // 10. Insertar fila
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>
        <select class="evento-select">
            <option value="ninguno" selected>Ninguno</option>
            <option value="tormenta">Tormenta</option>
            <option value="huelga">Huelga</option>
            <option value="otro">Otro</option>
        </select>
      </td>
      <td><span contenteditable="false" class="afectacion-celda">0</span>%</td>
      <td>${i}</td>
      <td>
        ${retrasosVisibles}
        ${perdidasHoy > 0
        ? `<sup class="text-danger" title="Se fueron ${perdidasHoy} barcazas por espera prolongada">−${perdidasHoy}</sup>`
        : ""}
      </td>
      <td>${rLlegada}</td>
      <td contenteditable="true">${llegadas}</td>
      <td>${totalADescargar}</td>
      <td contenteditable="true">${rDescarga}</td>
      <td>${descargas}</td>
      <td class="costoRetraso">${costoRetrasoDia.toLocaleString()}</td>
      <td class="costoEstadia">${costoEstadiaDia.toLocaleString()}</td>
      <td class="costoPerdida">${costoPerdidaDia.toLocaleString()}</td>
    `;
    tbody.appendChild(fila);


    // Guarda los resultados de este día
    resultadosDiarios.push({
      dia: i,
      retrasosDiaAnterior: retrasosAnterior,
      numeroAleatorioLlegadas: rLlegada,
      llegadasNocturnas: llegadas,
      totalADescargar: totalADescargar,
      numeroAleatorioDescargas: rDescarga,
      descargas: descargas,
      costoRetraso: costoRetrasoDia,
      costoEstadia: costoEstadiaDia,
      costoPerdida: costoPerdidaDia,
    });

    // Suma totales para el resumen
    retrasosAnterior = totalADescargar - descargas;
    totalRetrasos += retrasosVisibles;

    totalLlegadas += llegadas;
    totalDescargas += descargas;
    totalADescargarSuma += totalADescargar;
    // totalCostoRetraso += costoRetrasoDia;
    // totalCostoEstadia += costoEstadiaDia;
    // totalCostoPerdida += costoPerdidaDia;
  }

  // Actualiza los totales en la tabla de simulación
  actualizarTotales(
    totalRetrasos,
    totalLlegadas,
    totalDescargas,
    dias,
    totalADescargarSuma,
    totalCostoRetraso,
    totalCostoEstadia,
    totalCostoPerdida
  );

  // Actualiza la tabla de costos de operación
  actualizarTablaCostosOperacion(
    totalCostoRetraso,
    totalCostoEstadia,
    totalCostoPerdida
  );

  // Guarda promedios y resultados para otros usos (modal/resultados.html)
  const promedios = {
    promedioRetrasos: (totalRetrasos / dias).toFixed(2),
    promedioLlegadas: (totalLlegadas / dias).toFixed(2),
    promedioDescargas: (totalDescargas / dias).toFixed(2),
  };
  localStorage.setItem(
    "resultadosSimulacion",
    JSON.stringify(resultadosDiarios)
  );
  localStorage.setItem("promediosSimulacion", JSON.stringify(promedios));

  calcularPeriodosYGuardar(resultadosDiarios);
  observarCambios();
  calcularCostosSimulacion();
}

// =====================
// Traduce número aleatorio a cantidad de llegadas según reglas del negocio
// =====================
function calcularLlegadas(valor) {
  if (valor <= 13) return 0;
  if (valor <= 30) return 1;
  if (valor <= 45) return 2;
  if (valor <= 70) return 3;
  if (valor <= 90) return 4;
  return 5;
}

// =====================
// Traduce número aleatorio a cantidad de descargas según reglas del negocio
// =====================
function calcularDescargas(valor) {
  if (valor <= 5) return 1;
  if (valor <= 20) return 2;
  if (valor <= 70) return 3;
  if (valor <= 90) return 4;
  return 5;
}

// =====================
// Actualiza los totales en el pie de la tabla de simulación
// =====================
function actualizarTotales(
  retrasos,
  llegadas,
  descargas,
  dias,
  totalADescargarSuma = 0,
  totalCostoRetraso = 0,
  totalCostoEstadia = 0,
  totalCostoPerdida = 0
) {
  document.getElementById("totalRetrasos").textContent = retrasos;
  document.getElementById("totalLlegadas").textContent = llegadas;
  document.getElementById("totalDescargas").textContent = descargas;
  if (document.getElementById("totalADescargar"))
    document.getElementById("totalADescargar").textContent =
      totalADescargarSuma;
  if (document.getElementById("totalCostoRetraso"))
    document.getElementById("totalCostoRetraso").textContent =
      "$" + totalCostoRetraso.toLocaleString();
  if (document.getElementById("totalCostoEstadia"))
    document.getElementById("totalCostoEstadia").textContent =
      "$" + totalCostoEstadia.toLocaleString();
  if (document.getElementById("totalCostoPerdida"))
    document.getElementById("totalCostoPerdida").textContent =
      "$" + totalCostoPerdida.toLocaleString();
}

// =====================
// ACTUALIZA LOS COSTOS EN LA TABLA DE COSTOS DE OPERACIÓN (fuera y dentro del modal)
// =====================
function actualizarTablaCostosOperacion(
  totalCostoRetraso,
  totalCostoEstadia,
  totalCostoPerdida
) {
  if (document.getElementById("costoRetraso"))
    document.getElementById("costoRetraso").textContent =
      "$" + totalCostoRetraso.toLocaleString();
  if (document.getElementById("costoEstadia"))
    document.getElementById("costoEstadia").textContent =
      "$" + totalCostoEstadia.toLocaleString();
  if (document.getElementById("costoPerdida"))
    document.getElementById("costoPerdida").textContent =
      "$" + totalCostoPerdida.toLocaleString();
  if (document.getElementById("costoTotalOperacion"))
    document.getElementById("costoTotalOperacion").textContent =
      "$" +
      (
        totalCostoRetraso +
        totalCostoEstadia +
        totalCostoPerdida
      ).toLocaleString();

  // También para el modal (si existe)
  if (document.getElementById("costoRetrasoModal"))
    document.getElementById("costoRetrasoModal").textContent =
      "$" + totalCostoRetraso.toLocaleString();
  if (document.getElementById("costoEstadiaModal"))
    document.getElementById("costoEstadiaModal").textContent =
      "$" + totalCostoEstadia.toLocaleString();
  if (document.getElementById("costoPerdidaModal"))
    document.getElementById("costoPerdidaModal").textContent =
      "$" + totalCostoPerdida.toLocaleString();
  if (document.getElementById("costoTotalOperacionModal"))
    document.getElementById("costoTotalOperacionModal").textContent =
      "$" +
      (
        totalCostoRetraso +
        totalCostoEstadia +
        totalCostoPerdida
      ).toLocaleString();
}

// =====================
// Hace que las celdas editables de la tabla propaguen cambios
// =====================
function observarCambios() {
  const tbody = document.querySelector("#tablaSimulacion tbody");

  // Refrescar celdas editables
  tbody.querySelectorAll("td[contenteditable=true]").forEach((cell) => {
    const newCell = cell.cloneNode(true);
    cell.parentNode.replaceChild(newCell, cell);
  });

  // Escuchar cambios en celdas editables normales
  tbody.querySelectorAll("td[contenteditable=true]").forEach((cell) => {
    cell.addEventListener("input", recalcularYPropagar);
    cell.addEventListener("blur", recalcularYPropagar);
    cell.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.blur();
      }
    });
  });

  // Escuchar cambios en el select de evento
  tbody.querySelectorAll(".evento-select").forEach(select => {
    select.addEventListener("change", () => {
      const row = select.closest("tr");
      const celda = row.querySelector(".afectacion-celda");


      if (!celda) return;

      // Evento tormenta
      if (select.value === "tormenta") {
        celda.textContent = "50"; // solo el número
        celda.contentEditable = true;
      }
      // Evento huelga
      else if (select.value === "huelga") {
        celda.textContent = "100";
        celda.contentEditable = true;
      }
      // Evento otro (editable personalizado)
      else if (select.value === "otro") {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Nombre del evento";
        input.className = "form-control form-control-sm mt-1 nombre-evento-input";
        select.style.display = "none"; // ocultar el select
        select.parentNode.appendChild(input);
        input.focus();

        input.addEventListener("blur", () => {
          const nuevoNombre = input.value.trim();
          if (nuevoNombre) {
            const option = new Option(nuevoNombre, nuevoNombre, true, true); // text, value, selected, defaultSelected
            select.appendChild(option);
            select.value = nuevoNombre; //Establece como seleccionada esa nueva opción personalizada.
          } else {
            select.value = "ninguno";
          }
          select.style.display = "inline-block"; //hacemos q vuelva a aparecer el select, ya q lo ocultamos con none
          input.remove(); //ya no se necesita, se borra
          celda.textContent = ""; //limpiamos
          celda.contentEditable = true; //lo volvemos editable

          // Si el usuario presiona Enter estando en el select, mueve el foco a la celda de afectación
          const range = document.createRange();
          const sel = window.getSelection(); //permite manipular lo seleccionado en el doc
          range.selectNodeContents(celda); //le dice al rango q seleccione todo el contenido de la celda
          range.collapse(false); //coloco el cursor al final de la celda x false
          sel.removeAllRanges();
          sel.addRange(range);
          celda.focus(); //Le da el foco de entrada (input) a la celda, activando la edición.

          recalcularYPropagar();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur(); //dimos enter y ya esta listo, se calcula
          }
        });
      }
      // Evento ninguno
      else if (select.value === "ninguno") {
        celda.textContent = "0";
        celda.contentEditable = false;
      }

      recalcularYPropagar();
    });
  });

  // Escuchar cambios manuales en el % afectación
  tbody.querySelectorAll(".afectacion-celda").forEach(span => {

    //validamos valor ingresado
    span.addEventListener("input", () => {
      validarAfectacion(span)
      recalcularYPropagar();
    });

    // Evitar salto de línea con Enter
    span.addEventListener("keydown", (e) => {

      if (e.key === "Enter") {
        e.preventDefault(); // evita salto de línea
        validarAfectacion(span)
        span.blur(); // salir de la edicion
        recalcularYPropagar();
      }
    });
  });
}

// =====================
// valida el valor ingresado en la afectacion del evento
// =====================
function validarAfectacion(span) {
  const valor = parseInt(span.textContent.trim());

  //si no hay dato
  if (isNaN(valor) || valor < 0 || valor > 100) {
    span.textContent = "0";
  }
}

// =====================
// Recalcula totales y costos si se editan celdas manualmente
// =====================
function recalcularYPropagar() {
  const tbody = document.querySelector("#tablaSimulacion tbody");
  const tiempoMaxEspera = parseInt(document.getElementById("tiempoMaxEspera").value);
  const { costoPorRetraso, costoPorEstadia, costoPorPerdida } = obtenerCostos();

  let totalRetrasos = 0, totalLlegadas = 0, totalDescargas = 0, totalADescargarSuma = 0;
  let totalCostoRetraso = 0, totalCostoEstadia = 0, totalCostoPerdida = 0;
  let colaBarcazas = [];
  const resultadosDiarios = [];

  for (let i = 0; i < tbody.rows.length; i++) {
    const row = tbody.rows[i];

    const rLlegada = parseInt(row.cells[4].innerText) || 0;
    const llegadas = parseInt(row.cells[5].innerText) || 0;
    const rDescarga = parseInt(row.cells[7].innerText) || 0;

    // 1. Aumentar espera de las que ya estaban
    colaBarcazas = colaBarcazas.map(d => d + 1);

    // 2. Barcazas perdidas hoy
    const perdidasHoy = colaBarcazas.filter(d => d > tiempoMaxEspera).length;
    colaBarcazas = colaBarcazas.filter(d => d <= tiempoMaxEspera);

    // 3. Retrasos visibles (cola actual)
    const retrasosVisibles = colaBarcazas.length;

    // 4. Total a descargar
    const totalADescargar = retrasosVisibles + llegadas;

    // 5. Calcular descargas base
    let descargas = Math.min(totalADescargar, calcularDescargas(rDescarga));

    // 6. Afectación por evento
    const tipoEvento = row.querySelector(".evento-select")?.value || "ninguno";
    const afectacionRaw = row.querySelector(".afectacion-celda")?.textContent || "0";
    const afectacion = parseFloat(afectacionRaw.replace("%", "").trim()) || 0;

    if (tipoEvento !== "ninguno") {
      descargas = Math.floor(descargas * (1 - afectacion / 100));
    }

    // 7. Descargar barcazas
    for (let j = 0; j < descargas && colaBarcazas.length > 0; j++) {
      colaBarcazas.shift();
    }

    // 8. Agregar nuevas barcazas no descargadas
    const noDescargadas = totalADescargar - descargas;
    for (let j = 0; j < noDescargadas; j++) {
      colaBarcazas.push(1);
    }

    // 9. Costos
    const costoRetrasoDia = retrasosVisibles * costoPorRetraso;
    const costoEstadiaDia = totalADescargar * costoPorEstadia;
    const costoPerdidaDia = perdidasHoy * costoPorPerdida;

    // 10. Render fila nuevamente
    row.cells[3].innerHTML = `
      ${retrasosVisibles}
      ${perdidasHoy > 0
        ? `<sup class="text-danger" title="Se fueron ${perdidasHoy} barcazas por espera prolongada">−${perdidasHoy}</sup>`
        : ""
      }`;

    row.cells[6].textContent = totalADescargar;
    row.cells[8].textContent = descargas;
    row.cells[9].textContent = costoRetrasoDia.toLocaleString();
    row.cells[10].textContent = costoEstadiaDia.toLocaleString();
    row.cells[11].textContent = costoPerdidaDia.toLocaleString();

    // 11. Totales
    totalRetrasos += retrasosVisibles;
    totalLlegadas += llegadas;
    totalDescargas += descargas;
    totalADescargarSuma += totalADescargar;
    totalCostoRetraso += costoRetrasoDia;
    totalCostoEstadia += costoEstadiaDia;
    totalCostoPerdida += costoPerdidaDia;

    resultadosDiarios.push({
      dia: i + 1,
      retrasosDiaAnterior: retrasosVisibles,
      numeroAleatorioLlegadas: rLlegada,
      llegadasNocturnas: llegadas,
      totalADescargar: totalADescargar,
      numeroAleatorioDescargas: rDescarga,
      descargas: descargas,
      costoRetraso: costoRetrasoDia,
      costoEstadia: costoEstadiaDia,
      costoPerdida: costoPerdidaDia,
    });
  }

  // Actualizar totales
  actualizarTotales(
    totalRetrasos,
    totalLlegadas,
    totalDescargas,
    tbody.rows.length,
    totalADescargarSuma,
    totalCostoRetraso,
    totalCostoEstadia,
    totalCostoPerdida
  );

  actualizarTablaCostosOperacion(
    totalCostoRetraso,
    totalCostoEstadia,
    totalCostoPerdida
  );

  const promedios = {
    promedioRetrasos: (totalRetrasos / tbody.rows.length).toFixed(2),
    promedioLlegadas: (totalLlegadas / tbody.rows.length).toFixed(2),
    promedioDescargas: (totalDescargas / tbody.rows.length).toFixed(2),
  };

  localStorage.setItem("resultadosSimulacion", JSON.stringify(resultadosDiarios));
  localStorage.setItem("promediosSimulacion", JSON.stringify(promedios));
  calcularPeriodosYGuardar(resultadosDiarios);

  // Eventos de sincronización
  window.dispatchEvent(new StorageEvent("storage", { key: "resultadosSimulacion" }));
  window.dispatchEvent(new StorageEvent("storage", { key: "promediosSimulacion" }));
  window.dispatchEvent(new StorageEvent("storage", { key: "periodosSimulacion" }));
}


// =====================
// Guarda los datos de periodos para otros análisis
// =====================
function calcularPeriodosYGuardar(resultadosDiarios, costoPorRetraso = 100) {
  const totalDias = resultadosDiarios.length;
  const mitad = Math.ceil(totalDias / 2);

  const periodo1 = resultadosDiarios.slice(0, mitad);
  const periodo2 = resultadosDiarios.slice(mitad);

  function calcularMetrica(periodo) {
    let llegadas = 0,
      descargas = 0,
      retrasos = 0;
    periodo.forEach((dia) => {
      llegadas += dia.llegadasNocturnas;
      descargas += dia.descargas;
      retrasos += dia.retrasosDiaAnterior;
    });
    return {
      llegadas,
      descargas,
      retrasos,
      costo: retrasos * costoPorRetraso,
    };
  }

  const metrica1 = calcularMetrica(periodo1);
  const metrica2 = calcularMetrica(periodo2);

  localStorage.setItem(
    "periodosSimulacion",
    JSON.stringify({
      periodo1: metrica1,
      periodo2: metrica2,
      rango1: { inicio: 1, fin: mitad },
      rango2: { inicio: mitad + 1, fin: totalDias },
    })
  );
}

// =====================
// Calcula y actualiza costos para el modal de resultados
// =====================
function calcularCostosSimulacion() {
  const tbody = document.querySelector("#tablaSimulacion tbody");
  let costoRetraso = 0;
  let costoEstadia = 0;
  let costoPerdida = 0;

  const { costoPorRetraso, costoPorEstadia, costoPorPerdida } = obtenerCostos();

  for (let i = 0; i < tbody.rows.length; i++) {
    const row = tbody.rows[i];
    const retrasos = parseInt(row.cells[3].innerText) || 0;
    const totalADescargar = parseInt(row.cells[6].innerText) || 0;

    costoRetraso += retrasos * costoPorRetraso;
    costoEstadia += totalADescargar * costoPorEstadia;
    costoPerdida += retrasos > 0 ? retrasos * costoPorPerdida : 0;
  }

  // // Actualiza los elementos del modal (incluido el total)
  // if (document.getElementById("costoRetrasoModal")) {
  //   document.getElementById("costoRetrasoModal").textContent =
  //     "$" + costoRetraso.toLocaleString();
  //   document.getElementById("costoEstadiaModal").textContent =
  //     "$" + costoEstadia.toLocaleString();
  //   document.getElementById("costoPerdidaModal").textContent =
  //     "$" + costoPerdida.toLocaleString();
  //   if (document.getElementById("costoTotalOperacionModal"))
  //     document.getElementById("costoTotalOperacionModal").textContent =
  //       "$" + (costoRetraso + costoEstadia + costoPerdida).toLocaleString();
  // }
}

// =====================
// Evento para mostrar el modal de resultados promedio
// =====================
// document.getElementById("btnModalResultados").addEventListener("click", () => {
//   const promedios = JSON.parse(localStorage.getItem("promediosSimulacion"));
//   if (promedios) {
//     document.getElementById("promedioRetrasos").textContent =
//       promedios.promedioRetrasos;
//     document.getElementById("promedioLlegadas").textContent =
//       promedios.promedioLlegadas;
//     document.getElementById("promedioDescargas").textContent =
//       promedios.promedioDescargas;
//     calcularCostosSimulacion();
//     const modalElement = document.getElementById("staticBackdrop");
//     const modal = new bootstrap.Modal(modalElement);
//     modal.show();
//   } else {
//     document.getElementById("promedioRetrasos").textContent = "";
//     document.getElementById("promedioLlegadas").textContent = "";
//     document.getElementById("promedioDescargas").textContent = "";
//     alert(
//       "Por favor, genere primero la simulación para poder ver los resultados."
//     );
//   }
// });

// =====================
// Evento para ver los resultados en otra página (resultados.html)
// =====================
document.getElementById("btnVerResultados").addEventListener("click", () => {
  const resultados = localStorage.getItem("resultadosSimulacion");
  const promedios = localStorage.getItem("promediosSimulacion");
  if (resultados && promedios) {
    window.open("resultados.html", "_blank");
  } else {
    alert(
      "Por favor, genere primero la simulación para poder ver los resultados."
    );
  }
});

// =====================
// Deshabilita los botones de resultados al cargar la página
// =====================
window.onload = () => {
  deshabilitarBotonesResultados();
};
// =====================
// Evento para generar la simulación y habilitar botones
// =====================
document.getElementById("btnGenerar").addEventListener("click", () => {
  generarSimulacion();
  habilitarBotonesResultados();
  const mensajeAdvertencia = document.getElementById("mensajeAdvertencia");
  mensajeAdvertencia.style.display = "none";
});
