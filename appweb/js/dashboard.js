// Refresca los datos de simulación desde la tabla (por si hay cambios manuales en eventos)
function getSimData() {
  const resultados = JSON.parse(localStorage.getItem("resultadosSimulacion") || "[]");
  const promedios = JSON.parse(localStorage.getItem("promediosSimulacion") || "{}");
  const periodos = JSON.parse(localStorage.getItem("periodosSimulacion") || "{}");
  const nombreEmpresa = localStorage.getItem("nombreEmpresa") || "";
  return { resultados, promedios, periodos, nombreEmpresa };
}

// Evento para alternar modo oscuro en el dashboard
document.addEventListener("DOMContentLoaded", function() {
  const darkBtn = document.getElementById('toggle-darkmode');
  if (darkBtn) {
    darkBtn.onclick = function () {
      document.body.classList.toggle('darkmode');
    };
  }
});

// Muestra los valores clave en las tarjetas principales del dashboard
function mostrarResumen() {
  const { promedios, resultados, nombreEmpresa } = getSimData();

  document.getElementById("empresaNombre").textContent = nombreEmpresa
    ? `Empresa: ${nombreEmpresa}`
    : "";

  document.getElementById("promedioRetrasos").textContent = promedios.promedioRetrasos || "-";
  document.getElementById("promedioLlegadas").textContent = promedios.promedioLlegadas || "-";
  document.getElementById("promedioDescargas").textContent = promedios.promedioDescargas || "-";

  // KPIs: Ajusta el tamaño de los iconos
  const kpiIcons = [
    { id: "kpiIconRetrasos", icon: "fa-clock", color: "#ff6384" },
    { id: "kpiIconLlegadas", icon: "fa-ship", color: "#36a2eb" },
    { id: "kpiIconDescargas", icon: "fa-arrow-down", color: "#4fd1c5" },
    { id: "kpiIconPerdidas", icon: "fa-exclamation-triangle", color: "#fbbf24" },
    { id: "kpiIconCosto", icon: "fa-dollar-sign", color: "#4fd1c5" }
  ];
  kpiIcons.forEach(({ id, icon, color }) => {
    let el = document.getElementById(id);
    if (el) {
      el.className = `fas ${icon}`;
      el.style.fontSize = "2.2em";
      el.style.color = color;
      el.style.marginBottom = "0.2em";
    }
  });

  //Leer pérdidas desde localStorage si están disponibles
  const totalPerdidas = localStorage.getItem("barcazasPerdidasSimulacion");

  if (resultados.length > 0) {
    const totalCosto = resultados.reduce((acc, d) =>
      acc +
      (d.costoRetraso || 0) +
      (d.costoEstadia || 0) +
      (d.costoPerdida || 0),
      0
    );

    document.getElementById("costoGlobal").textContent = totalCosto.toLocaleString("en-US");
    document.getElementById("totalPerdidas").textContent = totalPerdidas ?? "-";
  } else {
    document.getElementById("costoGlobal").textContent = "-";
    document.getElementById("totalPerdidas").textContent = "-";
  }
}

