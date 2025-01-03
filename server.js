const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Substituindo SQLite pelo MariaDB
const { getPublicToken } = require('./services/aps.js');
const { getSensors, getChannels, getSamples } = require('./public/iot.mocked.js');
const { PORT } = process.env;
const moment = require('moment-timezone');

let app = express();
app.use(express.static('public'));
app.use(bodyParser.json()); // Para parsear JSON nos requests

// Configuração do banco de dados
let db;
(async () => {
    try {
        db = await mysql.createPool({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'sensors',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log('Conectado ao banco de dados MariaDB.');
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    }
})();

// Criação da tabela no banco de dados
(async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS sensors (
                time DATETIME PRIMARY KEY,
                temp DOUBLE,
                umidade DOUBLE,
                co DOUBLE,
                ruido DOUBLE
            )
        `);
        console.log('Tabela sensors verificada/criada.');
    } catch (err) {
        console.error('Erro ao criar a tabela:', err.message);
    }
})();

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
    try {
        res.json(await getSamples({ start: new Date(req.query.start), end: new Date(req.query.end) }, req.query.resolution));
    } catch (err) {
        next(err);
    }
});

// Nova rota para salvar dados no banco via POST
app.post('/api/sensors', async (req, res) => {
    let { time, temp, umidade, co, ruido } = req.body;

    if (!time || temp === undefined || umidade === undefined || co === undefined || ruido === undefined) {
        return res.status(400).send('Campos "time", "temp", "umidade", "co" e "ruido" são obrigatórios.');
    }

    try {
        // Converter o timestamp para o formato DATETIME
        const date = new Date(parseInt(time) * 1000);
        date.setHours(date.getHours() - 3);
        time = date.toISOString().slice(0, 19).replace('T', ' ');

        await db.execute(
            `INSERT INTO sensors (time, temp, umidade, co, ruido) VALUES (?, ?, ?, ?, ?)`,
            [time, temp, umidade, co, ruido]
        );
        res.status(201).send('Dados salvos com sucesso.');
    } catch (err) {
        console.error('Erro ao inserir dados:', err.message);
        res.status(500).send('Erro ao salvar os dados.');
    }
});

// Nova rota para buscar o último valor do banco
app.get('/api/sensors/latest', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM sensors ORDER BY time DESC LIMIT 1`);
        res.status(200).json(rows[0] || {});
    } catch (err) {
        console.error('Erro ao buscar o último valor:', err.message);
        res.status(500).send('Erro ao buscar os dados.');
    }
});

// Rota para buscar dados agregados com base no intervalo de tempo e resolução
app.post('/api/sensors/aggregate', async (req, res) => {
    let { start, end, resolution } = req.body;

    if (!start || !end || !resolution) {
        return res.status(400).send('Parâmetros "start", "end" e "resolution" são obrigatórios.');
    }

    try {
        // Converte os horários recebidos para o fuso horário do Brasil
        const startBrazil = moment.tz(start, 'America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');
        const endBrazil = moment.tz(end, 'America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');

        const resolutionSeconds = resolution * 60;

        // Query compatível com MariaDB
        const query = `
            SELECT 
                MIN(time) AS time,
                AVG(temp) AS temp,
                AVG(umidade) AS umidade,
                AVG(co) AS co,
                AVG(ruido) AS ruido
            FROM sensors
            WHERE time >= ? AND time <= ?
            GROUP BY FLOOR(UNIX_TIMESTAMP(time) / ?)
            ORDER BY time ASC
        `;

        const [rows] = await db.query(query, [startBrazil, endBrazil, resolutionSeconds]);

        // Formatar os resultados para o cliente
        const timestamps = rows.map(row => row.time);
        const data = rows.reduce((acc, row) => {
            acc['sensor-1'] = acc['sensor-1'] || { temp: [], umidade: [], co: [], ruido: [] };
            acc['sensor-1'].temp.push(row.temp);
            acc['sensor-1'].umidade.push(row.umidade);
            acc['sensor-1'].co.push(row.co);
            acc['sensor-1'].ruido.push(row.ruido);
            return acc;
        }, {});

        res.json({ timestamps, data });
    } catch (err) {
        console.error('Erro ao consultar o banco:', err.message);
        res.status(500).send('Erro ao consultar o banco.');
    }
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
