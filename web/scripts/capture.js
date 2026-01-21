/**
 * PhotonLab Screenshot Capture Bot
 * 
 * Automated screenshot generation using Puppeteer.
 * Captures scenario-specific screenshots for README and documentation.
 * 
 * Usage: npm run capture (requires dev server running on localhost:5173)
 */

import puppeteer from 'puppeteer';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
    baseUrl: 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    outputDir: join(__dirname, '..', 'screenshots'),
    timeout: 30000,
};

// Helper functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (emoji, message) => {
    console.log(`${emoji} ${message}`);
};

/**
 * Click element containing specific text
 */
async function clickText(page, text, options = {}) {
    const { timeout = 5000 } = options;

    try {
        // Try button first
        const buttonSelector = `button:has-text("${text}")`;
        await page.waitForSelector(`button`, { timeout: 2000 });

        const buttons = await page.$$('button');
        for (const button of buttons) {
            const buttonText = await button.evaluate(el => el.textContent);
            if (buttonText && buttonText.includes(text)) {
                await button.click();
                log('🖱️', `Clicked: "${text}"`);
                return true;
            }
        }

        // Try any clickable element
        const elements = await page.$$('*');
        for (const el of elements) {
            const elText = await el.evaluate(e => e.textContent);
            if (elText && elText.includes(text)) {
                await el.click();
                log('🖱️', `Clicked element: "${text}"`);
                return true;
            }
        }

        throw new Error(`Element with text "${text}" not found`);
    } catch (error) {
        log('⚠️', `Could not click "${text}": ${error.message}`);
        return false;
    }
}

/**
 * Capture screenshot with logging
 */
async function capture(page, filename) {
    const filepath = join(CONFIG.outputDir, filename);
    await page.screenshot({
        path: filepath,
        type: 'png',
        fullPage: false,
    });
    log('📸', `Captured: ${filename}`);
    return filepath;
}

/**
 * Main capture sequence
 */
async function main() {
    log('🚀', 'PhotonLab Screenshot Bot Starting...');
    log('📁', `Output directory: ${CONFIG.outputDir}`);

    // Ensure output directory exists
    await mkdir(CONFIG.outputDir, { recursive: true });

    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--window-size=${CONFIG.viewport.width},${CONFIG.viewport.height}`,
        ],
    });

    const page = await browser.newPage();
    await page.setViewport(CONFIG.viewport);

    try {
        // Navigate to app
        log('🌐', `Navigating to ${CONFIG.baseUrl}...`);
        await page.goto(CONFIG.baseUrl, {
            waitUntil: 'networkidle0',
            timeout: CONFIG.timeout,
        });

        // Wait for initial render
        await sleep(2000);

        // ========================================
        // Capture 1: Main Interface
        // ========================================
        log('⏳', 'Waiting for main interface...');
        await sleep(1000);
        await capture(page, '01_main_interface.png');

        // ========================================
        // Capture 2: Double Slit Scenario
        // ========================================
        log('🧪', 'Loading Double Slit scenario...');

        // Open scenario dropdown
        await clickText(page, 'Select Scenario');
        await sleep(500);

        // Click Double Slit
        await clickText(page, 'Double Slit');
        await sleep(500);

        // Click Play button
        await clickText(page, 'Play');
        await sleep(4000); // Wait for waves to propagate

        await capture(page, '02_double_slit.png');

        // ========================================
        // Capture 3: Parabolic Reflector
        // ========================================
        log('🧪', 'Loading Parabolic Reflector scenario...');

        // Pause first
        await clickText(page, 'Pause');
        await sleep(300);

        // Open scenario dropdown
        await clickText(page, 'Double Slit');
        await sleep(500);

        // Click Parabolic Reflector
        await clickText(page, 'Parabolic');
        await sleep(500);

        // Click Play
        await clickText(page, 'Play');
        await sleep(3000);

        await capture(page, '03_parabolic_reflector.png');

        // ========================================
        // Capture 4: Signal Monitor (Pulse + Probe)
        // ========================================
        log('🧪', 'Setting up Signal Monitor demo...');

        // Pause
        await clickText(page, 'Pause');
        await sleep(300);

        // Load empty grid
        await clickText(page, 'Parabolic');
        await sleep(500);
        await clickText(page, 'Empty');
        await sleep(500);

        // Click Select tool
        await clickText(page, 'Select');
        await sleep(300);

        // Click canvas center to place probe
        const canvasArea = await page.$('.canvas-area');
        if (canvasArea) {
            const box = await canvasArea.boundingBox();
            if (box) {
                await page.mouse.click(
                    box.x + box.width / 2,
                    box.y + box.height / 2
                );
                log('🎯', 'Placed probe at canvas center');
            }
        }
        await sleep(500);

        // Click Pulse to add energy
        await clickText(page, 'Pulse');
        await sleep(300);

        // Play simulation
        await clickText(page, 'Play');
        await sleep(3000);

        await capture(page, '04_signal_monitor.png');

        // ========================================
        // Capture 5: Lens Scenario
        // ========================================
        log('🧪', 'Loading Lens scenario...');

        await clickText(page, 'Pause');
        await sleep(300);

        await clickText(page, 'Empty');
        await sleep(500);
        await clickText(page, 'Lens');
        await sleep(500);

        await clickText(page, 'Play');
        await sleep(3000);

        await capture(page, '05_lens_focusing.png');

        // ========================================
        // Done!
        // ========================================
        log('✅', 'All screenshots captured successfully!');
        log('📂', `Screenshots saved to: ${CONFIG.outputDir}`);

    } catch (error) {
        log('❌', `Error: ${error.message}`);
        console.error(error);
    } finally {
        await browser.close();
        log('👋', 'Browser closed. Done!');
    }
}

// Run
main().catch(console.error);