// Extrae el evento real del campo evento: solo "Tormenta", "Huelga" o el texto personalizado de "Otro"
// - Si contiene "Tormenta", devuelve "Tormenta"
// - Si contiene "Huelga", devuelve "Huelga"
// - Si empieza con "Otro ", devuelve el texto después de "Otro "
/// - Si contiene solo "Ninguno", está vacío o es "Otro" sin texto, devuelve ""
// - Si hay texto personalizado, devuelve ese texto limpiamente (sin "Ninguno", "Tormenta", "Huelga", "Otro")
function obtenerEventoLimpio(eventoRaw) {
  console.log("[obtenerEventoLimpio] Valor original recibido:", eventoRaw);
  if (!eventoRaw || typeof eventoRaw !== "string") {
    console.log("[obtenerEventoLimpio] Evento vacío o no es string. Retorna ''");
    return "";
  }
  let valor = eventoRaw.trim();
  console.log("[obtenerEventoLimpio] Tras trim:", valor);

  // Normaliza espacios y mayúsculas/minúsculas
  valor = valor.replace(/\s+/g, " ").trim();
  console.log("[obtenerEventoLimpio] Tras normalizar espacios:", valor);

  // Si contiene solo "Ninguno" o está vacío
  if (/^ninguno$/i.test(valor) || valor === "") {
    console.log("[obtenerEventoLimpio] Detectado 'Ninguno' o vacío. Retorna ''");
    return "";
  }

  // Si contiene "Tormenta" (en cualquier parte)
  if (/tormenta/i.test(valor)) {
    console.log("[obtenerEventoLimpio] Detectado 'Tormenta'. Retorna 'Tormenta'");
    return "Tormenta";
  }

  // Si contiene "Huelga" (en cualquier parte)
  if (/huelga/i.test(valor)) {
    console.log("[obtenerEventoLimpio] Detectado 'Huelga'. Retorna 'Huelga'");
    return "Huelga";
  }

  // Si empieza con "Otro " y hay texto después
  if (/^otro\s+/i.test(valor)) {
    const resto = valor.replace(/^otro\s+/i, "").trim();
    console.log("[obtenerEventoLimpio] Detectado 'Otro' con personalizado. Retorna:", resto);
    return resto;
  }

  // Si es exactamente "Otro" (sin texto)
  if (/^otro$/i.test(valor)) {
    console.log("[obtenerEventoLimpio] Detectado 'Otro' sin texto. Retorna ''");
    return "";
  }

  // Si contiene "Ninguno", "Tormenta", "Huelga", "Otro" y algo más (ej: "Ninguno Tormenta Huelga Otro Incendio")
  // Elimina esas palabras y devuelve el resto limpio
  let limpio = valor.replace(/\b(Ninguno|Tormenta|Huelga|Otro)\b/gi, "").trim();
  if (limpio) {
    console.log("[obtenerEventoLimpio] Detectado personalizado tras limpiar palabras reservadas. Retorna:", limpio);
    return limpio;
  }

  // Si no, devuelve vacío
  console.log("[obtenerEventoLimpio] No se encontró evento válido. Retorna ''");
  return "";
}

/**
 * Agrupa eventos consecutivos con el mismo nombre.
 * @param {Array<{nombre: string, dia: number}>} eventos
 * @returns {Array<{evento: string, dias: number[]}>}
 */
function agruparEventosConsecutivos(eventos) {
  if (!eventos.length) return [];
  // Ordenar por día
  eventos.sort((a, b) => a.dia - b.dia);

  const agrupados = [];
  let grupoActual = {
    evento: eventos[0].nombre,
    dias: [eventos[0].dia]
  };

  for (let i = 1; i < eventos.length; i++) {
    const ev = eventos[i];
    // Si es el mismo evento y el día es consecutivo al anterior
    if (ev.nombre === grupoActual.evento && ev.dia === grupoActual.dias[grupoActual.dias.length - 1] + 1) {
      grupoActual.dias.push(ev.dia);
    } else {
      agrupados.push(grupoActual);
      grupoActual = {
        evento: ev.nombre,
        dias: [ev.dia]
      };
    }
  }
  agrupados.push(grupoActual);
  return agrupados;
}

// Agrupa días consecutivos en arrays de rangos
function agruparDiasConsecutivos(dias) {
  if (!dias.length) return [];
  dias.sort((a, b) => a - b);
  const grupos = [];
  let grupoActual = [dias[0]];
  for (let i = 1; i < dias.length; i++) {
    if (dias[i] === grupoActual[grupoActual.length - 1] + 1) {
      grupoActual.push(dias[i]);
    } else {
      grupos.push(grupoActual);
      grupoActual = [dias[i]];
    }
  }
  grupos.push(grupoActual);
  return grupos;
}

// Agrupa días por evento (no solo consecutivos)
function agruparDiasPorEvento(eventos) {
  const mapa = {};
  eventos.forEach(ev => {
    if (!mapa[ev.nombre]) mapa[ev.nombre] = [];
    mapa[ev.nombre].push({ dia: ev.dia, afectacion: ev.afectacion });
  });
  return mapa;
}

