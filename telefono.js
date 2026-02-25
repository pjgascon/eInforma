import mysql from 'mysql2/promise';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { JSDOM } from 'jsdom';
puppeteer.use(StealthPlugin());

async function obtenerHTML(nombre, poblacion) {
    const browser = await puppeteer.launch({
        executablePath: '/snap/bin/chromium',
        headless: true,
        args: ['--window-size=800,600',
            '--window-position=-1000,0',
            '--disable-backgrounding-occluded-windows'],
        defaultViewport: null
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto("https://www.paginasamarillas.es/500?");
    await page.type('#what', nombre);
    await page.type('#where', poblacion);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    const pois = await page.evaluate(() => {
        const script = [...document.scripts].find(s =>
            s.textContent.includes('PAOL.mapaPois.addPois')
        );
        if (!script) return [];

        const regex = /PAOL\.mapaPois\.addPois\(\s*(\[[\s\S]*?\])\s*\)/;
        const match = script.textContent.match(regex);
        if (!match) return [];

        const arrayLiteral = match[1]; // ej: [{name:"Minsaez", ...}]

        // Esto se ejecuta en el contexto del navegador
        const pois = eval(arrayLiteral);
        return pois;
    });
    const poi = pois[0];

    try {
        const name = poi.name;
        const address = poi.address;
        const phone = poi.phone;
        const lat = poi.lat;
        const lng = poi.lng;

        // console.log("Nombre:", pois[0].name);
        // console.log("Dirección:", pois[0].address);
        // console.log("Teléfono:", pois[0].phone);
        // console.log("Latitud:", pois[0].lat);
        // console.log("Longitud:", pois[0].lng);
        // Si solo quieres el primero:
        // console.log('Primer POI:', pois[0]);
        // await browser.close();

        return {
            // nombre: pois[0].name ?? null,
            // direccion: pois[0].address ?? null,
            telefono: pois[0].phone ?? null,
            // latitud: pois[0].lat ?? null,
            // logitud: pois[0].lng ?? null
        };
    }
    catch (error) {
        return {
            telefono: ""
        }
    } finally {
        await browser.close();
    }
}
const args = process.argv.slice(2);
const nombre = args[0];
const poblacion = args[1];

try {
    const resultado = await obtenerHTML(nombre, poblacion);
    if (resultado) {
        console.log(JSON.stringify({ ok: true, data: resultado }));
    } else {
        console.log(JSON.stringify({ ok: false, data: 'No se ha encontrado resultados' }));
    }
}
catch (error) {
    const textoError = { textoError: error };
    console.log(JSON.stringify({ ok: false, data: textoError }));
}
