# CONTROL STOCK PRO

App web profesional para control de stock en tiempo real, vinculada con Google Sheets como base de datos.

## Tecnologías
- Frontend: HTML + CSS + JavaScript (single page app)
- Backend: Google Apps Script
- Base de datos: Google Sheets
- Notificaciones: Email + Telegram Bot

## Locales
- 🔥 Umo Grill
- 🍦 Puerto Gelato
- 🍔 Brooklyn
- ☕ Trento Cafe
- 🎪 Eventos (Docks del Puerto)
- 🏬 Shopping

## Live App
https://yaakov2731.github.io/control-stock-pro/

## Setup
1. Subir `ControlStockPRO.xlsx` a Google Drive → abrir como Google Sheet
2. Extensiones → Apps Script → pegar el contenido de `Code.gs`
3. Ejecutar `crearEstructura()` → crea las 7 hojas automáticamente
4. Ejecutar `cargarDatosDemo()` → carga productos de ejemplo
5. Configurar TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID y NOTIFY_EMAILS en las líneas 10-18
6. Deploy → Implementar como App web → Acceso: Cualquier persona → copiar URL
7. En `index.html` reemplazar `PEGAR_TU_URL_DE_APPS_SCRIPT_AQUI` por la URL del deploy
8. Push a GitHub → GitHub Pages activo en rama main

## Notificaciones automáticas
Cada vez que se guarda un registro de stock, la app envía:
- **Telegram**: mensaje inmediato con producto, stock, mínimo y estado
- **Email HTML**: diseño corporativo con alerta visual si está bajo mínimo

---
*Docks del Puerto • Tigre*