// Muestra los riesgos detectados, identificando correctamente el evento real de cada día
function mostrarRiesgos() {
  const { resultados } = getSimData();
  // NUEVO: grid visual
  const riesgosGrid = document.getElementById("riesgosDetectadosGrid");
  const riesgosDiv = document.getElementById("riesgosDetectados");
  if (riesgosGrid) riesgosGrid.innerHTML = "";
  if (riesgosDiv) riesgosDiv.innerHTML = "";
  if (!resultados.length) return;

  let riesgos = [];
  let diasRetraso = [];

  // Congestión: retrasos consecutivos >= 3 días
  resultados.forEach((dia, idx) => {
    if (dia.retrasosDiaAnterior > 0) {
      diasRetraso.push(idx + 1);
    } else {
      if (diasRetraso.length >= 3) {
        riesgos.push({
          icon: "⚠️",
          titulo: "Congestión",
          desc: `En días ${diasRetraso[0]} a ${diasRetraso[diasRetraso.length - 1]}`,
          extra: ""
        });
      }
      diasRetraso = [];
    }
  });
  if (diasRetraso.length >= 3) {
    riesgos.push({
      icon: "⚠️",
      titulo: "Congestión",
      desc: `En días ${diasRetraso[0]} a ${diasRetraso[diasRetraso.length - 1]}`,
      extra: ""
    });
  }

  // Agrupar días con llegadas mucho mayores a descargas
  const diasLlegadasAltas = [];
  resultados.forEach((dia, idx) => {
    if (dia.llegadasNocturnas > 2 * dia.descargas) {
      diasLlegadasAltas.push(idx + 1);
    }
  });
  const gruposLlegadasAltas = agruparDiasConsecutivos(diasLlegadasAltas);
  gruposLlegadasAltas.forEach(g => {
    if (g.length === 1) {
      const d = g[0];
      riesgos.push({
        icon: "⚠️",
        titulo: "Desbalance",
        desc: `Día ${d}: Llegadas (${resultados[d-1].llegadasNocturnas}) ≫ Descargas (${resultados[d-1].descargas})`,
        extra: ""
      });
    } else {
      riesgos.push({
        icon: "⚠️",
        titulo: "Desbalance",
        desc: `Días ${g[0]} a ${g[g.length -1]}: Llegadas mucho mayores a descargas`,
        extra: ""
      });
    }
  });

  // Eventos con afectación > 0
  const eventos = [];
  resultados.forEach((dia, idx) => {
    let eventoLimpio = obtenerEventoLimpio(dia.evento);
    let afectacion = parseFloat(dia.afectacion) || 0;
    if (eventoLimpio && eventoLimpio !== "" && afectacion > 0) {
      eventos.push({ nombre: eventoLimpio, dia: idx + 1, afectacion });
    }
  });

  // Agrupa todos los días por evento (no solo consecutivos)
  const eventosAgrupados = agruparDiasPorEvento(eventos);

  Object.entries(eventosAgrupados).forEach(([nombre, lista]) => {
    const icono =
      nombre.toLowerCase() === "tormenta" ? "🌩️" :
      nombre.toLowerCase() === "huelga" ? "✊" :
      "🌦️";
    const dias = lista.map(e => e.dia).sort((a, b) => a - b);
    const afectacionProm = (lista.reduce((a, b) => a + b.afectacion, 0) / lista.length).toFixed(1);
    if (dias.length === 1) {
      riesgos.push({
        icon: icono,
        titulo: `Evento "${nombre}"`,
        desc: `Día ${dias[0]} con afectación de ${lista[0].afectacion}%`,
        extra: ""
      });
    } else {
      riesgos.push({
        icon: icono,
        titulo: `Evento "${nombre}"`,
        desc: `Días ${dias.join(", ")} (afectación promedio ${afectacionProm}%)`,
        extra: ""
      });
    }
  });

  // Render en grid vistoso
  if (riesgosGrid) {
    if (riesgos.length === 0) {
      riesgosGrid.innerHTML = `<div class="riesgo-card"><span class="riesgo-icon">✅</span><div><span class="riesgo-titulo">Sin riesgos significativos</span><div class="riesgo-desc">No se detectaron riesgos relevantes en la simulación.</div></div></div>`;
    } else {
      riesgos.forEach(r => {
        const card = document.createElement("div");
        card.className = "riesgo-card";
        card.innerHTML = `<span class="riesgo-icon">${r.icon}</span>
          <div>
            <span class="riesgo-titulo">${r.titulo}</span>
            <div class="riesgo-desc">${r.desc}</div>
            ${r.extra ? `<div class="riesgo-extra">${r.extra}</div>` : ""}
          </div>`;
        riesgosGrid.appendChild(card);
      });
    }
  }

  // Fallback para lista original (por si no hay grid)
  if (riesgosDiv) {
    if (riesgos.length === 0) {
      riesgosDiv.innerHTML = "<li>No se detectaron riesgos significativos.</li>";
    } else {
      riesgos.forEach(r => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="riesgo-icon">${r.icon}</span> <b>${r.titulo}:</b> ${r.desc}`;
        riesgosDiv.appendChild(li);
      });
    }
  }
}

// Renderiza los gráficos principales del dashboard
function mostrarGraficos() {
  const { resultados, promedios, periodos } = getSimData();
  const totalDias = resultados.length;
  // Limpia los gráficos antes de renderizar
  ['barChart', 'pieChart', 'retrasosChart', 'utilizacionChart'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const parent = canvas.parentNode;
      parent.innerHTML = `<canvas id="${id}"></canvas>`;
    }
  });
  if (!resultados.length) {
    ['barChart', 'pieChart', 'retrasosChart', 'utilizacionChart'].forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        canvas.parentNode.innerHTML = '<p class="no-data-msg">No hay datos disponibles.</p>';
      }
    });
    return;
  }
  // Gráfico de barras: Promedios diarios
  new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: ['Retrasos', 'Llegadas', 'Descargas'],
      datasets: [{
        label: 'Promedio Diario',
        data: [
          parseFloat(promedios.promedioRetrasos || 0),
          parseFloat(promedios.promedioLlegadas || 0),
          parseFloat(promedios.promedioDescargas || 0)
        ],
        backgroundColor: ['#ff6384', '#36a2eb', '#4fd1c5']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Promedios Diarios de Retrasos, Llegadas y Descargas' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Categoría (Tipo de Métrica)' }
        },
        y: { 
          beginAtZero: true, 
          title: { display: true, text: 'Valor Promedio por Día' },
          ticks: {
            precision: 2
          }
        }
      }
    }
  });

  // Gráfico de líneas: Llegadas nocturnas por día 
  const llegadasNocturnasPorDia = resultados.map(dia => dia.llegadasNocturnas);
  new Chart(document.getElementById('pieChart'), {
    type: 'line',
    data: {
      labels: resultados.map((_, i) => `Día ${i + 1}`),
      datasets: [{
        label: 'Llegadas Nocturnas',
        data: llegadasNocturnasPorDia,
        borderColor: '#36a2eb',
        backgroundColor: 'rgba(54,162,235,0.13)',
        fill: true,
        tension: 0.2,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: 'Llegadas Nocturnas por Día' },
        tooltip: {
          callbacks: {
            label: ctx => ` Día ${ctx.label}: ${ctx.parsed.y} llegadas nocturnas`
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Día de Simulación' }
        },
        y: { 
          beginAtZero: true,
          title: { display: true, text: 'Cantidad de Llegadas Nocturnas' },
          ticks: { stepSize: 1 }
        }
      }
    }
  });

  // Gráfico de líneas: Retrasos diarios
  const retrasosDiarios = resultados.map(d => d.retrasosDiaAnterior);
  const maxRetrasos = Math.max(...retrasosDiarios, 0);
  new Chart(document.getElementById('retrasosChart'), {
    type: 'line',
    data: {
      labels: resultados.map((_, i) => `Día ${i + 1}`),
      datasets: [{
        label: 'Retrasos',
        data: retrasosDiarios,
        borderColor: '#ff6384',
        backgroundColor: 'rgba(255,99,132,0.13)',
        fill: true,
        tension: 0.2,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: 'Retrasos Diarios por Día' },
        tooltip: {
          callbacks: {
            label: ctx => ` Día ${ctx.label}: ${ctx.parsed.y} barcazas retrasadas`
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Día de Simulación' }
        },
        y: {
          beginAtZero: true,
          max: maxRetrasos > 0 ? Math.max(maxRetrasos, 5) : undefined,
          title: { display: true, text: 'Cantidad de Barcazas Retrasadas' },
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });

  // Gráfico de líneas: Utilización del servidor diaria
  const utilizacion = resultados.map(d => d.descargas / 5);
  new Chart(document.getElementById('utilizacionChart'), {
    type: 'line',
    data: {
      labels: resultados.map((_, i) => `Día ${i + 1}`),
      datasets: [{
        label: 'Utilización',
        data: utilizacion,
        borderColor: '#4fd1c5',
        backgroundColor: 'rgba(79,209,197,0.18)',
        fill: true,
        tension: 0.2,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: 'Utilización del Servidor por Día' },
        tooltip: {
          callbacks: {
            label: ctx => ` Día ${ctx.label}: ${(ctx.parsed.y * 100).toFixed(1)}%`
          }
        }
      },
      scales: {
        x: { 
          title: { display: true, text: 'Día de Simulación' }
        },
        y: {
          beginAtZero: true,
          max: 1,
          title: { display: true, text: 'Porcentaje de Utilización (%)' },
          ticks: {
            callback: function (value) {
              return (value * 100).toFixed(0) + "%";
            }
          }
        }
      }
    }
  });
}

// Genera recomendaciones finales, personalizadas para cada tipo de evento y solo para el evento real de ese día
function mostrarDecisionYResumen() {
  const { resultados, promedios } = getSimData();
  let decision = "No hay suficientes datos para una recomendación.";
  let resumen = "No hay datos de simulación cargados.";
  let sugerencias = [];

  const totalPerdidas = localStorage.getItem("barcazasPerdidasSimulacion") !== null
    ? parseInt(localStorage.getItem("barcazasPerdidasSimulacion"), 10)
    : 0;

  if (resultados.length) {
    const promedioUtil = resultados.reduce((acc, d) => acc + (d.descargas / 5), 0) / resultados.length;
    const promedioRetrasos = parseFloat(promedios.promedioRetrasos || 0);
    const promedioLlegadas = parseFloat(promedios.promedioLlegadas || 0);
    const promedioDescargas = parseFloat(promedios.promedioDescargas || 0);

    // Detecta eventos válidos (solo Tormenta, Huelga o el texto personalizado de "Otro")
    const eventos = [];
    resultados.forEach((dia, idx) => {
      let eventoLimpio = obtenerEventoLimpio(dia.evento);
      let afectacion = !isNaN(parseFloat(dia.afectacion)) ? parseFloat(dia.afectacion) : 0;
      if (
        eventoLimpio &&
        eventoLimpio !== "" &&
        eventoLimpio.toLowerCase() !== "ninguno" &&
        eventoLimpio.toLowerCase() !== "otro" &&
        afectacion > 0
      ) {
        eventos.push({
          nombre: eventoLimpio,
          afectacion: afectacion,
          dia: idx + 1
        });
      }
    });

    // Agrupa eventos por nombre
    const eventosAgrupados = agruparDiasPorEvento(eventos);

    // Lógica de recomendaciones generales
    const recomendaciones = [];
    if (totalPerdidas > 0) {
      recomendaciones.push(
        "🔺 <b>Se detectaron pérdidas de barcazas</b>. Considere aumentar la capacidad de descarga, reducir el tiempo máximo de espera o mejorar la gestión de la cola para evitar pérdidas."
      );
    }
    if (promedioUtil < 0.6) {
      recomendaciones.push(
        "📉 <b>Servidor subutilizado</b>: Reduzca recursos o aumente la oferta de barcazas para mejorar la eficiencia."
      );
    } else if (promedioUtil > 0.95) {
      recomendaciones.push(
        "⚠️ <b>Servidor saturado</b>: Considere aumentar recursos o revisar la programación para evitar cuellos de botella."
      );
    }
    if (promedioRetrasos > 2) {
      recomendaciones.push(
        "⏳ <b>Retrasos elevados detectados</b>: Optimice la programación de descargas o aumente recursos."
      );
    }

    // Recomendaciones agrupadas por evento
    Object.entries(eventosAgrupados).forEach(([nombre, lista]) => {
      const dias = lista.map(e => e.dia).sort((a, b) => a - b);
      const afectacionProm = (lista.reduce((a, b) => a + b.afectacion, 0) / lista.length).toFixed(1);
      if (nombre.toLowerCase() === "tormenta") {
        recomendaciones.push(
          `🌧️ <b>Evento "Tormenta"</b> en los días ${dias.join(", ")} (afectación promedio del ${afectacionProm}%). Ajuste la programación y refuerce las medidas de seguridad durante el evento.`
        );
      } else if (nombre.toLowerCase() === "huelga") {
        recomendaciones.push(
          `🌩️ <b>Evento "Huelga"</b> en los días ${dias.join(", ")} (afectación promedio del ${afectacionProm}%). Active el plan de contingencia laboral, negocie con los representantes sindicales y mantenga informados a los clientes.`
        );
      } else {
        recomendaciones.push(
          `🌦️ <b>Evento "${nombre}"</b> en los días ${dias.join(", ")} (afectación promedio del ${afectacionProm}%). Se recomienda realizar estudios de impacto y definir medidas específicas para este tipo de eventos aleatorios.`
        );
      }
    });

    if (recomendaciones.length === 0) {
      decision = `<span style="color:#36a2eb;font-weight:700;"><i class="fas fa-check-circle"></i> La operación fue eficiente y equilibrada.</span><br>
      <span style="color:#4fd1c5;">Mantenga la estrategia actual y monitoree periódicamente los indicadores para asegurar la continuidad del buen desempeño.</span>`;
    } else if (recomendaciones.length === 1) {
      decision = `<span class="sugerencia-profesional">${recomendaciones[0]}</span>`;
    } else {
      decision = `<ul class="sugerencias-list">${recomendaciones.map(r => `<li>${r}</li>`).join("")}</ul>`;
    }

    resumen = `
      <div>
        <span style="color:#4fd1c5;font-weight:600;">Promedio de llegadas:</span> <span style="font-weight:700;">${promedioLlegadas.toFixed(2)}</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Promedio de descargas:</span> <span style="font-weight:700;">${promedioDescargas.toFixed(2)}</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Promedio de retrasos:</span> <span style="font-weight:700;">${promedioRetrasos.toFixed(2)}</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Utilización promedio del sistema:</span> <span style="font-weight:700;">${(promedioUtil * 100).toFixed(1)}%</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Total de barcazas perdidas:</span> <span style="font-weight:700;">${totalPerdidas}</span>
      </div>
    `;

    // Sugerencias de mejora agrupadas por evento (sin repeticiones)
    const sugerenciasSet = new Set();
    if (promedioUtil < 0.6) {
      sugerenciasSet.add("📉 <b>Servidor subutilizado</b>: Reduzca recursos o aumente la oferta de barcazas para mejorar la eficiencia.");
    }
    if (totalPerdidas > 0) {
      sugerenciasSet.add("🔺 <b>Revisar la capacidad de descarga</b>: Considere aumentar el número de descargas diarias o mejorar la eficiencia del proceso.");
    }
    if (promedioRetrasos > 2) {
      sugerenciasSet.add("⏳ <b>Optimizar la programación</b>: Ajuste los turnos o recursos para reducir los retrasos.");
    }
    if (promedioUtil > 0.95) {
      sugerenciasSet.add("⚠️ <b>Servidor al límite</b>: Considere agregar redundancia o capacidad para evitar saturaciones.");
    }
    if (promedioLlegadas > promedioDescargas + 1) {
      sugerenciasSet.add("📈 <b>Desbalance entre llegadas y descargas</b>: Ajuste la logística para equilibrar el flujo.");
    }

    // Sugerencias específicas por evento, agrupadas
    Object.entries(eventosAgrupados).forEach(([nombre, lista]) => {
      if (nombre.toLowerCase() === "tormenta") {
        sugerenciasSet.add(`🌧️ <b>Evento "Tormenta"</b>: Refuerce la seguridad y revise los protocolos de emergencia.`);
      } else if (nombre.toLowerCase() === "huelga") {
        sugerenciasSet.add(`🌩️ <b>Evento "Huelga"</b>: Mantenga comunicación con el personal y evalúe alternativas operativas.`);
      } else {
        sugerenciasSet.add(`🌦️ <b>Evento "${nombre}"</b>: Realice estudios de impacto y defina protocolos para este tipo de casos.`);
      }
    });

    if (sugerenciasSet.size === 0) {
      sugerenciasSet.add("✅ <b>El sistema opera eficientemente.</b> Mantenga la supervisión y ajuste solo si cambian las condiciones.");
    }
    sugerencias = Array.from(sugerenciasSet);
  }

  const decDiv = document.getElementById("mejorDecision") || document.getElementById("recomendacion");
  if (decDiv) decDiv.innerHTML = decision;
  const resumenDiv = document.getElementById("resumenEjecutivo");
  if (resumenDiv) resumenDiv.innerHTML = resumen;
  const sugList = document.getElementById("sugerenciasMejora");
  if (sugList) {
    sugList.innerHTML = "";
    sugerencias.forEach(s => {
      const li = document.createElement("li");
      li.innerHTML = s;
      li.classList.add("sugerencia-profesional");
      sugList.appendChild(li);
    });
  }
}

// Exporta el resumen ejecutivo y visualización del dashboard a PDF
window.exportarPDF = function() {
  const empresa = document.getElementById("empresaNombre")?.textContent || "";
  const kpis = [
    { label: "Promedio Retrasos", value: document.getElementById("promedioRetrasos")?.textContent || "-", icon: "fa-clock", color: "#ff6384" },
    { label: "Promedio Llegadas", value: document.getElementById("promedioLlegadas")?.textContent || "-", icon: "fa-ship", color: "#36a2eb" },
    { label: "Promedio Descargas", value: document.getElementById("promedioDescargas")?.textContent || "-", icon: "fa-arrow-down", color: "#4fd1c5" },
    { label: "Barcazas Perdidas", value: document.getElementById("totalPerdidas")?.textContent || "-", icon: "fa-exclamation-triangle", color: "#fbbf24" },
    { label: "Costo Total", value: document.getElementById("costoGlobal")?.textContent || "-", icon: "fa-dollar-sign", color: "#4fd1c5" }
  ];
  const resumen = document.getElementById("resumenEjecutivo");
  const decision = document.getElementById("mejorDecision");
  const sugerencias = document.getElementById("sugerenciasMejora");
  const riesgos = document.getElementById("riesgosDetectados");
  // Gráficos principales
  function getChartImg(id) {
    const canvas = document.getElementById(id);
    if (canvas && canvas.toDataURL) {
      return `<img src="${canvas.toDataURL('image/png')}" class="pdf-chart-img" alt="Gráfico">`;
    }
    return "";
  }
  // KPIs visuales
  function kpiCard(label, value, icon, color) {
    return `
      <div class="pdf-kpi-card" style="border-left:5px solid ${color};">
        <div class="pdf-kpi-icon" style="color:${color};"><i class="fas ${icon}"></i></div>
        <div class="pdf-kpi-label">${label}</div>
        <div class="pdf-kpi-value">${value}</div>
      </div>
    `;
  }
  // Riesgos visuales mejorados
  function riesgosPDFList() {
    if (!riesgos || !riesgos.children.length) {
      return `<div class="pdf-riesgo-card pdf-riesgo-ok">
        <span class="pdf-riesgo-icon">✅</span>
        <div>
          <span class="pdf-riesgo-titulo">Sin riesgos significativos</span>
          <div class="pdf-riesgo-desc">No se detectaron riesgos relevantes en la simulación.</div>
        </div>
      </div>`;
    }
    return Array.from(riesgos.children).map(li => {
      // Extraer icono, título y descripción si están presentes
      const temp = document.createElement('div');
      temp.innerHTML = li.innerHTML;
      const icon = temp.querySelector('.riesgo-icon')?.textContent || "⚠️";
      const bold = temp.querySelector('b')?.textContent || "";
      const desc = temp.textContent.replace(icon, '').replace(bold, '').replace(':', '').trim();
      return `
        <div class="pdf-riesgo-card">
          <span class="pdf-riesgo-icon">${icon}</span>
          <div>
            <span class="pdf-riesgo-titulo">${bold}</span>
            <div class="pdf-riesgo-desc">${desc}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  // PDF ventana
  const win = window.open('', '', 'width=1000,height=800');
  win.document.write(`
    <html>
    <head>
      <title>Resumen Ejecutivo - Dashboard Barcazas</title>
      <link rel="stylesheet" href="/appweb/css/dashboard.css">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fa; color: #1a2636; margin: 0; padding: 2.5rem 0.5rem 2.5rem 0.5rem; }
        .pdf-header { text-align: center; margin-bottom: 2.5rem; }
        .pdf-header h1 { color: #4fd1c5; font-size: 2.3rem; margin-bottom: 0.2rem; letter-spacing: 1.5px; }
        .pdf-header .pdf-subtitle { color: #888; font-size: 1.13rem; margin-bottom: 0.8rem; }
        .pdf-section { background: #fff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 2rem 2.5rem; margin: 0 auto 2.2rem auto; max-width: 900px; }
        .pdf-section h2 { color: #4fd1c5; font-size: 1.22rem; margin-bottom: 1.1rem; border-bottom: 1.5px solid #e0f7fa; padding-bottom: 0.5rem; text-align:center; letter-spacing: 0.5px;}
        .pdf-section ul { color: #1a2636; font-size: 1.05rem; margin-left: 1.2rem; }
        .pdf-section .decision-text { color: #36a2eb; font-size: 1.08rem; margin-top: 0.7rem; margin-bottom: 0.7rem; background:#f0f8ff; border-left:4px solid #36a2eb; border-radius:6px; box-shadow:0 1px 4px #36a2eb22; padding:0.7rem 1.1rem; text-align:justify;}
        .pdf-footer { text-align: right; color: #888; font-size: 0.97rem; margin-top: 2.5rem; }
        .pdf-kpi-row { display: flex; flex-wrap: wrap; gap: 1.5em; justify-content: center; margin-bottom: 1.5rem; }
        .pdf-kpi-card { background:#f7fafc; border-radius:12px; box-shadow:0 2px 8px #0001; padding:1.1em 2em 1em 1.2em; min-width:160px; max-width:220px; display:flex; flex-direction:column; align-items:center; margin-bottom:0.5em; }
        .pdf-kpi-icon { font-size:2.2em; margin-bottom:0.2em; }
        .pdf-kpi-label { color:#888; font-size:1.01em; margin-bottom:0.2em; }
        .pdf-kpi-value { color:#1a2636; font-size:1.35em; font-weight:700; }
        .pdf-chart-title { color:#4fd1c5; font-size:1.08rem; margin:1.2rem 0 0.5rem 0; font-weight:600; text-align:center;}
        .pdf-chart-img { max-width:100%; margin-bottom:1.2rem; border-radius:12px; box-shadow:0 2px 8px #4fd1c522; }
        /* --- Riesgos PDF visual mejorado --- */
        .pdf-riesgo-card {
          background: linear-gradient(100deg, #fffbe6 70%, #fff 100%);
          border-radius: 13px;
          box-shadow: 0 2px 8px #fbbf2444;
          border-left: 5px solid #d9534f;
          padding: 1em 1.3em 1em 1.3em;
          color: #b91c1c;
          min-height: 60px;
          display: flex;
          align-items: flex-start;
          gap: 0.9em;
          font-size: 1.08rem;
          margin-bottom: 0.8em;
        }
        .pdf-riesgo-ok {
          border-left: 5px solid #4fd1c5;
          color: #22a06b;
          background: linear-gradient(100deg, #e0f7fa 70%, #fff 100%);
        }
        .pdf-riesgo-icon {
          font-size: 2.1em;
          margin-right: 0.3em;
          flex-shrink: 0;
          margin-top: 0.1em;
          filter: drop-shadow(0 2px 6px #fbbf2444);
        }
        .pdf-riesgo-titulo {
          font-weight: 700;
          color: #232b36;
          font-size: 1.08em;
          margin-bottom: 0.2em;
          display: block;
        }
        .pdf-riesgo-desc {
          font-size: 1em;
          color: #b91c1c;
          margin-bottom: 0.1em;
          line-height: 1.5;
        }
        /* --- Imagen final más grande --- */
        .pdf-img-final {
          display: block;
          margin: 2.5rem auto 0 auto;
          max-width: 340px;
          border-radius: 22px;
          box-shadow: 0 4px 24px #4fd1c544;
        }
        @media (max-width: 900px) {
          .pdf-section { padding: 1.1rem 0.5rem; }
          .pdf-img-final { max-width: 95vw; }
        }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    </head>
    <body>
      <div class="pdf-header">
        <h1>Resumen Ejecutivo</h1>
        <div class="pdf-subtitle">Panel de Control - Barcazas y Logística</div>
        <div style="color:#36a2eb;font-size:1.08em;margin-bottom:0.5em;">${empresa}</div>
      </div>
      <div class="pdf-section">
        <h2>Resultados generales</h2>
        <div class="pdf-kpi-row">
          ${kpis.map(k => kpiCard(k.label, k.value, k.icon, k.color)).join("")}
        </div>
      </div>
      <div class="pdf-section">
        <h2>Visualización de Gráficos</h2>
        <div class="pdf-chart-title">Promedios Diarios</div>
        ${getChartImg('barChart')}
        <div class="pdf-chart-title">Llegadas Nocturnas</div>
        ${getChartImg('pieChart')}
        <div class="pdf-chart-title">Retrasos Diarios</div>
        ${getChartImg('retrasosChart')}
        <div class="pdf-chart-title">Utilización Servidor</div>
        ${getChartImg('utilizacionChart')}
      </div>
      <div class="pdf-section">
        <h2>Riesgos Detectados</h2>
        <div>
          ${riesgosPDFList()}
        </div>
      </div>
      <div class="pdf-section">
        <h2>Recomendación Final</h2>
        <div class="decision-text">${decision ? decision.innerHTML : ''}</div>
      </div>
      <div class="pdf-section">
        <h2>Resumen Ejecutivo</h2>
        <div class="pdf-resumen-ejecutivo">${resumen ? resumen.innerHTML : ''}</div>
      </div>
      <div class="pdf-section">
        <h2>Sugerencias de Mejora</h2>
        <ul class="pdf-sugerencias-list">
          ${sugerencias ? Array.from(sugerencias.children).map(li => `<li>${li.textContent}</li>`).join('') : ''}
        </ul>
      </div>
      <img src="/appweb/img/barcoImagen.jpg" alt="Barcazas Ilustración" class="pdf-img-final">
      <div class="pdf-footer">
        Generado por el sistema de simulación - ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
};

// Actualización automática al detectar cambios en localStorage (evento storage)
window.addEventListener("storage", function (e) {
  if (
    e.key === "resultadosSimulacion" ||
    e.key === "promediosSimulacion" ||
    e.key === "periodosSimulacion"
  ) {
    mostrarResumen();
    mostrarRiesgos();
    mostrarGraficos();
    mostrarDecisionYResumen();
  }
});

// Inicializa el dashboard al cargar la página
window.onload = function() {
  mostrarResumen();
  mostrarRiesgos();
  mostrarGraficos();
  mostrarDecisionYResumen();
};