// Obtiene los datos de simulación almacenados en localStorage
function getSimData() {
  const resultados = JSON.parse(localStorage.getItem("resultadosSimulacion") || "[]");
  const promedios = JSON.parse(localStorage.getItem("promediosSimulacion") || "{}");
  const periodos = JSON.parse(localStorage.getItem("periodosSimulacion") || "{}");
  const nombreEmpresa = localStorage.getItem("nombreEmpresa") || "";
  return { resultados, promedios, periodos, nombreEmpresa };
}

// Evento para alternar modo oscuro
document.addEventListener("DOMContentLoaded", function() {
  const darkBtn = document.getElementById('toggle-darkmode');
  if (darkBtn) {
    darkBtn.onclick = function () {
      document.body.classList.toggle('darkmode');
    };
  }
  // Cargar datos al iniciar
  mostrarResumen();
  mostrarRiesgos();
  mostrarGraficos();
  mostrarDecisionYResumen();
});

// Muestra los valores clave en las tarjetas principales
function mostrarResumen() {
  const { promedios, resultados, nombreEmpresa } = getSimData();
  const empresaEl = document.getElementById("empresaNombre");
  if (empresaEl) {
    empresaEl.textContent = nombreEmpresa ? `Empresa: ${nombreEmpresa}` : "";
  }
  
  document.getElementById("promedioRetrasos").textContent = promedios.promedioRetrasos || "-";
  document.getElementById("promedioLlegadas").textContent = promedios.promedioLlegadas || "-";
  document.getElementById("promedioDescargas").textContent = promedios.promedioDescargas || "-";
  
  let costoGlobal = "-";
  let totalPerdidas = "-";
  
  if (resultados.length > 0) {
    const costoPorRetraso = 800, costoOperacion = 500, costoFijoDiario = 25000, costoPorPerdida = 5000;
    const totalRetrasos = resultados.reduce((acc, d) => acc + (d.retrasosDiaAnterior || 0), 0);
    const totalDescargas = resultados.reduce((acc, d) => acc + (d.descargas || 0), 0);
    const diasSimulados = resultados.length;
    
    let cola = [], barcazasPerdidas = 0;
    resultados.forEach(dia => {
      for (let i = 0; i < dia.llegadasNocturnas; i++) cola.push(0);
      cola = cola.map(e => e + 1);
      cola = cola.slice(dia.descargas);
      const antes = cola.length;
      cola = cola.filter(e => e <= 3);
      barcazasPerdidas += (antes - cola.length);
    });
    totalPerdidas = barcazasPerdidas;
    costoGlobal = (totalRetrasos * costoPorRetraso) + (totalDescargas * costoOperacion) + (diasSimulados * costoFijoDiario) + (barcazasPerdidas * costoPorPerdida);
  }
  
  document.getElementById("costoGlobal").textContent = costoGlobal !== "-" ? `$${costoGlobal.toLocaleString()}` : "-";
  document.getElementById("totalPerdidas").textContent = totalPerdidas !== "-" ? totalPerdidas : "-";
}

// Muestra los riesgos detectados en la simulación
function mostrarRiesgos() {
  const { resultados } = getSimData();
  const riesgosDiv = document.getElementById("riesgosDetectados");
  if (!riesgosDiv) return;
  riesgosDiv.innerHTML = "";
  
  if (!resultados.length) {
    riesgosDiv.innerHTML = "<li>No hay datos de simulación disponibles.</li>";
    return;
  }
  
  let riesgos = [];
  let diasRetraso = [];
  
  resultados.forEach((dia, idx) => {
    if (dia.retrasosDiaAnterior > 0) {
      diasRetraso.push(idx + 1);
    } else {
      if (diasRetraso.length >= 3) {
        riesgos.push(`⚠️ Congestión en días ${diasRetraso[0]} a ${diasRetraso[diasRetraso.length - 1]}`);
      }
      diasRetraso = [];
    }
  });
  
  if (diasRetraso.length >= 3) {
    riesgos.push(`⚠️ Congestión en días ${diasRetraso[0]} a ${diasRetraso[diasRetraso.length - 1]}`);
  }
  
  resultados.forEach((dia, idx) => {
    if (dia.llegadasNocturnas > 2 * dia.descargas && dia.descargas > 0) {
      riesgos.push(`⚠️ Día ${idx + 1}: Llegadas (${dia.llegadasNocturnas}) mucho mayores a descargas (${dia.descargas})`);
    }
  });
  
  if (riesgos.length === 0) {
    riesgosDiv.innerHTML = "<li>✅ No se detectaron riesgos significativos.</li>";
  } else {
    riesgos.forEach(msg => {
      const li = document.createElement("li");
      li.textContent = msg;
      riesgosDiv.appendChild(li);
    });
  }
}

