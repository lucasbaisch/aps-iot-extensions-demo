const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { getPublicToken } = require('./services/aps.js');
const { getSensors, getChannels, getSamples } = require('./public/iot.mocked.js');
const { PORT } = require('./config.js');

let app = express();
app.use(express.static('public'));
app.use(bodyParser.json()); // Para parsear JSON nos requests

// Configuração do banco de dados
const db = new sqlite3.Database('./sensor_data.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// Criação da tabela no banco de dados
db.run(
    `CREATE TABLE IF NOT EXISTS sensors (
        time TEXT PRIMARY KEY,
        temp REAL,
        umidade REAL,
        co REAL
    )`,
    (err) => {
        if (err) {
            console.error('Erro ao criar a tabela:', err.message);
        }
    }
);

// Rotas existentes
app.get('/auth/token', async function (req, res, next) {
    try {
        res.json(await getPublicToken());
    } catch (err) {
        next(err);
    }
});

app.get('/iot/sensors', async function (req, res, next) {
    try {
        res.json(await getSensors());
    } catch (err) {
        next(err);
    }
});

app.get('/iot/channels', async function (req, res, next) {
    try {
        res.json(await getChannels());
    } catch (err) {
        next(err);
    }
});

app.get('/iot/samples', async function (req, res, next) {
    console.log('888888888888888888888888888888888888req.query', req.query)
    try {
        res.json(await getSamples({ start: new Date(req.query.start), end: new Date(req.query.end) }, req.query.resolution));
    } catch (err) {
        next(err);
    }
});

// Nova rota para salvar dados no banco via POST
app.post('/api/sensors', (req, res) => {
    let { time, temp, umidade, co } = req.body;

    if (!time || temp === undefined || umidade === undefined || co === undefined) {
        return res.status(400).send('Campos "time", "temp", "umidade" e "co" são obrigatórios.');
    }

    // convert time epoch str to brazil timezone on format yyyy-MM-dd HH:mm:ss
    let date = new Date(parseInt(time) * 1000);
    date.setHours(date.getHours() - 3);
    time = date.toISOString();

    const query = `INSERT INTO sensors (time, temp, umidade, co) VALUES (?, ?, ?, ?)`;
    db.run(query, [time, temp, umidade, co], (err) => {
        if (err) {
            console.error('Erro ao inserir dados:', err.message);
            return res.status(500).send('Erro ao salvar os dados.');
        }
        res.status(201).send('Dados salvos com sucesso.');
    });
});

// Nova rota para buscar o último valor do banco
app.get('/api/sensors/latest', (req, res) => {
    const query = `SELECT * FROM sensors ORDER BY time DESC LIMIT 1`;
    db.get(query, [], (err, row) => {
        if (err) {
            console.error('Erro ao buscar o último valor:', err.message);
            return res.status(500).send('Erro ao buscar os dados.');
        }
        res.status(200).json(row || {});
    });
});

// Nova rota para buscar dados agregados com base no intervalo de tempo e resolução
app.post('/api/sensors/aggregate', (req, res) => {
    let { start, end, resolution } = req.body;

    if (!start || !end || !resolution) {
        return res.status(400).send('Parâmetros "start", "end" e "resolution" são obrigatórios.');
    }

    const resolutionMs = resolution * 60 * 1000;

    const query = `
        SELECT
            MIN(time) AS time,
            AVG(temp) AS temp,
            AVG(umidade) AS umidade,
            AVG(co) AS co
        FROM sensors
        WHERE datetime(time) >= datetime(?) AND datetime(time) <= datetime(?)
        GROUP BY CAST((strftime('%s', time) / ?) AS INTEGER)
        ORDER BY time ASC
    `;

    // convert start and end to america sao paulo timezone, substrac 3 hours
    start = new Date(start);
    start.setHours(start.getHours() - 3);
    start = start.toISOString();
    end = new Date(end);
    end.setHours(end.getHours() - 3);
    end = end.toISOString();

    db.all(query, [start, end, resolutionMs / 1000], (err, rows) => {
        if (err) {
            console.error('Erro ao consultar o banco:', err.message);
            return res.status(500).send('Erro ao consultar o banco.');
        }

        console.log('Resultados da query:', rows);

        const timestamps = rows.map(row => row.time);
        const data = rows.reduce((acc, row) => {
            acc['sensor-1'] = acc['sensor-1'] || { temp: [], umidade: [], co: [] };
            acc['sensor-1'].temp.push(row.temp);
            acc['sensor-1'].umidade.push(row.umidade);
            acc['sensor-1'].co.push(row.co);
            return acc;
        }, {});

        res.json({ timestamps, data });
    });
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send(err.message);
});

// Inicializa o servidor
app.listen(PORT, function () {
    console.log(`Servidor ouvindo na porta ${PORT}...`);
});
