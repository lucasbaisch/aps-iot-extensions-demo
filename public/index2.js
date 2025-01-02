import { initViewer, loadModel, adjustPanelStyle } from './viewer.js';
import {
    SensorListExtensionID,
    SensorSpritesExtensionID,
    SensorDetailExtensionID,
    SensorHeatmapsExtensionID
} from './viewer.js';
import { initTimeline } from './timeline.js';
import { MyDataView } from './dataview.js';
import {
    APS_MODEL_URN,
    APS_MODEL_VIEW,
    APS_MODEL_DEFAULT_FLOOR_INDEX,
    DEFAULT_TIMERANGE_START,
    DEFAULT_TIMERANGE_END
} from './config.js';
// const moment = require('moment-timezone');

let currentChannelID = '';
moment.tz.setDefault('America/Sao_Paulo');

// Inicialize o Flatpickr no campo com ID "datetime-range"
const startPicker = flatpickr("#start-time", {
    enableTime: true,
    defaultDate: DEFAULT_TIMERANGE_START,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    onChange: function(selectedDates, dateStr, instance) {
        endPicker.set("minDate", selectedDates[0]); // Define a data mínima para o campo final
    },
});

const endPicker = flatpickr("#end-time", {
    enableTime: true,
    defaultDate: DEFAULT_TIMERANGE_END,
    dateFormat: "Y-m-d H:i",
    time_24hr: true,
    onChange: function(selectedDates, dateStr, instance) {
        startPicker.set("maxDate", selectedDates[0]); // Define a data máxima para o campo inicial
    }
});

const EXTENSIONS = [
    SensorListExtensionID,
    SensorSpritesExtensionID,
    SensorDetailExtensionID,
    SensorHeatmapsExtensionID,
    'Autodesk.AEC.LevelsExtension'
];

let dataView; // Declare o dataView no escopo global
const viewer = await initViewer(document.getElementById('preview'), EXTENSIONS);
loadModel(viewer, APS_MODEL_URN, APS_MODEL_VIEW);

viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, async () => {
    // Initialize the timeline
    initTimeline(document.getElementById('timeline'), onTimeRangeChanged, onTimeMarkerChanged);

    const sensorHeatmapsExt = viewer.getExtension(SensorHeatmapsExtensionID);
    window.sensorHeatmapsExt = sensorHeatmapsExt;

    // Initialize our data view
    dataView = new MyDataView();
    await dataView.init({ start: DEFAULT_TIMERANGE_START, end: DEFAULT_TIMERANGE_END });

    // Configure and activate our custom IoT extensions
    const extensions = [SensorListExtensionID, SensorSpritesExtensionID, SensorDetailExtensionID, SensorHeatmapsExtensionID].map(id => viewer.getExtension(id));
    for (const ext of extensions) {
        ext.dataView = dataView;
        ext.activate();
    }
    adjustPanelStyle(viewer.getExtension(SensorListExtensionID).panel, { left: '10px', top: '480px', width: '500px', height: '150px' });
    adjustPanelStyle(viewer.getExtension(SensorDetailExtensionID).panel, { right: '10px', top: '10px', width: '500px', height: '300px' });
    adjustPanelStyle(viewer.getExtension(SensorHeatmapsExtensionID).panel, { left: '10px', top: '320px', width: '300px', height: '150px' });

    // Configure and activate the levels extension
    const levelsExt = viewer.getExtension('Autodesk.AEC.LevelsExtension');
    levelsExt.levelsPanel.setVisible(true);
    levelsExt.floorSelector.addEventListener(Autodesk.AEC.FloorSelector.SELECTED_FLOOR_CHANGED, onLevelChanged);
    levelsExt.floorSelector.selectFloor(APS_MODEL_DEFAULT_FLOOR_INDEX, true);
    adjustPanelStyle(levelsExt.levelsPanel, { left: '10px', top: '10px', width: '300px', height: '300px' });

    viewer.getExtension(SensorListExtensionID).onSensorClicked = (sensorId) => onCurrentSensorChanged(sensorId);
    viewer.getExtension(SensorSpritesExtensionID).onSensorClicked = (sensorId) => onCurrentSensorChanged(sensorId);
    viewer.getExtension(SensorHeatmapsExtensionID).onChannelChanged = (channelId) => onCurrentChannelChanged(channelId);
    onTimeRangeChanged(DEFAULT_TIMERANGE_START, DEFAULT_TIMERANGE_END);

    async function onTimeRangeChanged(start, end) {
        await dataView.refresh({ start, end });
        extensions.forEach(ext => ext.dataView = dataView);
    }

    function onLevelChanged({ target, levelIndex }) {
        dataView.floor = levelIndex !== undefined ? target.floorData[levelIndex] : null;
        extensions.forEach(ext => ext.dataView = dataView);
    }

    function onTimeMarkerChanged(time) {
        extensions.forEach(ext => ext.currentTime = time);
    }

    function onCurrentSensorChanged(sensorId) {
        const sensor = dataView.getSensors().get(sensorId);
        if (sensor && sensor.objectId) {
            viewer.fitToView([sensor.objectId]);
        }
        extensions.forEach(ext => ext.currentSensorID = sensorId);
    }

    function onCurrentChannelChanged(channelId) {
        // Atualize o currentChannelID diretamente nas extensões
        console.log("TROCADO O CANAL", channelId)
        extensions.forEach(ext => ext.currentChannelID = channelId);
    }

    // // Função para buscar o último valor do servidor
    // async function fetchLatestSensorData(channelId) {
    //     try {
    //         const response = await fetch('/api/sensors/latest');
    //         if (!response.ok) throw new Error('Erro ao buscar os dados do servidor.');
    //         let latestData = await response.json();
    //         console.log('Último valor dos sensores:', latestData);

    //         const channel = dataView.getChannels().get(channelId);
    //         if (!channel) {
    //             throw new Error('Canal não encontrado.');
    //         }

    //         const min = channel.min;
    //         const max = channel.max;
    //         latestData[channelId] = (latestData[channelId] - min) / (max - min);

    //         return latestData;
    //     } catch (err) {
    //         console.error('Erro ao buscar o valor mais recente:', err);
    //         return null;
    //     }
    // }

    function fetchAndUpdateSamples() {
        console.log('Buscando e atualizando os samples...');
        try {
            // Obter os valores dos campos Flatpickr
            let start = document.getElementById('start-time').value;
            start = moment.tz(start, 'America/Sao_Paulo').format();

            let end = document.getElementById('end-time').value;
            end = moment.tz(end, 'America/Sao_Paulo').format();
            const resolution = parseInt(document.getElementById('resolution').value, 10);
            console.log('Fetching samples:', { start, end, resolution });
            // Validar os campos
            if (!start || !end || isNaN(resolution) || resolution <= 0) {
                alert('Preencha todos os campos corretamente: Start Time, End Time e Resolution.');
                return;
            }

            // Converter os valores para objetos de data
            const timerange = {
                start: new Date(start),
                end: new Date(end),
            };

            // Validar se a data inicial é menor que a final
            if (timerange.start >= timerange.end) {
                alert('A data/hora inicial deve ser anterior à data/hora final.');
                return;
            }

            // Atualizar o dataView com os novos samples
            dataView.refresh(timerange, resolution);

            // Atualizar extensões conectadas ao viewer
            extensions.forEach(ext => {
                ext.dataView = dataView;
                if (ext.refresh) ext.refresh();
            });

            console.log('DataView atualizado com os novos samples:', dataView.getSamples());
        } catch (error) {
            console.error('Erro ao buscar e atualizar os dados:', error);
        }
    }

    // Configura para buscar o último valor a cada 5 segundos (5000 ms)
    // setInterval(() => {
    //     fetchAndUpdateSamples();
    // }, 10000);
});

document.getElementById('fetch-samples').addEventListener('click', fetchAndUpdateSamples());

window.getBoundingBox = function (model, dbid) {
    const tree = model.getInstanceTree();
    const frags = model.getFragmentList();
    const bounds = new THREE.Box3();
    const result = new THREE.Box3();
    tree.enumNodeFragments(dbid, function (fragid) {
        frags.getWorldBounds(fragid, bounds);
        result.union(bounds);
    }, true);
    return result;
};
