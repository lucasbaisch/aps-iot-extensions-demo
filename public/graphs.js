// Configuração dos gráficos
const chartConfig = {
    type: 'line',
    data: {
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    displayFormats: {
                        minute: 'HH:mm'
                    }
                },
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: '#666',
                    font: {
                        size: 12
                    }
                }
            },
            y: {
                beginAtZero: false,
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    color: '#666',
                    font: {
                        size: 12
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#333',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0,
                borderWidth: 2
            },
            point: {
                radius: 4,
                hoverRadius: 6,
                borderWidth: 2
            }
        }
    }
};

// Cores do Bootstrap para cada gráfico
const chartColors = {
    temp: '#dc3545', // Vermelho
    umidade: '#0d6efd', // Azul
    co: '#198754', // Verde
    ruido: '#6f42c1' // Roxo
};

// Função para criar configuração de dataset
function createDatasetConfig(metric, data) {
    return {
        label: metric,
        data: data,
        borderColor: chartColors[metric],
        backgroundColor: chartColors[metric] + '20',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: chartColors[metric],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: false,
        hidden: false,
        tension: 0
    };
}

// Inicialização dos gráficos
const charts = {
    temp: new Chart(document.getElementById('temp-chart'), {
        ...chartConfig,
        data: {
            datasets: [createDatasetConfig('temp', [])]
        },
        options: {
            ...chartConfig.options,
            scales: {
                ...chartConfig.options.scales,
                y: {
                    ...chartConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Temperatura (°C)'
                    }
                }
            }
        }
    }),
    umidade: new Chart(document.getElementById('umidade-chart'), {
        ...chartConfig,
        data: {
            datasets: [createDatasetConfig('umidade', [])]
        },
        options: {
            ...chartConfig.options,
            scales: {
                ...chartConfig.options.scales,
                y: {
                    ...chartConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Umidade (ppm)'
                    }
                }
            }
        }
    }),
    co: new Chart(document.getElementById('co-chart'), {
        ...chartConfig,
        data: {
            datasets: [createDatasetConfig('co', [])]
        },
        options: {
            ...chartConfig.options,
            scales: {
                ...chartConfig.options.scales,
                y: {
                    ...chartConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'CO (ppm)'
                    }
                }
            }
        }
    }),
    ruido: new Chart(document.getElementById('ruido-chart'), {
        ...chartConfig,
        data: {
            datasets: [createDatasetConfig('ruido', [])]
        },
        options: {
            ...chartConfig.options,
            scales: {
                ...chartConfig.options.scales,
                y: {
                    ...chartConfig.options.scales.y,
                    title: {
                        display: true,
                        text: 'Ruído (dB)'
                    }
                }
            }
        }
    })
};

// Gráfico combinado
const combinedChart = new Chart(document.getElementById('combined-chart'), {
    ...chartConfig,
    options: {
        ...chartConfig.options,
        scales: {
            ...chartConfig.options.scales,
            y: {
                ...chartConfig.options.scales.y,
                title: {
                    display: true,
                    text: 'Valores'
                }
            }
        }
    }
});

// Função para formatar a data para o formato esperado pela API
function formatDateForAPI(date) {
    return date.toISOString().slice(0, 16);
}

// Função para formatar a data para o formato desejado
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para alternar entre visualizações
function toggleView() {
    const combinedChartDiv = document.querySelector('.combined-chart');
    const individualChartsDiv = document.querySelector('.individual-charts');
    const toggleButton = document.getElementById('toggle-view');

    if (combinedChartDiv.style.display === 'none') {
        combinedChartDiv.style.display = 'block';
        individualChartsDiv.style.display = 'none';
        toggleButton.textContent = 'Ver Gráficos Separados';
    } else {
        combinedChartDiv.style.display = 'none';
        individualChartsDiv.style.display = 'block';
        toggleButton.textContent = 'Ver Gráfico Combinado';
    }
}

