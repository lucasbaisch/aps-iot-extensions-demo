/// import * as Autodesk from "@types/forge-viewer";

import { UIBaseExtension } from './BaseExtension.js';
import { SensorDetailPanel } from './SensorDetailPanel.js';

export const SensorDetailExtensionID = 'IoT.SensorDetail';

export class SensorDetailExtension extends UIBaseExtension {
    constructor(viewer, options) {
        super(viewer, options);
    }

    onDataViewChanged(oldDataView, newDataView) { this.updateCharts(); }

    onCurrentTimeChanged(oldTime, newTime) { this.updateCursor(); }

    onCurrentSensorChanged(oldSensorID, newSensorID) { this.updateCharts(); }

    onCurrentChannelChanged(oldChannelID, newChannelID) {  this.updateCharts(); }

    updateCharts(latestData = null) {
        if (this.dataView && this.currentSensorID && this.panel) {
            const sensor = this.dataView.getSensors().get(this.currentSensorID);
            if (sensor) {
                this.panel.setTitle(sensor ? `Sensor: ${sensor.name}` : 'Sensor Details', {});
                if (latestData) {
                    this.panel.updateChartsWithLatestData(this.currentSensorID, this.dataView, this.currentChannelID, latestData);
                } else {
                    this.panel.updateCharts(this.currentSensorID, this.dataView, this.currentChannelID);
                }
                this.updateCursor();
            }
        }
    }

    updateCursor() {
        if (this.dataView && this.panel && this.currentSensorID && this.currentTime) {
            const sensor = this.dataView.getSensors().get(this.currentSensorID);
            // console.log('updateCursor46546546546546465465', sensor);
            if (sensor) {
                this.panel.updateCursor(this.currentSensorID, this.dataView, this.currentTime);
            }
        }
    }

    async load() {
        await super.load();
        await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.5.1/chart.min.js', 'Chart');
        this.panel = new SensorDetailPanel(this.viewer, 'iot-sensor-detail', 'Sensor Details');
        console.log(`${SensorDetailExtensionID} extension loaded.`);
        return true;
    }

    unload() {
        super.unload();
        this.panel?.uninitialize();
        this.panel = undefined;
        console.log(`${SensorDetailExtensionID} extension unloaded.`);
        return true;
    }

    activate() {
        super.activate();
        this.panel?.setVisible(true);
        return true;
    }

    deactivate() {
        super.deactivate();
        this.panel?.setVisible(false);
        return true;
    }

    onToolbarCreated() {
        this.createToolbarButton('iot-sensor-detail-btn', 'IoT Sensor Detail', 'https://img.icons8.com/ios-filled/50/000000/show-property.png'); // <a href="https://icons8.com/icon/10255/show-property">Show Property icon by Icons8</a>
    }
}