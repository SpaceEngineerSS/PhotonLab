/**
 * PhotonLab v2.0 Screenshot Bot
 * 
 * Captures high-quality screenshots of the Engineering Suite UI
 * for documentation and promotional materials.
 * 
 * Usage: node scripts/capture.js
 * Requires: puppeteer (npm install puppeteer)
 * 
 * Author: Mehmet Gümüş (github.com/SpaceEngineerSS)
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const DEV_SERVER_URL = 'http://localhost:5173';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper: Wait for specified milliseconds
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Safe click with wait
const safeClick = async (page, selector) => {
    try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        return true;
    } catch {
        console.warn(`⚠️ Selector not found: ${selector}`);
        return false;
    }
};

(async () => {
    console.log('📸 PhotonLab v2.0 Photographer');
    console.log('================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
        console.log('🌐 Loading PhotonLab...');
        await page.goto(DEV_SERVER_URL, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        await wait(3000); // Let WebGL initialize

        // ============================================
        // SHOT 1: Engineering Dashboard (Main View)
        // ============================================
        console.log('📸 Capturing: 01_engineering_dashboard.png');

        // Click Play button (find by text content)
        const playClicked = await page.evaluate(() => {
            const buttons = document.querySelectorAll('button.control-btn');
            for (const btn of buttons) {
                if (btn.textContent?.includes('Play')) {
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        if (playClicked) {
            console.log('   ▶ Simulation started');
        } else {
            console.warn('⚠️ Play button not found');
        }
        await wait(2000); // Let waves propagate

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '01_engineering_dashboard.png'),
            type: 'png'
        });

        // ============================================
        // SHOT 2: CAD Mode - Drawing Structures
        // ============================================
        console.log('📸 Capturing: 02_cad_mode.png');

        // Select Brush Tool (keyboard shortcut)
        await page.keyboard.press('b');
        await wait(500);

        // Get canvas position
        const canvas = await page.$('canvas');
        if (canvas) {
            const box = await canvas.boundingBox();
            if (box) {
                // Draw a prism-like structure
                await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
                await page.mouse.down();

                // Draw diagonal line
                for (let i = 0; i < 20; i++) {
                    await page.mouse.move(
                        box.x + box.width * (0.3 + i * 0.01),
                        box.y + box.height * (0.3 + i * 0.01)
                    );
                    await wait(30);
                }
                await page.mouse.up();

                await wait(1500); // Let waves interact with structure
            }
        }

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '02_cad_mode.png'),
            type: 'png'
        });

        // ============================================
        // SHOT 3: Rectangle Tool Demo
        // ============================================
        console.log('📸 Capturing: 03_rectangle_tool.png');

        // Select Rectangle Tool
        await page.keyboard.press('r');
        await wait(500);

        if (canvas) {
            const box = await canvas.boundingBox();
            if (box) {
                // Draw a rectangle
                await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.2);
                await page.mouse.down();
                await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4);
                await page.mouse.up();

                await wait(1500);
            }
        }

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '03_rectangle_tool.png'),
            type: 'png'
        });

        // ============================================
        // SHOT 4: Wave Interference Pattern
        // ============================================
        console.log('📸 Capturing: 04_wave_interference.png');

        // Let simulation run for beautiful interference
        await wait(3000);

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '04_wave_interference.png'),
            type: 'png'
        });

        // ============================================
        // SHOT 5: Mobile View (Responsive)
        // ============================================
        console.log('📸 Capturing: 05_mobile_view.png');

        await page.setViewport({ width: 375, height: 812, isMobile: true });
        await wait(1000);

        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '05_mobile_view.png'),
            type: 'png'
        });

        console.log('\n✅ Photoshoot Complete!');
        console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

    } catch (error) {
        console.error('❌ Error during capture:', error.message);
    } finally {
        await browser.close();
    }
})();
