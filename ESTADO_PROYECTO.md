# Control Stock PRO — Estado del Proyecto

> ⚠️ PENDIENTE: Deployar nueva versión de Apps Script (Code_final_v2.gs) para activar
> la acción `actualizarSKU` y el fix de productos sin SKU. Ver instrucciones en README.

**Fecha de último estado funcional:** 03/05/2026  
**Estado:** ✅ FUNCIONANDO — v2 Scanner+Cart

---

## URLs Activas

| Recurso | URL |
|---|---|
| App (Vercel) | https://control-stock-pro.vercel.app |
| Repo GitHub | https://github.com/yaakov2731/control-stock-pro |
| Google Sheet | https://docs.google.com/spreadsheets/d/1MXuOH-6WKkRgxqJwmHoFm8pQit0DZbWjL_ipW_tpvgA |
| Apps Script Editor | https://script.google.com/u/0/home/projects/1tbSMdIbP2z5HCqpAS6UKv43gn4P3i6DHaKavP-Ib4ZNRYpwpoqc9ytUj/edit |
| Apps Script Endpoint | https://script.google.com/macros/s/AKfycbwDYUvVT06csgULgwvOnIUygsT8ZWm6U4xMV38BJXd01VmGlJmJcK8_7QMKGOs9DsVk/exec |

---

## Arquitectura

```
[App Vercel - index.html]
        |
        | POST (no-cors, JSON)
        v
[Google Apps Script v31 - Code_final_v2.gs]
        |
        |--- Escribe en Google Sheets (pestaña por local)
        |--- Envía notificación a Telegram
```

---

## Estructura de la Google Sheet

### Pestañas por local
| ID Frontend | Pestaña en Sheet |
|---|---|
| `umo` | UmoGrill |
| `gelato` | PuertoGelato |
| `brooklyn` | Brooklyn |
| `trento` | TrentoCafe |
| `eventos` | Eventos |
| `shopping` | Shopping |

### Estructura de cada pestaña
- **Fila 1:** Título del local (merge)
- **Fila 2:** Subtítulos (CATÁLOGO / REGISTRO)
- **Fila 3:** Headers
  - Catálogo: A=SKU, B=PRODUCTO, C=CATEGORÍA, D=UNIDAD, E=MÍNIMO, F=ACTIVO
  - Registro: H=FECHA, I=HORA, J=RESPONSABLE, K=SKU, L=PRODUCTO, M=STOCK, N=NOTA
- **Fila 4+:** Datos

### Pestaña Config
- **A:B** = Responsables (LOCAL_ID, NOMBRE) desde fila 5
- **D:E** = Categorías (LOCAL_ID, CATEGORÍA) desde fila 5

---

## Apps Script — Versión activa

**Archivo:** `Code_final_v2.gs`  
**Versión deployment:** 31 (07/03/2026 11:35 a.m.) — ver tabla abajo  
**Cuenta:** yaakovrubi@gmail.com

### Historial de versiones
| Versión | Fecha | Descripción |
|---|---|---|
| v31 | 07/03/2026 | Versión base con Telegram notifications |
| v4 | 03/05/2026 | v2 Scanner+Cart deployment |

### Acciones disponibles (doPost)
| Acción | Descripción |
|---|---|
| `ping` | Test de conectividad |
| `getConfig` | Obtiene responsables y categorías de un local |
| `getProducts` | Obtiene catálogo de productos de un local |
| `agregarRegistro` | Guarda un registro de stock en la pestaña del local |
| `testTelegram` | Envía mensaje de prueba a Telegram |
| `actualizarSKU` | Asigna/actualiza el SKU de un producto en el catálogo |

### Telegram
- **Bot Token:** `8667407358:AAF9VdTQ9IMffKDFbvLPw-2cCqmED-OgzpE`
- **Chat ID:** `7259177758`
- **Trigger:** cada `agregarRegistro` exitoso

---

## Frontend — index.html

### Funcionalidades
- **Registro optimista:** muestra éxito inmediatamente, envía en background
- **Cola persistente:** si falla el envío, reintenta automáticamente
- **Cache localStorage:** config (responsables + categorías) se cachea 5 min
- **6 locales:** Umo Grill, Puerto Gelato, Brooklyn, Trento Cafe, Eventos, Shopping
- **Tabs:** Registro / Historial / Stats / Config

### Variables clave en el código
```javascript
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDYUvVT06csgULgwvOnIUygsT8ZWm6U4xMV38BJXd01VmGlJmJcK8_7QMKGOs9DsVk/exec";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
```

---

## Cómo actualizar el Apps Script (si hay cambios)

1. Abrí el editor: https://script.google.com/u/0/home/projects/1tbSMdIbP2z5HCqpAS6UKv43gn4P3i6DHaKavP-Ib4ZNRYpwpoqc9ytUj/edit
2. Seleccioná todo (`Ctrl+A`) y borrá (`Delete`)
3. Pegá el contenido de `Code_final_v2.gs` del repo
4. Guardá (`Ctrl+S`)
5. **Implementar → Nueva implementación → App web → Ejecutar como Yo → Cualquiera → Implementar**
6. Copiá la nueva URL `/exec`
7. Actualizá `SCRIPT_URL` en `index.html`
8. Hacé commit + push al repo

---

## Commits relevantes

| Commit | Descripción |
|---|---|
| `ae33acb` | feat: update Apps Script URL to v31 with Telegram notifications |
| `0cfe874` | fix: correct Apps Script URL and optimize registration speed |
| Anteriores | Optimización de velocidad, mapeo de locales, registro optimista |

---

## Problemas resueltos en esta sesión

1. **Velocidad >15 seg** → Registro optimista (instantáneo) + cache de config
2. **Registros en pestaña incorrecta** → Mapeo correcto de local ID a nombre de pestaña en Apps Script
3. **Notificaciones Telegram** → Configuradas con bot token real, formato exacto por registro
