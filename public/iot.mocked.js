const SENSORS = {
    'sensor-1': {
        name: 'Living Room',
        description: 'Basic sensor in the middle of the living room.',
        groupName: 'Level 1',
        location: {
            "x": 1.2737443865427096,
            "y": 6.16515857059915,
            "z": -5.1788058280944895
        },
        objectId: 4252
    }
    // Adicione outros sensores aqui...
};

const CHANNELS = {
    'temp': {
        name: 'Temperature',
        description: 'External temperature in degrees Celsius.',
        type: 'double',
        unit: '°C',
        min: 18.0,
        max: 28.0
    },
    'co2': {
        name: 'CO₂',
        description: 'Level of carbon dioxide.',
        type: 'double',
        unit: 'ppm',
        min: 482.81,
        max: 640.00
    }
};

export async function getSensors() {
    return SENSORS;
}

export async function getChannels() {
    return CHANNELS;
}

export async function getSamples(timerange, resolution = 32) {
    return {
        count: resolution,
        timestamps: generateTimestamps(timerange.start, timerange.end, resolution),
        data: {
            'sensor-1': {
                'temp': generateRandomValues(18.0, 28.0, resolution, 1.0),
                'co2': generateRandomValues(540.0, 600.0, resolution, 5.0)
            }
        }
    };
}

function generateTimestamps(start, end, count) {
    const delta = Math.floor((end.getTime() - start.getTime()) / (count - 1));
    const timestamps = [];
    for (let i = 0; i < count; i++) {
        timestamps.push(new Date(start.getTime() + i * delta));
    }
    return timestamps;
}

function generateRandomValues(min, max, count, maxDelta) {
    const values = [];
    let lastValue = min + Math.random() * (max - min);
    for (let i = 0; i < count; i++) {
        values.push(lastValue);
        lastValue += (Math.random() - 0.5) * 2.0 * maxDelta;
        if (lastValue > max) {
            lastValue = max;
        }
        if (lastValue < min) {
            lastValue = min;
        }
    }
    return values;
}
