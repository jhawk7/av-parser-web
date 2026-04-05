import express from 'express';
import { join } from 'path';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import cors from 'cors';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env['PORT'] || 8080;
const distPath = join(process.cwd(), 'dist/av-parser-web/browser');

app.use(cors());

// Configuration injection logic (similar to entrypoint.sh)
function injectConfig() {
  const envVars = {
    MQTT_URL: process.env['MQTT_URL'] || '',
    MQTT_CLIENT_ID: process.env['MQTT_CLIENT_ID'] || '',
    MQTT_USER: process.env['MQTT_USER'] || '',
    MQTT_PASSWORD: process.env['MQTT_PASSWORD'] || '',
    MQTT_TOPIC: process.env['MQTT_TOPIC'] || '',
    API_URL: process.env['API_URL'] || ''
  };

  console.log('Injecting configuration into JS files...');
  
  const findJsFiles = (dir: string): string[] => {
    let results: string[] = [];
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
  } catch (err) {
    console.error('Error during configuration injection:', err);
  }
}

// Inject config at startup
injectConfig();

// Serve static files
app.use(express.static(distPath));

// Handle SPA routing (redirect all non-file requests to index.html)
app.get('/', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Serving files from ${distPath}`);
});
