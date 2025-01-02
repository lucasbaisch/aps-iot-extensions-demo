/// import * as Autodesk from "@types/forge-viewer";
/// import * as Chart from "@types/chart.js";

import { findNearestTimestampIndex } from './HistoricalDataView.js';

export class SensorDetailPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, id, title, options) {
        super(viewer.container, id, title, options);
        this.container.style.left = ((options === null || options === void 0 ? void 0 : options.x) || 0) + 'px';
        this.container.style.top = ((options === null || options === void 0 ? void 0 : options.y) || 0) + 'px';
        this.container.style.width = ((options === null || options === void 0 ? void 0 : options.width) || 500) + 'px';
        this.container.style.height = ((options === null || options === void 0 ? void 0 : options.height) || 400) + 'px';
        this.container.style.resize = 'none';
        this._charts = [];
        this._lastHighlightedPointIndex = -1;
    }

    initialize() {
        this.title = this.createTitleBar(this.titleLabel || this.container.id);
        this.initializeMoveHandlers(this.title);
        this.container.appendChild(this.title);
        this.container.style.height = '350px';
        this.content = document.createElement('div');
        this.content.style.height = '300px';
        this.content.style.backgroundColor = '#333';
        this.content.style.opacity = 0.9;
        this.container.appendChild(this.content);
    }

    updateCharts(sensorId, dataView, currentChannelID) {
        this.content.innerHTML = '';
        this._charts = [];
        const chartHeight = 200;
        let contentHeight = 0;
        let canvases = [];
        const channel = dataView.getChannels().get(currentChannelID);
        if (channel) {
            contentHeight += chartHeight;
            const top = 50;
            canvases.push(`<canvas id="sensor-detail-chart-${currentChannelID}" style="position: absolute; left: 0; top: ${top}px; width: 100%; height: ${chartHeight}px;"></canvas>`);
        }
        this.content.style.height = `${contentHeight}px`;
        this.container.style.height = `${contentHeight + 50}px`;
        this.content.innerHTML = canvases.join('\n');
        if (channel) {
            const canvas = document.getElementById(`sensor-detail-chart-${currentChannelID}`);
            const samples = dataView.getSamples(sensorId, currentChannelID);
            this._charts.push(this._createChart(canvas, (samples?.timestamps) || [], (samples?.values) || [], channel.min, channel.max, `${channel.name} (${channel.unit})`));
        }
    }

    updateChartsWithLatestData(sensorId, dataView, currentChannelID, latestData) {
        const channel = dataView.getChannels().get(currentChannelID);
        if (!channel) return;
    
        // Substituir todos os dados do gráfico com os novos dados
        const timestamps = latestData.timestamps;
        const values = latestData.values;
    
        this.content.innerHTML = '';
        this._charts = [];
        const chartHeight = 200;
        let contentHeight = chartHeight;
        const canvasId = `sensor-detail-chart-${currentChannelID}`;
        const canvas = `<canvas id="${canvasId}" style="position: absolute; left: 0; top: 50px; width: 100%; height: ${chartHeight}px;"></canvas>`;
        this.content.style.height = `${contentHeight}px`;
        this.container.style.height = `${contentHeight + 50}px`;
        this.content.innerHTML = canvas;
    
        const canvasElement = document.getElementById(canvasId);
        this._charts.push(this._createChart(
            canvasElement,
            timestamps,
            values,
            channel.min,
            channel.max,
            `${channel.name} (${channel.unit})`
        ));
    }

    _createChart(canvas, timestamps, values, min, max, title) {
        // Garantir que timestamps e values são válidos
        if (!timestamps || !Array.isArray(timestamps) || timestamps.length === 0) {
            console.error('Timestamps inválidos:', timestamps);
            timestamps = [];
        }
        if (!values || !Array.isArray(values) || values.length === 0) {
            console.error('Values inválidos:', values);
            values = [];
        }
    
        // Certificar-se de que timestamps e values têm o mesmo comprimento
        if (timestamps.length !== values.length) {
            console.error('Timestamps e values têm comprimentos diferentes:', timestamps, values);
            values = [];
            timestamps = [];
        }
    
        // Criar o gráfico
        return new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: timestamps, // Usar os timestamps diretamente como strings
                datasets: [{
                    label: title,
                    data: values,
                    radius: values.map(_ => 3),
                    fill: false,
                    borderColor: '#eee',
                    tension: 0.1
                }],
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time', // Escala de tempo
                        time: {
                            // tooltipFormat tem que ser dia/mês/ano hora:minuto
                            tooltipFormat: 'DD/MM/YYYY HH:mm',
                            displayFormats: {
                                hour: 'HH:mm', // Exibe apenas horas e minutos
                                day: 'MMM D'   // Exibe o dia completo para ticks principais
                            }
                        },
                        title: {
                            display: true,
                            text: 'DateTime'
                        }
                    },
                    y: {
                        suggestedMin: min,
                        suggestedMax: max,
                        title: {
                            display: true,
                            text: 'Sensor Value'
                        }
                    }
                }
            }
        });
    }
    

    updateCursor(sensorId, dataView, currentTime) {
        const defaultChannelID = dataView.getChannels().keys().next().value;
        if (!defaultChannelID) {
            return;
        }
        const samples = dataView.getSamples(sensorId, defaultChannelID);
        if (!samples) {
            return;
        }
        const sampleIndex = findNearestTimestampIndex(samples.timestamps, currentTime);
        if (sampleIndex !== this._lastHighlightedPointIndex) {
            for (const chart of this._charts) {
                // @ts-ignore
                const radii = chart.data.datasets[0].radius;
                for (let i = 0; i < radii.length; i++) {
                    radii[i] = (i === sampleIndex) ? 9 : 3;
                }
                chart.update();
            }
            this._lastHighlightedPointIndex = sampleIndex;
        }
    }
}