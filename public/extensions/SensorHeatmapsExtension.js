/// import * as Autodesk from "@types/forge-viewer";

import { UIBaseExtension } from './BaseExtension.js';
import { SensorHeatmapsPanel } from './SensorHeatmapsPanel.js';

export const SensorHeatmapsExtensionID = 'IoT.SensorHeatmaps';

export class SensorHeatmapsExtension extends UIBaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
        this.panel = undefined;
        this._surfaceShadingData = undefined;
        this.onChannelChanged = undefined;
        this.heatmapConfig = {
            confidence: 50.0,
            powerParameter: 2.0,
            alpha: 1.0
        };
    }

    onDataViewChanged(oldDataView, newDataView) {
        this.updateChannels();
        this.createHeatmaps();
    }

    onCurrentTimeChanged(oldTime, newTime) { this.refresh(); }

    onCurrentChannelChanged(oldChannelID, newChannelID) { this.refresh(); }

    async createHeatmaps() {
        if (this.isActive()) {
            const channelID = this.currentChannelID;
            await this._setupSurfaceShading(this.viewer.model);
            this._dataVizExt.renderSurfaceShading('iot-heatmap', channelID, () => this.getLastSensorData(), { heatmapConfig: this.heatmapConfig });
        }
    }

    async updateHeatmaps(value) {
        if (this.isActive()) {
            // console.log("updateHeatmaps acionado", Date.now(), value, "canal atual: ", this.currentChannelID);
            const channelID = this.currentChannelID;
            if (!this._surfaceShadingData) {
                await this._setupSurfaceShading(this.viewer.model);
                this._dataVizExt.renderSurfaceShading('iot-heatmap', channelID, value, { heatmapConfig: this.heatmapConfig });
            } else {
                // printar o valor padrão
                this._dataVizExt.updateSurfaceShading(value);
            }
        } else {
            // console.log("Heatmaps extension is not active.");
        }
    }

    // Função para buscar o último valor do servidor
    getLastSensorData() {
        try {
            // console.log('Último valor dos sensores 1234657984654798798798798798987')
            
            if (!this.dataView || !this.currentTime || !this.currentChannelID) {
                return Number.NaN;
            }

            let data = this.dataView._data;
            // console.log('Último valor dos sensores 4566666666666666666:', data);

            const channel = this.dataView.getChannels().get(this.currentChannelID);
            if (!channel) {
                throw new Error('Canal não encontrado.');
            }

            let last_value = data['sensor-1'][this.currentChannelID][data['sensor-1'][this.currentChannelID].length - 1];


            last_value = (last_value - channel.min) / (channel.max - channel.min);

            const customSensorValue = () => last_value;
            // console.log("Valor do sensor: ", customSensorValue);

            this.updateHeatmaps(customSensorValue);
            

            return last_value;
        } catch (err) {
            console.error('Erro ao buscar o valor mais recente:', err);
            return null;
        }
    }

    // updateHeatmapWithLatestData() {
        // get lest data of this.dataView
        // let latestData = this.getLastSensorData();
        // this.getLastSensorData().then((data) => {
        //     if (data) {
        //         console.log("Dados do sensor: ", data, "Canal atual: ", this.currentChannelID);
        //         const customSensorValue = () => data[this.currentChannelID];
        //         console.log("Valor do sensor: ", customSensorValue);

        //         this.updateHeatmaps(customSensorValue);
        //     }
        // });
    // }

    updateChannels() {
        if (this.dataView && this.panel) {
            this.panel.updateChannels(this.dataView);
        }
    }

    refresh() {
        // console.log("Refresh acionado", Date.now());
        this.updateHeatmaps(() => this.getLastSensorData());
    }

    async load() {
        await super.load();
        this.panel = new SensorHeatmapsPanel(this.viewer, 'heatmaps', 'Heatmaps', {});
        this.panel.onChannelChanged = (channelId) => {
            if (this.onChannelChanged) {
                this.onChannelChanged(channelId);
            }
        };
        console.log(`${SensorHeatmapsExtensionID} extension loaded.`);
        return true;
    }

    unload() {
        super.unload();
        this.panel?.uninitialize();
        this.panel = undefined;
        console.log(`${SensorHeatmapsExtensionID} extension unloaded.`);
        return true;
    }

    activate() {
        super.activate();
        this.panel?.setVisible(true);
        this.onDataViewChanged(undefined, undefined);
        return true;
    }

    deactivate() {
        super.deactivate();
        this.panel?.setVisible(false);
        this._dataVizExt.removeSurfaceShading();
        return true;
    }

    onToolbarCreated() {
        this.createToolbarButton('iot-heatmaps-btn', 'IoT Heatmaps', 'https://img.icons8.com/ios-filled/50/000000/heat-map.png'); // <a href="https://icons8.com/icon/8315/heat-map">Heat Map icon by Icons8</a>
    }

    async _setupSurfaceShading(model) {
        if (!this.dataView) {
            return;
        }
        const shadingGroup = new Autodesk.DataVisualization.Core.SurfaceShadingGroup('iot-heatmap');
        const rooms = new Map();
        for (const [sensorId, sensor] of this.dataView.getSensors().entries()) {
            if (!sensor.objectId) {
                continue;
            }
            if (!rooms.has(sensor.objectId)) {
                const room = new Autodesk.DataVisualization.Core.SurfaceShadingNode(sensorId, sensor.objectId);
                shadingGroup.addChild(room);
                rooms.set(sensor.objectId, room);
            }
            const room = rooms.get(sensor.objectId);
            const types = Array.from(this.dataView.getChannels().keys());
            room.addPoint(new Autodesk.DataVisualization.Core.SurfaceShadingPoint(sensorId, sensor.location, types));
        }
        this._surfaceShadingData = new Autodesk.DataVisualization.Core.SurfaceShadingData();
        this._surfaceShadingData.addChild(shadingGroup);
        this._surfaceShadingData.initialize(model);
        await this._dataVizExt.setupSurfaceShading(model, this._surfaceShadingData);
    }
}