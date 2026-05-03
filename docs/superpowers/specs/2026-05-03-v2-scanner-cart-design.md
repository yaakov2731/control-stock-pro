# Control Stock PRO v2 — Scanner + Cart Design

**Date:** 2026-05-03  
**Status:** Approved

---

## Overview

Rebuild `index.html` into a professional multi-device stock registration app with barcode scanning, a cart-based multi-product flow, auto-barcode assignment, and a polished responsive UI. Backend (Google Apps Script + Sheets) stays unchanged except for one new action.

---

## Architecture

```
[index.html — single file, vanilla JS]
    |
    |── ZXing CDN — barcode scanning via device camera
    |── localStorage — cart persistence, config cache (5 min)
    |── pendingQueue — background send to Apps Script
    v
[Google Apps Script — existing endpoint]
    |── agregarRegistro (existing) — one record
    |── getConfig (existing) — responsables, categorias, productos+SKU
    |── actualizarSKU (NEW) — save barcode→product mapping to Sheet
```

No new files. No build system. Same Vercel deploy (push to main → auto-deploy).

---

## Features

### 1. Scanner + Cart Flow

**Step 1 — Select local + responsable** (same as now, but responsable persists for whole session)

**Step 2 — Scan or search**
- Big camera button → opens ZXing scanner fullscreen
- Text search below: fuzzy match on product name or SKU
- On mobile: camera button dominant; on PC: search input focused by default

**Step 3 — Confirm item**
- Product name + SKU shown
- Entrada / Salida toggle
- +/− quantity buttons (tap-friendly) + direct number input
- "AGREGAR AL CARRITO" button

**Step 4 — Cart**
- On mobile (< 768px): bottom drawer, shows item count badge on a cart icon
- On tablet (768–1024px): side panel right column, visible alongside scanner
- On PC (> 1024px): fixed right panel, always visible
- Each item: name, qty, type (📥/📤), delete button
- "GUARDAR TODO (N)" green button sends all via queue

### 2. Barcode Auto-Assignment

When scanner reads a barcode not found in product catalog:
1. Show modal: "Código desconocido: XXXXXXX"
2. Search/select which product it corresponds to
3. "ASIGNAR" → call `actualizarSKU` action on Apps Script → saves to Sheet column A
4. Product's SKU in Sheet gets updated; next `getConfig` fetch picks it up
5. Locally: update `state.products` immediately so scan works same session

When a product has no SKU at all (blank in Sheet):
- Auto-generate: `CSP-` + padded sequential number (e.g. `CSP-001`)
- Assign on first use via same `actualizarSKU` flow

### 3. Speed Improvements

- Config cache: already 5 min in localStorage — keep
- Show skeleton UI immediately while config loads (no blank screen)
- Product search: pre-index on load for instant fuzzy match (no re-filtering on each keystroke)
- Cart survives page reload (localStorage `csp_cart`)
- Responsable selection persists in localStorage per local

### 4. Responsive Layout

| Breakpoint | Layout |
|---|---|
| < 768px (phone) | Single column; cart = bottom drawer with badge |
| 768–1024px (tablet) | Two columns: scanner left, cart right |
| > 1024px (PC) | Max-width 1200px; scanner center, cart fixed right panel |

### 5. UI Polish

- Keep dark theme (`#0f172a` base) — already professional
- ZXing scanner: fullscreen overlay with corner guides, tap-to-close
- Cart items: swipe-to-delete on touch devices
- Success haptics (navigator.vibrate) on add to cart + save all
- Animated cart badge count on item add

---

## New Apps Script Action: `actualizarSKU`

```javascript
// In Code_final_v2.gs — new case in doPost switch
case "actualizarSKU":
  // data.local, data.sku, data.producto
  // Find row in local sheet where col B = producto name
  // Set col A = sku
  // Return { success: true }
```

---

## What Does NOT Change

- All existing `agregarRegistro`, `getConfig`, `getProducts` actions
- Google Sheet structure
- Telegram notifications
- Vercel deployment config
- Dark color scheme
- Historial / Stats / Config tabs (kept as-is)

---

## Success Criteria

1. Scan a barcode → product identified in < 1s
2. Add 5 products to cart in < 30s
3. Unknown barcode → assigned and synced in < 10s
4. Works on iPhone Safari, iPad Safari, Chrome desktop
5. Cart persists through accidental page refresh
