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

document.getElementById('time-range').addEventListener('change', function() {
    const customRangeFields = document.querySelectorAll('#custom-range-fields');
    const resolutionSelect = document.getElementById('resolution');
    const selectedValue = this.value;

    if (selectedValue === 'custom') {
        customRangeFields.forEach(field => field.style.display = 'block');
        updateResolutionOptions([1, 5, 10, 15, 30, 60, 360, 720, 1440]);
    } else {
        customRangeFields.forEach(field => field.style.display = 'none');
        switch (selectedValue) {
            case 'last30min':
                updateResolutionOptions([1, 5, 10, 15, 30]);
                break;
            case 'last1hour':
                updateResolutionOptions([1, 5, 10, 15, 30, 60]);
                break;
            case 'last6hours':
                updateResolutionOptions([1, 5, 10, 15, 30, 60, 360]);
                break;
            case 'last24hours':
                updateResolutionOptions([1, 5, 10, 15, 30, 60, 360, 720, 1440]);
                break;
        }
    }
});

function updateResolutionOptions(options) {
    const resolutionSelect = document.getElementById('resolution');
    resolutionSelect.innerHTML = '';
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option === 60 ? '1 hora' : option === 360 ? '6 horas' : option === 720 ? '12 horas' : option === 1440 ? '24 horas' : `${option} min`;
        resolutionSelect.appendChild(opt);
    });
}

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

    window.extensions = extensions;
    adjustPanelStyle(viewer.getExtension(SensorListExtensionID).panel, { left: '10px', top: '480px', width: '500px', height: '150px' });
    adjustPanelStyle(viewer.getExtension(SensorDetailExtensionID).panel, { right: '10px', top: '10px', width: '800px', height: '500px' });
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
        // console.log("Canal trocado no index.js", channelId);
        extensions.forEach(ext => ext.currentChannelID = channelId);
    }

    async function fetchSamples() {
        try {
            const resolution = parseInt(document.getElementById('resolution').value, 10);
            const timeRange = document.getElementById('time-range').value;
            let start, end;
    
            if (timeRange === 'custom') {
                start = document.getElementById('start-time').value;
                end = document.getElementById('end-time').value;
            } else {
                end = moment().tz('America/Sao_Paulo').format();
                switch (timeRange) {
                    case 'last30min':
                        start = moment(end).subtract(30, 'minutes').format();
                        break;
                    case 'last1hour':
                        start = moment(end).subtract(1, 'hour').format();
                        break;
                    case 'last6hours':
                        start = moment(end).subtract(6, 'hours').format();
                        break;
                    case 'last24hours':
                        start = moment(end).subtract(24, 'hours').format();
                        break;
                }
            }
    
            if (!start || !end || isNaN(resolution) || resolution <= 0) {
                alert('Preencha todos os campos corretamente: Start Time, End Time e Resolution.');
                return;
            }
    
            const timerange = {
                start: new Date(start),
                end: new Date(end),
            };
    
            if (timerange.start >= timerange.end) {
                alert('A data/hora inicial deve ser anterior à data/hora final.');
                return;
            }
    
            await dataView.refresh(timerange, resolution);
    
            extensions.forEach((ext) => {
                ext.dataView = dataView;
                if (ext.refresh) ext.refresh();
            });
        } catch (error) {
            console.error('Erro ao buscar amostras:', error);
        }
    }
    
    document.getElementById('fetch-samples').addEventListener('click', fetchSamples);
    
    // Chamar a função fetchSamples a cada 5 segundos
    setInterval(fetchSamples, 30000);


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