// Renderiza los gráficos principales del dashboard
function mostrarGraficos() {
  const { resultados, promedios } = getSimData();
  
  // Limpiar contenedores de gráficos
  ['barChart', 'pieChart', 'retrasosChart', 'utilizacionChart'].forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      const parent = container.parentElement;
      // Recrear canvas para evitar conflictos
      const newCanvas = document.createElement('canvas');
      newCanvas.id = id;
      parent.innerHTML = '';
      parent.appendChild(newCanvas);
    }
  });
  
  if (!resultados.length) {
    ['barChart', 'pieChart', 'retrasosChart', 'utilizacionChart'].forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const parent = canvas.parentElement;
        parent.innerHTML = '<p class="text-muted text-center mt-3">No hay datos disponibles. Genere una simulación primero.</p>';
      }
    });
    return;
  }
  
  try {
    // Gráfico de barras: Promedios diarios
    const barCtx = document.getElementById('barChart');
    if (barCtx) {
      new Chart(barCtx, {
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
            backgroundColor: ['#ff6384', '#36a2eb', '#4fd1c5'],
            borderColor: ['#cc4f6a', '#2b82c4', '#3ca89a'],
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { 
              display: true, 
              text: 'Promedios Diarios',
              font: { size: 16, weight: 'bold' },
              color: '#2c3e50'
            }
          },
          scales: {
            x: { 
              title: { display: true, text: 'Categoría', font: { size: 13 } },
              grid: { display: false }
            },
            y: { 
              beginAtZero: true, 
              title: { display: true, text: 'Cantidad Promedio', font: { size: 13 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          }
        }
      });
    }

    // Gráfico de pastel: Llegadas nocturnas
    const pieCtx = document.getElementById('pieChart');
    if (pieCtx) {
      const llegadas = [0, 0, 0, 0, 0, 0];
      resultados.forEach(dia => {
        if (dia.llegadasNocturnas >= 0 && dia.llegadasNocturnas <= 5) {
          llegadas[dia.llegadasNocturnas]++;
        }
      });
      
      new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: ['0', '1', '2', '3', '4', '5'],
          datasets: [{
            label: 'Llegadas Nocturnas',
            data: llegadas,
            backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4fd1c5', '#a3e635', '#f87171'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { 
              position: 'bottom',
              labels: { font: { size: 12 } }
            },
            title: { 
              display: true, 
              text: 'Distribución de Llegadas Nocturnas',
              font: { size: 16, weight: 'bold' },
              color: '#2c3e50'
            }
          }
        }
      });
    }

    // Gráfico de líneas: Retrasos diarios
    const retrasosCtx = document.getElementById('retrasosChart');
    if (retrasosCtx) {
      new Chart(retrasosCtx, {
        type: 'line',
        data: {
          labels: resultados.map((_, i) => i + 1),
          datasets: [{
            label: 'Retrasos Diarios',
            data: resultados.map(d => d.retrasosDiaAnterior || 0),
            borderColor: '#ff6384',
            backgroundColor: 'rgba(255,99,132,0.15)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#ff6384',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { 
              display: true, 
              text: 'Retrasos Diarios',
              font: { size: 16, weight: 'bold' },
              color: '#2c3e50'
            }
          },
          scales: {
            x: { 
              title: { display: true, text: 'Día', font: { size: 13 } },
              grid: { display: false }
            },
            y: { 
              beginAtZero: true, 
              title: { display: true, text: 'Cantidad de Barcazas Retrasadas', font: { size: 13 } },
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { stepSize: 1 }
            }
          }
        }
      });
    }

    // Gráfico de líneas: Utilización del servidor
    const utilCtx = document.getElementById('utilizacionChart');
    if (utilCtx) {
      const utilizacion = resultados.map(d => Math.min(d.descargas / 5, 1));
      new Chart(utilCtx, {
        type: 'line',
        data: {
          labels: resultados.map((_, i) => i + 1),
          datasets: [{
            label: 'Utilización del Servidor',
            data: utilizacion,
            borderColor: '#4fd1c5',
            backgroundColor: 'rgba(79,209,197,0.18)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#4fd1c5',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            title: { 
              display: true, 
              text: 'Utilización del Servidor Diaria',
              font: { size: 16, weight: 'bold' },
              color: '#2c3e50'
            }
          },
          scales: {
            x: { 
              title: { display: true, text: 'Día', font: { size: 13 } },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              max: 1,
              title: { display: true, text: 'Porcentaje de Utilización', font: { size: 13 } },
              grid: { color: 'rgba(0,0,0,0.05)' },
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
  } catch (error) {
    console.error('Error al renderizar gráficos:', error);
  }
}

// Muestra la recomendación final y el resumen ejecutivo
function mostrarDecisionYResumen() {
  const { resultados, promedios } = getSimData();
  let decision = "No hay suficientes datos para una recomendación.";
  let resumen = "No hay datos de simulación cargados.";
  let sugerencias = [];

  if (resultados.length) {
    const perdidas = (() => {
      let cola = [], barcazasPerdidas = 0;
      resultados.forEach(dia => {
        for (let i = 0; i < dia.llegadasNocturnas; i++) cola.push(0);
        cola = cola.map(e => e + 1);
        cola = cola.slice(dia.descargas);
        const antes = cola.length;
        cola = cola.filter(e => e <= 3);
        barcazasPerdidas += (antes - cola.length);
      });
      return barcazasPerdidas;
    })();

    const promedioUtil = resultados.reduce((acc, d) => acc + Math.min(d.descargas / 5, 1), 0) / resultados.length;
    const promedioRetrasos = parseFloat(promedios.promedioRetrasos || 0);
    const promedioLlegadas = parseFloat(promedios.promedioLlegadas || 0);
    const promedioDescargas = parseFloat(promedios.promedioDescargas || 0);

    // Lógica de recomendación automática
    if (perdidas === 0 && promedioUtil > 0.85 && promedioRetrasos < 1) {
      decision = `<span style="color:#36a2eb;font-weight:700;"><i class="fas fa-check-circle"></i> El sistema está funcionando de manera óptima.</span><br>
      <span style="color:#4fd1c5;">Mantenga la configuración actual y monitoree periódicamente.</span>`;
    } else if (perdidas > 0) {
      decision = `<span style="color:#d9534f;font-weight:700;"><i class="fas fa-exclamation-triangle"></i> Se detectan pérdidas de barcazas.</span><br>
      <span style="color:#fbbf24;">Aumente la capacidad de descarga o reduzca la variabilidad de llegadas.</span>`;
    } else if (promedioRetrasos > 2) {
      decision = `<span style="color:#fbbf24;font-weight:700;"><i class="fas fa-clock"></i> Retrasos elevados detectados.</span><br>
      <span style="color:#36a2eb;">Optimice la programación de descargas o aumente recursos.</span>`;
    } else {
      decision = `<span style="color:#4fd1c5;font-weight:700;"><i class="fas fa-info-circle"></i> Revise los parámetros de operación.</span><br>
      <span style="color:#888;">Realice simulaciones adicionales para encontrar el equilibrio óptimo.</span>`;
    }

    // Resumen ejecutivo
    resumen = `
      <div>
        <span style="color:#4fd1c5;font-weight:600;">Promedio de llegadas:</span> <span style="font-weight:700;">${promedioLlegadas.toFixed(2)}</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Promedio de descargas:</span> <span style="font-weight:700;">${promedioDescargas.toFixed(2)}</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Promedio de retrasos:</span> <span style="font-weight:700;">${promedioRetrasos.toFixed(2)}</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Utilización promedio del sistema:</span> <span style="font-weight:700;">${(promedioUtil * 100).toFixed(1)}%</span><br>
        <span style="color:#4fd1c5;font-weight:600;">Total de barcazas perdidas:</span> <span style="font-weight:700;">${perdidas}</span>
      </div>
    `;

    // Sugerencias de mejora adaptativas
    if (perdidas > 0) {
      sugerencias.push("🔺 <b>Revisar la capacidad de descarga</b>: Considere aumentar el número de descargas diarias o mejorar la eficiencia del proceso.");
      sugerencias.push("🔺 <b>Reducir la variabilidad de llegadas</b>: Coordine mejor la programación de barcazas para evitar picos.");
    }
    if (promedioRetrasos > 2) {
      sugerencias.push("⏳ <b>Optimizar la programación</b>: Ajuste los turnos o recursos para reducir los retrasos.");
    }
    if (promedioUtil < 0.7) {
      sugerencias.push("📉 <b>Servidor subutilizado</b>: Reduzca recursos o aumente la demanda para mejorar la eficiencia.");
    }
    if (promedioUtil > 0.95) {
      sugerencias.push("⚠️ <b>Servidor al límite</b>: Considere agregar redundancia o capacidad para evitar saturaciones.");
    }
    if (promedioLlegadas > promedioDescargas + 1) {
      sugerencias.push("📈 <b>Desbalance entre llegadas y descargas</b>: Ajuste la logística para equilibrar el flujo.");
    }
    if (sugerencias.length === 0) {
      sugerencias.push("✅ <b>El sistema opera eficientemente.</b> Mantenga la supervisión y ajuste solo si cambian las condiciones.");
    }
  }

  const decDiv = document.getElementById("mejorDecision");
  if (decDiv) decDiv.innerHTML = decision;
  
  const resumenDiv = document.getElementById("resumenEjecutivo");
  if (resumenDiv) resumenDiv.innerHTML = resumen;
  
  const sugList = document.getElementById("sugerenciasMejora");
  if (sugList) {
    sugList.innerHTML = "";
    sugerencias.forEach(s => {
      const li = document.createElement("li");
      li.innerHTML = s;
      sugList.appendChild(li);
    });
  }
}

// Exporta el resumen ejecutivo a PDF
window.exportarPDF = function() {
  const resumen = document.getElementById("resumenEjecutivo");
  const decision = document.getElementById("mejorDecision");
  const sugerencias = document.getElementById("sugerenciasMejora");
  const empresa = document.getElementById("empresaNombre")?.textContent || "";
  
  const kpis = [
    { label: "Promedio Retrasos", value: document.getElementById("promedioRetrasos")?.textContent || "-" },
    { label: "Promedio Llegadas", value: document.getElementById("promedioLlegadas")?.textContent || "-" },
    { label: "Promedio Descargas", value: document.getElementById("promedioDescargas")?.textContent || "-" },
    { label: "Barcazas Perdidas", value: document.getElementById("totalPerdidas")?.textContent || "-" },
    { label: "Costo Total", value: document.getElementById("costoGlobal")?.textContent || "-" }
  ];
  
  const resultados = JSON.parse(localStorage.getItem("resultadosSimulacion") || "[]");
  let diasSimulados = resultados.length;
  let primerDia = diasSimulados > 0 ? 1 : "-";
  let ultimoDia = diasSimulados > 0 ? diasSimulados : "-";
  
  function getChartImg(id) {
    const canvas = document.getElementById(id);
    if (canvas && canvas.toDataURL) {
      return `<img src="${canvas.toDataURL('image/png')}" style="max-width:100%;margin-bottom:1.2rem;border-radius:12px;box-shadow:0 2px 8px rgba(79,209,197,0.2);">`;
    }
    return "";
  }
  
  if (!resumen) return;
  
  const win = window.open('', '', 'width=900,height=700');
  if (!win) {
    alert('Por favor, permita ventanas emergentes para exportar el PDF.');
    return;
  }
  
  win.document.write(`
    <html>
    <head>
      <title>Resumen Ejecutivo - Simulación Barcazas</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fa; color: #1a2636; margin: 0; padding: 2rem; }
        .pdf-header { text-align: center; margin-bottom: 2.5rem; }
        .pdf-header h1 { color: #4fd1c5; font-size: 2.2rem; margin-bottom: 0.2rem; }
        .pdf-header .pdf-subtitle { color: #888; font-size: 1.1rem; margin-bottom: 0.8rem; }
        .pdf-section { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 1.5rem 2rem; margin-bottom: 2rem; }
        .pdf-section h2 { color: #4fd1c5; font-size: 1.2rem; margin-bottom: 1rem; border-bottom: 1px solid #e0f7fa; padding-bottom: 0.5rem; }
        .pdf-section ul { color: #1a2636; font-size: 1.05rem; margin-left: 1.2rem; }
        .pdf-section .decision-text { color: #36a2eb; font-size: 1.1rem; margin-top: 0.7rem; margin-bottom: 0.7rem; }
        .pdf-footer { text-align: right; color: #888; font-size: 0.95rem; margin-top: 2.5rem; }
        .pdf-kpi-table { width:100%; border-collapse:collapse; margin-bottom:1.5rem;}
        .pdf-kpi-table th, .pdf-kpi-table td { border-bottom:1px solid #e0f7fa; padding:0.5rem 1rem; text-align:left;}
        .pdf-kpi-table th { background:#e0f7fa; color:#00796b; font-weight:700;}
        .pdf-kpi-table td { background:#fff; color:#1a2636;}
        .pdf-meta { color:#36a2eb; font-size:1.05rem; margin-bottom:1.2rem; }
        .pdf-chart-title { color:#4fd1c5; font-size:1.08rem; margin:1.2rem 0 0.5rem 0; font-weight:600;}
      </style>
    </head>
    <body>
      <div class="pdf-header">
        <h1>Resumen Ejecutivo</h1>
        <div class="pdf-subtitle">Simulación de Barcazas - Dashboard</div>
      </div>
      <div class="pdf-section">
        <div class="pdf-meta">
          <b>${empresa}</b><br>
          Días simulados: <b>${diasSimulados}</b> &nbsp; | &nbsp; Primer día: <b>${primerDia}</b> &nbsp; | &nbsp; Último día: <b>${ultimoDia}</b>
        </div>
        <h2>KPIs Principales</h2>
        <table class="pdf-kpi-table">
          <tr>
            <th>Indicador</th>
            <th>Valor</th>
          </tr>
          ${kpis.map(kpi => `<tr><td>${kpi.label}</td><td>${kpi.value}</td></tr>`).join('')}
        </table>
      </div>
      <div class="pdf-section">
        <h2>Resumen de Resultados</h2>
        <div>${resumen.innerHTML}</div>
      </div>
      <div class="pdf-section">
        <h2>Recomendación Final</h2>
        <div class="decision-text">${decision ? decision.innerHTML : ''}</div>
      </div>
      <div class="pdf-section">
        <h2>Sugerencias de Mejora</h2>
        <ul>
          ${sugerencias ? Array.from(sugerencias.children).map(li => `<li>${li.textContent}</li>`).join('') : ''}
        </ul>
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
      <div class="pdf-footer">
        Generado por el sistema de simulación - ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
};