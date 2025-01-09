const SENSORS = {
    'sensor-1': {
        name: 'Sensor',
        description: 'Basic temperature sensor in the middle of the living room.',
        groupName: 'Level 1',
        location: {
            "x": 1.2737443865427096,
            "y": 6.16515857059915,
            "z": -5.1788058280944895
        },
        objectId: 4252
    },
};

const CHANNELS = {
    'temp': {
        name: 'Temperatura',
        description: 'Temperature em graus Celsius.',
        type: 'double',
        unit: '°C',
        min: 18.0,
        max: 28.0
    },
    'umidade': {
        name: 'Umidade',    
        description: 'Nível de umidade.',
        type: 'double',
        unit: 'ppm',
        min: 482.81,
        max: 640.00
    },
    'co': {
        name: 'Monóxido de carbono',
        description: 'Nível de oxigênio.',
        type: 'double',
        unit: 'ppm',
        min: 0,
        max: 1000
    },
    'ruido': {
        name: 'Ruído',
        description: 'Nível de ruido.',
        type: 'double',
        unit: 'dB',
        min: 0,
        max: 100
    }
};

// Função para retornar os sensores
async function getSensors() {
    return SENSORS;
}

// Função para retornar os canais
async function getChannels() {
    return CHANNELS;
}

// Função para retornar amostras simuladas
async function getSamples(timerange, resolution = 32) {
    return {
        count: resolution,
        timestamps: generateTimestamps(timerange.start, timerange.end, resolution),
        data: {
            'sensor-1': {
                'temp': generateRandomValues(18.0, 28.0, resolution, 1.0),
                'umidade': generateRandomValues(482.81, 640.0, resolution, 1.0),
                'co': generateRandomValues(0, 1000, resolution, 1.0),
                'ruido': generateRandomValues(0, 100, resolution, 1.0)
            }
        }
    };
}

// Função auxiliar para gerar timestamps
function generateTimestamps(start, end, count) {
    const delta = Math.floor((end.getTime() - start.getTime()) / (count - 1));
    const timestamps = [];
    for (let i = 0; i < count; i++) {
        timestamps.push(new Date(start.getTime() + i * delta));
    }
    return timestamps;
}

// Função auxiliar para gerar valores aleatórios
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

// Exportando as funções usando CommonJS
module.exports = {
    getSensors,
    getChannels,
    getSamples,
};