// Função para atualizar os gráficos
async function updateGraphs() {
    try {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const resolution = parseInt(document.getElementById('resolution').value);

        if (!startDate || !endDate || isNaN(resolution)) {
            throw new Error('Por favor, preencha todos os campos corretamente.');
        }

        const response = await fetch('/api/sensors/aggregate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                start: startDate,
                end: endDate,
                resolution: resolution
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar dados');
        }

        const data = await response.json();
        console.log('Dados recebidos:', data);

        if (!data.timestamps || data.timestamps.length === 0) {
            throw new Error('Nenhum dado encontrado para o período selecionado');
        }

        const timestamps = data.timestamps;
        const sensorData = data.data['sensor-1'];

        // Atualizar gráficos individuais
        Object.keys(charts).forEach(metric => {
            const chart = charts[metric];
            const metricData = sensorData[metric];

            if (!metricData || !Array.isArray(metricData)) {
                console.error(`Dados inválidos para a métrica ${metric}`);
                return;
            }

            const dataPoints = metricData.map((value, index) => ({
                x: timestamps[index],
                y: value
            }));

            // Limpa os dados antigos e adiciona os novos
            chart.data.datasets = [createDatasetConfig(metric, dataPoints)];
            chart.update();
        });

        // Atualizar gráfico combinado
        combinedChart.data.datasets = Object.keys(chartColors).map(metric => {
            const metricData = sensorData[metric];
            const dataPoints = metricData.map((value, index) => ({
                x: timestamps[index],
                y: value
            }));
            return createDatasetConfig(metric, dataPoints);
        });
        
        combinedChart.update();

    } catch (error) {
        console.error('Erro ao atualizar gráficos:', error);
        alert('Erro ao carregar dados: ' + error.message);
    }
}

// Variável para armazenar o intervalo de atualização
let autoUpdateInterval = null;
let countdownInterval = null;
let remainingSeconds = 0;

// Função para formatar o tempo restante
function formatTime(seconds) {
    if (seconds >= 86400) { // 24 horas
        const hours = Math.floor(seconds / 3600);
        return `${hours}h`;
    } else if (seconds >= 3600) { // 1 hora
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    } else if (seconds >= 60) { // 1 minuto
        const minutes = Math.floor(seconds / 60);
        const remainingSecs = seconds % 60;
        return `${minutes}m ${remainingSecs}s`;
    }
    return `${seconds}s`;
}

// Função para atualizar o badge de contagem regressiva
function updateCountdownBadge() {
    const dropdownButton = document.getElementById('autoUpdateDropdown');
    const badge = dropdownButton.querySelector('.auto-update-badge');
    if (badge) {
        badge.textContent = `Atualizando em ${formatTime(remainingSeconds)}`;
    }
}

// Função para iniciar/parar a atualização automática
function setAutoUpdate(intervalSeconds) {
    // Limpa os intervalos atuais se existirem
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    // Se o intervalo for maior que 0, inicia a atualização automática
    if (intervalSeconds > 0) {
        remainingSeconds = intervalSeconds;
        updateCountdownBadge();
        
        // Inicia a contagem regressiva
        countdownInterval = setInterval(() => {
            remainingSeconds--;
            updateCountdownBadge();
            
            if (remainingSeconds <= 0) {
                remainingSeconds = intervalSeconds;
                updateGraphs();
            }
        }, 1000);

        autoUpdateInterval = setInterval(updateGraphs, intervalSeconds * 1000);
    }
}

// Adiciona evento para o dropdown de atualização automática
document.addEventListener('DOMContentLoaded', function() {
    const dropdownItems = document.querySelectorAll('#autoUpdateDropdown + .dropdown-menu .dropdown-item');
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const interval = parseInt(this.getAttribute('data-interval'));
            setAutoUpdate(interval);
            
            // Atualiza o texto do botão para mostrar o intervalo atual
            const dropdownButton = document.getElementById('autoUpdateDropdown');
            const icon = dropdownButton.querySelector('i');
            dropdownButton.innerHTML = '';
            dropdownButton.appendChild(icon);
            
            if (interval > 0) {
                const badge = document.createElement('span');
                badge.className = 'auto-update-badge';
                badge.textContent = `Atualizando em ${formatTime(interval)}`;
                dropdownButton.appendChild(badge);
            }
        });
    });

    // Inicializar Flatpickr
    const startTimeInput = document.getElementById('start-date');
    const endTimeInput = document.getElementById('end-date');
    
    if (!startTimeInput || !endTimeInput) {
        console.error('Elementos de data não encontrados');
        return;
    }

    const flatpickrOptions = {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        locale: "pt-BR",
        defaultHour: 0,
        defaultMinute: 0
    };

    const startPicker = flatpickr(startTimeInput, flatpickrOptions);
    const endPicker = flatpickr(endTimeInput, flatpickrOptions);

    // Configurar datas padrão para 01/01/2024 até 31/01/2024
    const startDate = new Date(2024, 0, 1, 0, 0, 0); // 01/01/2024 00:00
    const endDate = new Date(2024, 0, 31, 23, 59, 59); // 31/01/2024 23:59

    startPicker.setDate(startDate);
    endPicker.setDate(endDate);
    
    // Adicionar event listener para o botão de alternar visualização
    document.getElementById('toggle-view').addEventListener('click', toggleView);
    
    // Adicionar event listener para o botão de atualização
    const updateButton = document.getElementById('fetch-samples');
    if (updateButton) {
        updateButton.addEventListener('click', updateGraphs);
    }

    // Atualizar os gráficos automaticamente ao carregar a página
    updateGraphs();
});