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
            host: 'localhost',     // Cambia esto si usas un servidor remoto
            user: 'root',         // Usuario de la base de datos
            password: '1826', // Contraseña del usuario
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
    const [rows] = await con.query("call captura.pendiente_cualificar();");
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
        objDatos.telefono = "No encontrado";
        objDatos.forma_juridica = "No encontrado";
        objDatos.actividad_informa = "No encontrado";
        objDatos.cnae = "No encontrado";
        objDatos.objeto_social = "No encontrado";
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

    // ✅ Teléfono desde la tabla (puede devolver varios)
    const telefonos = getDatoTablaPorLabel(document, 'Teléfono:');
    const telefono = separarTelefonos9(telefonos); // o telefonos[0] si solo quieres el primero

    const formaJuridica = getDatoTabla(document, 'Forma Jurídica');     // "Sociedad limitada" :contentReference[oaicite:2]{index=2}
    const actividadInforma = getDatoTabla(document, 'Actividad Informa');  // "Actividades de los centros de llamadas" :contentReference[oaicite:3]{index=3}
    const cnae = getDatoTabla(document, 'CNAE');               // "8220 - ..." :contentReference[oaicite:4]{index=4}
    const objetoSocial = getDatoTabla(document, 'Objeto Social');
    const regex = /(\d{5})\s+([^(]+)\s*\(\s*([^)]+)\s*\)/;
    const match = localidad.match(regex);

    let objDatos = {};
    objDatos.nombre = addslashes(denominacion);
    objDatos.cp = match[1].trim();
    objDatos.direccion = addslashes(direccion);
    objDatos.poblacion = addslashes(match[2].trim());
    objDatos.provincia = addslashes(match[3].trim());
    objDatos.telefono = addslashes(telefono);
    objDatos.forma_juridica = addslashes(formaJuridica);
    objDatos.actividad_informa = addslashes(actividadInforma);
    objDatos.cnae = addslashes(cnae);
    objDatos.objeto_social = addslashes(objetoSocial);
    return objDatos;
}

async function obtenerDatos(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let nombre = document.querySelector('title')?.textContent || 'No encontrado';

    let direccion = 'No encontrado';
    let poblacion = "No encontrado";
    let provincia = "No encontrado";
    let telefono = "No encontrado";

    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
        try {
            const jsonData = JSON.parse(script.textContent);
            if (jsonData["@type"] === "Corporation" && jsonData.address) {
                direccion = jsonData.address.streetAddress;
                poblacion = jsonData.address.addressLocality;
                provincia = jsonData.address.addressRegion;
            }
        } catch (error) { }
    });

    let objDatos = {};
    objDatos.nombre = addslashes(nombre);
    objDatos.direccion = addslashes(direccion);
    objDatos.poblacion = addslashes(poblacion);
    objDatos.provincia = addslashes(provincia);
    objDatos.telefono = addslashes(telefonos);

    return objDatos;
}


async function guardarDatos(datos) {
    const con = await connectar();
    const sql = "call captura.cualificado_guardar('" + cif + "','" + datos.nombre + "','" + datos.direccion + "','" + datos.cp + "','" + datos.poblacion + "','" + datos.provincia + "','" + datos.telefono + "','" + datos.forma_juridica + "','" + datos.actividad_informa + "','" + datos.cnae + "','" + datos.objeto_social + "')";
    await con.query(sql);
    const sqlAux = "call captura.actualizar('" + cif + "');";
    await con.query(sqlAux);
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

function getDatoTablaPorLabel(document, label) {
    // Busca la tabla principal de datos
    const rows = document.querySelectorAll('table#datos tr');

    for (const tr of rows) {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) continue;

        const key = (tds[0].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (key === label.toLowerCase()) {
            // En el TD de valor hay <br>, así que textContent ya trae saltos -> los normalizamos
            const raw = (tds[1].textContent || '').trim();

            // Saca teléfonos: secuencias de 9+ dígitos (ajusta si quieres)
            const phones = raw
                .split(/[\r\n]+/g)
                .map(s => s.replace(/\s+/g, '').trim())
                .filter(s => /\d{9,}/.test(s));

            return phones; // array (puede venir 1 o varios)
        }
    }
    return [];
}

function separarTelefonos9(cadena) {
    if (cadena === null || cadena === undefined) return '';

    // 🔒 forzar a string SIEMPRE
    const texto = String(cadena);

    // Quitar todo lo que no sean números
    const soloNumeros = texto.replace(/\D/g, '');

    // Extraer bloques de 9 cifras
    const telefonos = soloNumeros.match(/\d{9}/g) || [];

    return telefonos.join(', ');
}

function getDatoTabla(document, contieneLabel) {
    const rows = document.querySelectorAll('table#datos tr');

    for (const tr of rows) {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) continue;

        const label = (tds[0].textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        if (label.includes(contieneLabel.toLowerCase())) {
            return (tds[1].textContent || '').replace(/\s+/g, ' ').trim();
        }
    }
    return '';
}


const cif = await obtenerCif();
//const cif = "B84525864";
if (cif.length > 0) {
    const html = await obtenerHTML(cif);
    const datos = await (obtenerDatosB(html));

    await guardarDatos(datos);
} else {
    console.log("No hay más cif");
}
