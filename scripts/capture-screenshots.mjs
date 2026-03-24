import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, '..');
const resultsDir = path.join(projectDir, 'test-results');

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

async function main() {
  console.log('Launching Electron app...');
  console.log('Main file:', path.join(projectDir, 'out', 'main', 'index.js'));

  const electronPath = path.join(projectDir, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
  const app = await electron.launch({
    executablePath: electronPath,
    args: [path.join(projectDir, 'out', 'main', 'index.js')],
    cwd: projectDir
  });

  const window = await app.firstWindow();
  console.log('Window opened, waiting for app to load...');
  await window.waitForTimeout(3000);

  await window.screenshot({ path: path.join(resultsDir, 'screenshot-uniform.png') });
  console.log('1. Uniform mode captured');

  try {
    await window.click('button:has-text("Uniform")');
    await window.waitForTimeout(1000);
  } catch(e) {
    const buttons = await window.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && (text.includes('Uniform') || text.includes('Real'))) {
        await btn.click();
        break;
      }
    }
    await window.waitForTimeout(1000);
  }
  await window.screenshot({ path: path.join(resultsDir, 'screenshot-real.png') });
  console.log('2. Real thickness mode captured');

  try {
    await window.click('button:has-text("RGB")');
    await window.waitForTimeout(1000);
  } catch(e) {}
  await window.screenshot({ path: path.join(resultsDir, 'screenshot-rgb-real.png') });
  console.log('3. RGB + Real mode captured');

  try {
    await window.click('button:has-text("Real")');
    await window.waitForTimeout(1000);
  } catch(e) {}
  await window.screenshot({ path: path.join(resultsDir, 'screenshot-rgb-uniform.png') });
  console.log('4. RGB + Uniform mode captured');

  try {
    await window.click('button:has-text("Pastel")');
    await window.waitForTimeout(500);
  } catch(e) {}
  await window.screenshot({ path: path.join(resultsDir, 'screenshot-pastel.png') });
  console.log('5. Pastel palette captured');

  try {
    await window.click('button:has-text("Vivid")');
    await window.waitForTimeout(500);
  } catch(e) {}
  await window.screenshot({ path: path.join(resultsDir, 'screenshot-vivid.png') });
  console.log('6. Vivid palette captured');

  try {
    await window.click('button:has-text("Single")');
    await window.waitForTimeout(500);
    await window.click('button:has-text("Classic")');
    await window.waitForTimeout(500);
  } catch(e) {}
  await window.screenshot({ path: path.join(resultsDir, 'screenshot-single-classic.png') });
  console.log('7. Single + Classic captured');

  await app.close();
  console.log('All screenshots captured!');
}

main().catch(console.error);
