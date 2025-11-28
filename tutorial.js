import { connect } from 'puppeteer';
import { launch } from 'chrome-launcher';
import fetch from 'node-fetch';

async function launchChrome() {
    const chrome = await launch({
        executablePath: '/usr/bin/google-chrome',
        chromeFlags: [
            '--remote-debugging-port=9222',
            '--user-data-dir=/tmp/puppeteer_profile',
            '--window-position=-10000,0', // para no tomar foco
            '--disable-backgrounding-occluded-windows',
            '--no-default-browser-check',
            '--no-first-run'
        ],
        logLevel: 'silent'
    });

    return chrome;
}

async function getWSEndpoint() {
    const response = await fetch('http://localhost:9222/json/version');
    const data = await response.json();
    return data.webSocketDebuggerUrl;
}

(async () => {
    try {
        // Paso 1: Lanza Chrome
        const chrome = await launchChrome();

        // // Paso 2: Espera a que Chrome esté listo
        const endpoint = await getWSEndpoint();

        // Paso 3: Conéctate con Puppeteer
        const browser = await connect({ browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/b6f79f42-5cde-4a77-90a0-93a89d6a17ef' });

        // Paso 4: Abre una nueva página
        const page = await browser.newPage();
        await page.goto('https://example.com');

        console.log('Navegador conectado y página cargada.');

        // Deja abierto o haz tu trabajo aquí
        // await browser.close(); // si quieres cerrar luego
    } catch (err) {
        console.error('Error:', err);
    }
})();
