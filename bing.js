import mysql from 'mysql2/promise';
// import { launch } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { JSDOM } from 'jsdom';
// import { connect } from 'puppeteer';
// import { launch } from 'chrome-launcher';
// import fetch from 'node-fetch';
puppeteer.use(StealthPlugin());

async function obtenerHTML(cif) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: ['--window-size=1,1',
            '--window-position=-1000,0',
            '--disable-backgrounding-occluded-windows'],
        defaultViewport: null
        // args: ['--no-sandbox', '--disable-setuid-sandbox''--disable-backgrounding-occluded-windows', // Sigue ejecutando aunque esté oculta
        // '--no-startup-window']
    });
    // const browser = await connect({ browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/d13356c4-0eaa-4248-8f4c-c43b4f8ad5e4' });
    const page = await browser.newPage();
    page.waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    /* await page.authenticate({
         username: 'hjmguwrp',
         password: 'qe8ymbbcdnz9'
     });*/

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto("https://www.bing.com");
    await page.waitForSelector('#sb_form_q');
    await page.type('#sb_form_q', cif);
    await page.waitForTimeout(3000);
    await page.keyboard.press('Enter');
    await page.waitForNavigation();

    const pageHTML = await page.evaluate(() => {
        return document.querySelector('.b_caption p')?.innerText;
    });
    // const pageHTML = await page.evaluate(() => document.documentElement.outerHTML);

    await browser.close();

    return pageHTML;
}

function extraerTelefono(texto) {
    // Patrón para teléfonos españoles (9 dígitos, empieza por 6-9, con prefijo opcional)
    const regex = /(?:(?:\+34|0034|34)[\s-]*)?([6789][\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d)/g;

    const coincidencias = texto.match(regex);

    if (coincidencias) {
        // Limpiamos el número para que solo queden dígitos
        return coincidencias.map(tel => tel.replace(/\D/g, ''));
    }
    return null;
}

const r = await obtenerHTML("telefono de HUMBLE LION SLP de VILLANUEVA DEL PARDILLO provincia madrid");
console.log(extraerTelefono(r));

