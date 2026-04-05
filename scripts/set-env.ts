import { writeFileSync, mkdirSync, existsSync } from 'fs';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env file
dotenv.config();

const isDocker = process.env['DOCKER_BUILD'] === 'true';

const targetPath = join(process.cwd(), 'src/app/config.ts');

// If Docker, use placeholders that we will replace at runtime with sed
const config = {
  apiUrl: isDocker ? 'PLACEHOLDER_API_URL' : (process.env['API_URL'] || 'http://localhost:3000/api/jobs')
};

const envConfigFile = `export const CONFIG = ${JSON.stringify(config, null, 2)};`;

console.log(`Generating configuration (${isDocker ? 'Docker mode' : 'Local mode'})...`);

try {
  const dir = join(process.cwd(), 'src/app');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(targetPath, envConfigFile);
  console.log(`Config generated successfully at ${targetPath}`);
} catch (err) {
  console.error('Error while generating config:', err);
  process.exit(1);
}
