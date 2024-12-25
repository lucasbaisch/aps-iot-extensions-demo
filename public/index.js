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
import { getSamples } from './iot.mocked.js';

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
    adjustPanelStyle(viewer.getExtension(SensorListExtensionID).panel, { right: '10px', top: '10px', width: '500px', height: '300px' });
    adjustPanelStyle(viewer.getExtension(SensorDetailExtensionID).panel, { right: '10px', top: '320px', width: '500px', height: '300px' });
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
        extensions.forEach(ext => ext.currentChannelID = channelId);
    }

    // Função para buscar o último valor do servidor
    async function fetchLatestSensorData() {
        try {
            const response = await fetch('/api/sensors/latest');
            if (!response.ok) throw new Error('Erro ao buscar os dados do servidor.');
            let latestData = await response.json();
            console.log('Último valor dos sensores:', latestData);

            // Mapeia os valores para os campos esperados
            const maxTemperature = 28.0;
            const minTemperature = 18.0;
            const maxCO2 = 640.0;
            const minCO2 = 482.81;
            latestData.temperature = (latestData.temperature - minTemperature) / (maxTemperature - minTemperature);
            latestData.co2 = (latestData.co2 - minCO2) / (maxCO2 - minCO2);


            return latestData;
        } catch (err) {
            console.error('Erro ao buscar o valor mais recente:', err);
            return null;
        }
    }

    // Função para atualizar o heatmap com o último valor do servidor
    function updateHeatmapWithLatestData() {
        fetchLatestSensorData().then((data) => {
            if (data) {
                const { temperature, co2 } = data; // Ajuste conforme necessário
                let customSensorValue = () => temperature; // Usar temperatura como exemplo
                console.log(`Último valor dos sensores salvos: temperatura: ${temperature}, co2: ${co2}`);


                if (window.sensorHeatmapsExt) {
                    window.sensorHeatmapsExt.updateHeatmaps(customSensorValue);
                    // console.log(`Heatmap updated with temperature: ${temperature}, co2: ${co2}`);
                } else {
                    console.error('Heatmap extension not loaded.');
                }
            }
        });
    }

    // Configura para buscar o último valor a cada 5 segundos (5000 ms)
    setInterval(updateHeatmapWithLatestData, 5000);
});

document.getElementById('fetch-samples').addEventListener('click', async () => {
    try {
        const start = document.getElementById('start-time').value;
        const end = document.getElementById('end-time').value;
        const resolution = parseInt(document.getElementById('resolution').value, 10);

        if (!start || !end || !resolution) {
            alert('Preencha todos os campos: Start Time, End Time e Resolution.');
            return;
        }

        // Formatar o timerange
        const timerange = {
            start: new Date(start),
            end: new Date(end)
        };

        // Atualizar o dataView com os novos samples
        await dataView.refresh(timerange, resolution);

        // Atualizar extensões conectadas ao viewer
        const extensions = [
            viewer.getExtension(SensorListExtensionID),
            viewer.getExtension(SensorSpritesExtensionID),
            viewer.getExtension(SensorDetailExtensionID),
            viewer.getExtension(SensorHeatmapsExtensionID)
        ];
        extensions.forEach(ext => {
            ext.dataView = dataView; // Vincular o dataView atualizado às extensões
            if (ext.refresh) ext.refresh(); // Certifique-se de que a extensão possui o método refresh
        });

        // console.log('DataView atualizado com os novos samples:', dataView.getSamples());
        // alert('Data atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao buscar e atualizar os dados:', error);
        alert('Erro ao buscar e atualizar os dados.');
    }
});



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
