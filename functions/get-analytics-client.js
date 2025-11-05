document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'https://aesthetic-hotteok-de9d99.netlify.app/.netlify/functions/get-analytics';

  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('errorMessage');
  const lastUpdateEl = document.getElementById('lastUpdate');

  // Elementos para las estadísticas
  const totalVisitsEl = document.getElementById('totalVisits');
  const monthlyVisitsEl = document.getElementById('monthlyVisits');
  const topPagesListEl = document.getElementById('topPagesList');
  const currentMonthEl = document.getElementById('currentMonth');
  const currentYearEl = document.getElementById('currentYear');

  // Contextos de los gráficos
  const visitsChartCtx = document.getElementById('visitsChart')?.getContext('2d');
  const devicesChartCtx = document.getElementById('devicesChart')?.getContext('2d');
  const browsersChartCtx = document.getElementById('browsersChart')?.getContext('2d');
  const monthlyTrendChartCtx = document.getElementById('monthlyTrendChart')?.getContext('2d');

  // Instancias de los gráficos (para poder destruirlas antes de redibujar)
  let charts = {};

  // Función para mostrar errores
  const showError = (message) => {
    if (loadingEl) loadingEl.classList.add('d-none');
    if (errorEl) {
      errorEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${message}`;
      errorEl.classList.remove('d-none');
    }
  };
  
  // Función para formatear números
  const formatNumber = (num) => num.toLocaleString('es-CO');

  // Función para renderizar la lista de páginas más visitadas
  const renderTopPages = (pages) => {
    if (!topPagesListEl || !pages || pages.length === 0) {
      if (topPagesListEl) {
        topPagesListEl.innerHTML = '<div class="alert alert-light text-center p-2">No hay datos de páginas más visitadas.</div>';
      }
      return;
    }

    const listHtml = pages.map(page => {
      const pageUrl = page.path.startsWith('/') ? page.path : `/${page.path}`;
      
      return `
      <a href="${pageUrl}" target="_blank" rel="noopener" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-2">
        <span class="text-truncate" title="${page.title}">
          ${page.title}
        </span>
        <span class="badge bg-info-subtle text-info-emphasis rounded-pill">${formatNumber(page.visits)}</span>
      </a>
    `;
    }).join('');

    topPagesListEl.innerHTML = `<div class="list-group list-group-flush">${listHtml}</div>`;
  };

  // Función para destruir un gráfico existente
  const destroyChart = (chartId) => {
    if (charts[chartId]) {
      charts[chartId].destroy();
    }
  };

  // Función para renderizar el gráfico de visitas diarias
  const renderVisitsChart = (dailyVisits) => {
    if (!visitsChartCtx) return;
    destroyChart('visitsChart');
    charts.visitsChart = new Chart(visitsChartCtx, {
      type: 'line',
      data: {
        labels: dailyVisits.map(item => new Date(item.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })),
        datasets: [{
          label: 'Visitas diarias',
          data: dailyVisits.map(item => item.visits),
          borderColor: '#069681',
          backgroundColor: 'rgba(6, 150, 129, 0.1)',
          fill: true,
          tension: 0.3,
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  // Función para renderizar el gráfico de dispositivos
  const renderDevicesChart = (devices) => {
    if (!devicesChartCtx) return;
    destroyChart('devicesChart');
    charts.devicesChart = new Chart(devicesChartCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(devices),
        datasets: [{
          data: Object.values(devices),
          backgroundColor: ['#069681', '#17a2b8', '#ffc107'],
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  // Función para renderizar el gráfico de navegadores
  const renderBrowsersChart = (browsers) => {
    if (!browsersChartCtx) return;
    destroyChart('browsersChart');
    charts.browsersChart = new Chart(browsersChartCtx, {
      type: 'pie',
      data: {
        labels: Object.keys(browsers),
        datasets: [{
          data: Object.values(browsers),
          backgroundColor: ['#069681', '#17a2b8', '#ffc107', '#dc3545', '#6c757d', '#f8f9fa'],
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  // Función para renderizar el gráfico de tendencia mensual
  const renderMonthlyTrendChart = (monthlyTrend) => {
    if (!monthlyTrendChartCtx) return;
    destroyChart('monthlyTrendChart');
    charts.monthlyTrendChart = new Chart(monthlyTrendChartCtx, {
      type: 'bar',
      data: {
        labels: monthlyTrend.map(item => new Date(item.date + '-02').toLocaleString('es-CO', { month: 'long', year: 'numeric' })),
        datasets: [{
          label: 'Visitas mensuales',
          data: monthlyTrend.map(item => item.visits),
          backgroundColor: 'rgba(6, 150, 129, 0.7)',
          borderColor: '#069681',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  };

  // Función principal para obtener y renderizar los datos
  const fetchAndRenderAnalytics = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `El servidor respondió con el estado ${response.status}`);
      }
      const data = await response.json();

      // Ocultar carga y mostrar fecha de actualización
      if (loadingEl) loadingEl.classList.add('d-none');
      if (lastUpdateEl) {
        lastUpdateEl.textContent = `Actualizado: ${new Date(data.lastUpdate).toLocaleString('es-CO')}`;
      }

      // Poblar las tarjetas de estadísticas
      if (totalVisitsEl) totalVisitsEl.textContent = formatNumber(data.totalVisits);
      if (monthlyVisitsEl) monthlyVisitsEl.textContent = formatNumber(data.monthlyVisits);
      
      const now = new Date();
      if (currentMonthEl) {
        const monthName = now.toLocaleString('es-CO', { month: 'long' });
        currentMonthEl.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      }
      if (currentYearEl) currentYearEl.textContent = now.getFullYear();

      // Renderizar las páginas más visitadas (AQUÍ ESTÁ LA CORRECCIÓN)
      renderTopPages(data.topPages);

      // Renderizar los gráficos
      renderVisitsChart(data.dailyVisits);
      renderDevicesChart(data.devices);
      renderBrowsersChart(data.browsers);
      renderMonthlyTrendChart(data.monthlyTrend);

    } catch (error) {
      console.error('Error al obtener datos de analíticas:', error);
      showError(error.message);
    }
  };

  // Iniciar la carga de datos
  fetchAndRenderAnalytics();
});