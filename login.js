import { launch } from 'puppeteer';

(async () => {
    // Iniciar navegador en modo headless
    // const browser = await puppeteer.launch({
    //     headless: 'new',  // Modo headless activado
    //     args: ['--no-sandbox', '--disable-setuid-sandbox'] // Requerido en servidores sin UI
    // });

    const browser = await launch({
        executablePath: '/usr/bin/google-chrome', 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // const browser = await puppeteer.launch({
    //     headless: false, // Poner en 'true' si quieres que sea en segundo plano
    //     defaultViewport: null, // Usa el tamaño completo de la ventana
    //     args: ['--start-maximized'], // Abre el navegador maximizado
    //     executablePath: '/usr/bin/google-chrome', 
    // });
    const page = await browser.newPage();

    // Navegar a la página de login
    await page.goto('https://www.einforma.com/login', { waitUntil: 'networkidle0' });

    // Completar el formulario de login
    await page.type('#nombre_login', 'manuelbeltranlopez@gmail.com');
    await page.type('#check_password_login', 'Lanjaron1');

    // Hacer clic en el botón de login y esperar la navegación
    await Promise.all([
        page.click('#submit_login'),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Confirmar que el login fue exitoso (por ejemplo, verificar la URL actual)
    console.log('Login exitoso, URL actual:', page.url());

    await page.type('#idDelBuscadorDelHeadersearch-text', 'B56396393');

    await page.waitForSelector('.c-search-int__button.c-search-int__button--search', { visible: true });

    // Hacer clic en el botón de login y esperar la navegación
    await Promise.all([
        page.keyboard.press('Enter'),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    console.log('2 paso exitoso, URL actual:', page.url());

    // const textToFind = "Domicilio Social";
    // const elementClass = await page.evaluate((text) => {
    //     const element = [...document.querySelectorAll('*')].find(el => el.innerText.includes(text));
    //     return element ? element.className : null;
    // }, textToFind);

    const titleToFind = "Mostrar mapa";
        
    const elementClass = await page.evaluate((title) => {
        const element = document.querySelector(`[title="${title}"]`);
        return element ? element.className : null;
    }, titleToFind);
    
    if (elementClass) {
        const text = await page.evaluate((cls) => {
            const element = document.querySelector(`.${cls}`);
            return element ? element.innerText : null;
        }, elementClass);
    
        console.log(text ? `Texto encontrado: "${text}"` : "No se encontró el texto ❌");
    } else {
        console.log("No se encontró la clase ❌");
    }
    
    // Cerrar el navegador
    await browser.close();
})();
