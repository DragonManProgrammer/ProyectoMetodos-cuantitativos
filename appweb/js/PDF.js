// Exporta el resumen ejecutivo y visualización del dashboard a PDF
window.exportarPDF = function() {
  const { resultados, promedios, nombreEmpresa } = getSimData ? getSimData() : {resultados:[], promedios:{}, nombreEmpresa:""};
  const empresa = document.getElementById("empresaNombre")?.textContent || nombreEmpresa || "";
  const promedioRetrasos = promedios.promedioRetrasos || "-";
  const promedioLlegadas = promedios.promedioLlegadas || "-";
  const promedioDescargas = promedios.promedioDescargas || "-";
  const totalPerdidas = localStorage.getItem("barcazasPerdidasSimulacion") || "-";
  const totalCosto = (() => {
    if (!resultados.length) return "-";
    return resultados.reduce((acc, d) =>
      acc +
      (d.costoRetraso || 0) +
      (d.costoEstadia || 0) +
      (d.costoPerdida || 0),
      0
    ).toLocaleString("en-US");
  })();
  const kpis = [
    { label: "Promedio Retrasos", value: promedioRetrasos, icon: "fa-clock", color: "#ff6384" },
    { label: "Promedio Llegadas", value: promedioLlegadas, icon: "fa-ship", color: "#36a2eb" },
    { label: "Promedio Descargas", value: promedioDescargas, icon: "fa-arrow-down", color: "#4fd1c5" },
    { label: "Barcazas Perdidas", value: totalPerdidas, icon: "fa-exclamation-triangle", color: "#fbbf24" },
    { label: "Costo Total", value: totalCosto, icon: "fa-dollar-sign", color: "#4fd1c5" }
  ];
  const resumenDiv = document.getElementById("resumenEjecutivo");
  const resumen = resumenDiv ? resumenDiv.innerHTML : "";
  const decision = document.getElementById("mejorDecision");
  const sugerencias = document.getElementById("sugerenciasMejora");
  const riesgos = document.getElementById("riesgosDetectadosGrid");

  function getChartImg(id) {
    const canvas = document.getElementById(id);
    if (canvas && canvas.toDataURL) {
      return `<img src="${canvas.toDataURL('image/png')}" class="pdf-chart-img" alt="Gráfico">`;
    }
    return "";
  }
  function kpiCard(label, value, icon, color) {
    return `
      <div class="pdf-kpi-card" style="border-left:6px solid ${color};">
        <div class="pdf-kpi-icon" style="color:${color};"><i class="fas ${icon}"></i></div>
        <div class="pdf-kpi-label">${label}</div>
        <div class="pdf-kpi-value">${value}</div>
      </div>
    `;
  }
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
      const temp = document.createElement('div');
      temp.innerHTML = li.innerHTML;
      const icon = temp.querySelector('.riesgo-icon')?.textContent || "⚠️";
      const bold = temp.querySelector('.riesgo-titulo')?.textContent || "";
      const desc = temp.querySelector('.riesgo-desc')?.textContent || "";
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

  const win = window.open('', '', 'width=1000,height=800');
  win.document.write(`
    <html>
    <head>
      <title>Resumen Ejecutivo - Dashboard Barcazas</title>
      <link rel="stylesheet" href="/appweb/css/dashboard.css">
      <link rel="stylesheet" href="/appweb/css/PDF.css">
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
        <div class="pdf-chart-title">Descargas Diarias</div>
        ${getChartImg('descargasDiariasChart')}
        <div class="pdf-chart-title">Distribución de Costos</div>
        ${getChartImg('distribucionCostosChart')}
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
        <div class="pdf-resumen-ejecutivo">${resumen}</div>
      </div>
      <div class="pdf-section">
        <h2>Sugerencias de Mejora</h2>
        <ul class="pdf-sugerencias-list">
          ${sugerencias ? Array.from(sugerencias.children).map(li => `<li>${li.textContent}</li>`).join('') : ''}
        </ul>
      </div>
      <div class="pdf-footer">
        Generado por el sistema de simulación - ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
};