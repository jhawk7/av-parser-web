import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const targetPath = join(process.cwd(), 'src/app/config.ts');

// The frontend no longer needs environment-specific configuration
// as all requests are proxied through the same origin Node server.
const config = {};

const envConfigFile = `export const CONFIG = ${JSON.stringify(config, null, 2)};`;

console.log('Generating empty configuration for frontend...');

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
