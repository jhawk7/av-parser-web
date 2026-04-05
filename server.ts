import express from 'express';
import { join } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import cors from 'cors';
import * as dotenv from 'dotenv';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

dotenv.config();

const app = express();
const port = process.env['PORT'] || 8080;
const distPath = join(process.cwd(), 'dist/av-parser-web/browser');

app.use(cors());
app.use(express.json());

// --- MQTT Connection Handling ---
let mqttClient: MqttClient | null = null;
let mqttStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
const mqttTopic = process.env['MQTT_TOPIC'] || 'yt-parser/jobs';

function connectMqtt() {
  const mqttUrl = process.env['MQTT_URL'] || 'ws://localhost:1833/mqtt';
  const options: IClientOptions = {
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
    mqttClient = mqtt.connect(mqttUrl, options);

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
  } catch (error) {
    console.error('Failed to initiate MQTT connection:', error);
    mqttStatus = 'disconnected';
  }
}

connectMqtt();

// --- Configuration injection logic ---
function injectConfig() {
  const envVars = {
    API_URL: process.env['API_URL'] || ''
  };

  console.log('Injecting configuration into JS files...');
  
  const findJsFiles = (dir: string): string[] => {
    let results: string[] = [];
    if (!statSync(dir).isDirectory()) return results;
    const list = readdirSync(dir);
    list.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findJsFiles(filePath));
      } else if (file.endsWith('.js')) {
        results.push(filePath);
      }
    });
    return results;
  };

  try {
    if (statSync(distPath).isDirectory()) {
      const files = findJsFiles(distPath);
      files.forEach(file => {
        let content = readFileSync(file, 'utf8');
        let changed = false;

        Object.entries(envVars).forEach(([key, value]) => {
          const placeholder = `PLACEHOLDER_${key}`;
          if (content.includes(placeholder)) {
            content = content.split(placeholder).join(value);
            changed = true;
          }
        });

        if (changed) {
          writeFileSync(file, content, 'utf8');
          console.log(`Injected config into ${file}`);
        }
      });
    }
  } catch (err) {
    console.error('Error during configuration injection:', err);
  }
}

// Inject config at startup
injectConfig();

// --- API Endpoints ---

// Get MQTT status
app.get('/api/mqtt/status', (req, res) => {
  res.json({ status: mqttStatus });
});

// Publish MQTT message (topic is handled on the server)
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
      res.json({ success: true });
    });
  } else {
    res.status(503).json({ error: 'MQTT client not connected' });
  }
});

// Serve static files
app.use(express.static(distPath));

// Handle SPA routing
app.get('/', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  try {
    if (statSync(indexPath).isFile()) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not Found');
    }
  } catch (e) {
    res.status(404).send('Not Found');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving files from ${distPath}`);
});
