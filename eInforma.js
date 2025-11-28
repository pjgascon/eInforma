import mysql from 'mysql2/promise';
// import { launch } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { JSDOM } from 'jsdom';
// import { connect } from 'puppeteer';
// import { launch } from 'chrome-launcher';
// import fetch from 'node-fetch';
puppeteer.use(StealthPlugin());

async function connectar() {
    try {
        const connection = await mysql.createConnection({
            host: 'waspserver.liberi.es',     // Cambia esto si usas un servidor remoto
            user: 'root',         // Usuario de la base de datos
            password: 'Coral18262202', // Contraseña del usuario
            database: 'captura', // Nombre de la base de datos
            port: 3306
        });
        // console.log('Conexión a MySQL establecida.');
        return connection;
    } catch (error) {
        console.error('Error al conectar a MySQL:', error);
        throw error;
    }
}

async function obtenerCif() {
    const con = await connectar();
    const [rows] = await con.query("call captura.datos_cif_seleccionar();");
    con.end();

    try {
        return rows[0][0].cif;
    } catch (error) {
        return "";
    }
}

async function obtenerHTML(cif) {
    const browser = await puppeteer.launch({
        executablePath: '/snap/bin/chromium',
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

   /* await page.authenticate({
        username: 'hjmguwrp',
        password: 'qe8ymbbcdnz9'
    });*/

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto("https://www.einforma.com/servlet/app/prod/ETIQUETA_EMPRESA/nif/" + cif);
    const pageHTML = await page.evaluate(() => document.documentElement.outerHTML);

    await browser.close();

    return pageHTML;
}

async function obtenerDatosB(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Verificar si aparece la cadena "no se han encontrado resultados"
    if (html.includes("No se han encontrado resultados")) {
        let objDatos = {};
        objDatos.nombre = "Sin resultados";
        objDatos.direccion = "Sin resultados";
        objDatos.poblacion = "Sin resultados";
        objDatos.provincia = "Sin resultados";
        return objDatos;
    }

    // Extraer la denominación desde el <title>
    const denominacion = document.querySelector("title")?.textContent.trim() || "No encontrada";

    // Extraer el texto completo del body
    const allText = document.body.textContent.replace(/\s+/g, ' ').trim();

    let direccion = "No encontrada";
    let localidad = "No encontrada";

    // Extraer domicilio social actual (después de "Domicilio social actual:" pero antes de "Localidad:")
    const domicilioRegex = /Domicilio social actual:\s*(.*?)\s*Localidad:/i;
    const domicilioMatch = allText.match(domicilioRegex);
    if (domicilioMatch) {
        direccion = domicilioMatch[1].trim().replace("Ver Mapa", "").trim();
    }

    // Extraer localidad (después de "Localidad:" y antes de "Fecha último dato:")
    const localidadRegex = /Localidad:\s*(.*?)\s*Fecha último dato:/i;
    const localidadMatch = allText.match(localidadRegex);
    if (localidadMatch) {
        localidad = localidadMatch[1].trim();
        const posicion = localidad.indexOf(")");

        localidad = localidad.substring(0, posicion + 1).trim();
    }

    let objDatos = {};
    objDatos.nombre = addslashes(denominacion);
    objDatos.direccion = addslashes(direccion);
    objDatos.poblacion = addslashes(localidad);
    objDatos.provincia = "";
    return objDatos;
}

async function obtenerDatos(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 🔍 Buscar la denominación (nombre de la empresa)
    let nombre = document.querySelector('title')?.textContent || 'No encontrado';

    // 🔍 Buscar el domicilio (dirección) en JSON-LD dentro de <script type="application/ld+json">
    let direccion = 'No encontrado';
    let poblacion = "No encontrado";
    let provincia = "No encontrado";
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');

    jsonLdScripts.forEach(script => {
        try {
            const jsonData = JSON.parse(script.textContent);
            if (jsonData["@type"] === "Corporation" && jsonData.address) {
                direccion = jsonData.address.streetAddress;
                // , ${jsonData.address.addressLocality}, ${jsonData.address.addressRegion}, ${jsonData.address.addressCountry}
                poblacion = jsonData.address.addressLocality;
                provincia = jsonData.address.addressRegion;
            }
        } catch (error) {
            console.error("Error procesando JSON-LD:", error);
        }
    });

    let objDatos = {};
    objDatos.nombre = nombre;
    objDatos.direccion = addslashes(direccion);
    objDatos.poblacion = addslashes(poblacion);
    objDatos.provincia = provincia;
    return objDatos;
}

async function guardarDatos(datos) {
    const con = await connectar();
    const sql = "call captura.datos_cif_guardar('" + cif + "','" + datos.nombre + "','" + datos.direccion + "','" + datos.poblacion + " " + datos.provincia + "','')";
    await con.query(sql);
    con.end();
    console.log("Guardando " + cif + " " + datos.nombre);
}

function addslashes(str) {
    return (str + '')
        .replace(/\\/g, '\\\\')   // barra invertida
        .replace(/'/g, "\\'")     // comilla simple
        .replace(/"/g, '\\"')     // comilla doble
        .replace(/\0/g, '\\0');   // carácter NULL
}

const cif = await obtenerCif();
// const cif = "A08000143";
if (cif.length > 0) {
    const html = await obtenerHTML(cif);
    const datos = await (obtenerDatosB(html));
    await guardarDatos(datos);
} else {
    console.log("No hay más cif");
}
