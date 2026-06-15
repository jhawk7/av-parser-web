"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const path_1 = require("path");
const fs_1 = require("fs");
const cors_1 = tslib_1.__importDefault(require("cors"));
const dotenv = tslib_1.__importStar(require("dotenv"));
const mqtt_1 = tslib_1.__importDefault(require("mqtt"));
dotenv.config();
const app = (0, express_1.default)();
const port = process.env['PORT'] || 8080;
const distPath = (0, path_1.join)(process.cwd(), 'dist/av-parser-web/browser');
const apiUrl = process.env['API_URL'] || 'http://localhost:3000/api/jobs';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- MQTT Connection Handling ---
let mqttClient = null;
let mqttStatus = 'disconnected';
const mqttTopic = process.env['MQTT_TOPIC'] || 'yt-parser/jobs';
function connectMqtt() {
    const mqttUrl = process.env['MQTT_URL'] || 'ws://localhost:1833/mqtt';
    const options = {
        clientId: process.env['MQTT_CLIENT_ID'] || `node-server-${Math.random().toString(16).substring(2, 10)}`,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        username: process.env['MQTT_USER'] || undefined,
        password: process.env['MQTT_PASSWORD'] || undefined,
    };
    mqttStatus = 'connecting';
    console.log(`Connecting to MQTT broker at ${mqttUrl}...`);
    try {
        mqttClient = mqtt_1.default.connect(mqttUrl, options);
        mqttClient.on('connect', () => {
            console.log('Successfully connected to MQTT broker');
            mqttStatus = 'connected';
        });
        mqttClient.on('reconnect', () => {
            console.log('Attempting to reconnect to MQTT broker...');
            mqttStatus = 'connecting';
        });
        mqttClient.on('offline', () => {
            console.log('MQTT broker is offline');
            mqttStatus = 'disconnected';
        });
        mqttClient.on('error', (err) => {
            console.error('MQTT connection error:', err);
            mqttStatus = 'disconnected';
        });
        mqttClient.on('close', () => {
            console.log('MQTT connection closed');
            mqttStatus = 'disconnected';
        });
    }
    catch (error) {
        console.error('Failed to initiate MQTT connection:', error);
        mqttStatus = 'disconnected';
    }
}
connectMqtt();
// --- Configuration injection logic ---
// Currently no env vars needed by the frontend as everything is proxied
function injectConfig() {
    console.log('Checking for JS files for configuration injection...');
    const findJsFiles = (dir) => {
        let results = [];
        try {
            if (!(0, fs_1.statSync)(dir).isDirectory())
                return results;
            const list = (0, fs_1.readdirSync)(dir);
            list.forEach(file => {
                const filePath = (0, path_1.join)(dir, file);
                const stat = (0, fs_1.statSync)(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(findJsFiles(filePath));
                }
                else if (file.endsWith('.js')) {
                    results.push(filePath);
                }
            });
        }
        catch (e) {
            // Directory might not exist yet
        }
        return results;
    };
    // No placeholders to replace currently, but keeping the structure for future needs
}
// Inject config at startup
injectConfig();
// --- API Endpoints ---
// Get MQTT status
app.get('/api/mqtt/status', (req, res) => {
    res.json({ status: mqttStatus });
});
// Publish MQTT message
app.post('/api/mqtt/publish', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    if (mqttClient && mqttStatus === 'connected') {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        mqttClient.publish(mqttTopic, payload, { qos: 2 }, (error) => {
            if (error) {
                console.error('Failed to publish message:', error);
                return res.status(500).json({ error: 'Failed to publish message' });
            }
            console.log(`Published message to topic: ${mqttTopic}`);
            return res.json({ success: true });
        });
    }
    else {
        return res.status(503).json({ error: 'MQTT client not connected' });
    }
});
// Proxy Jobs API
app.get('/api/jobs', async (req, res) => {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`External API responded with status: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error('Error fetching jobs from external API:', error);
        res.status(502).json({ error: 'Failed to fetch jobs from backend API' });
    }
});
// Serve static files
app.use(express_1.default.static(distPath));
// Handle SPA routing
app.get('/', (req, res) => {
    const indexPath = (0, path_1.join)(distPath, 'index.html');
    try {
        if ((0, fs_1.statSync)(indexPath).isFile()) {
            res.sendFile(indexPath);
        }
        else {
            res.status(404).send('Not Found');
        }
    }
    catch (e) {
        res.status(404).send('Not Found');
    }
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Serving files from ${distPath}`);
});
