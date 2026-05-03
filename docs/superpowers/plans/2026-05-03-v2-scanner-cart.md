# Control Stock PRO v2 — Scanner + Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the registration tab of `index.html` to support barcode scanning, cart-based multi-product entry, unknown barcode auto-assignment, and responsive layout for iPhone/iPad/PC.

**Architecture:** Single vanilla HTML file (`index.html`) — no build system, no new files. Apps Script (`Code_final_v2.gs`) gets one new action (`actualizarSKU`). Vercel auto-deploys on push to `main`. ZXing loaded via CDN for barcode scanning.

**Tech Stack:** Vanilla JS ES6, CSS custom properties, `@zxing/browser` CDN, Google Apps Script, localStorage, Vercel

**Repo:** `C:\Users\jcbru\control-stock-pro\`

---

## File Map

| File | Action | What changes |
|---|---|---|
| `index.html` | Modify | New CSS for scanner/cart/responsive, new HTML scanner overlay, new cart HTML, new JS for scanner/cart/search/assignment |
| `Code_final_v2.gs` | Modify | Add `actualizarSKU` case + fix `getProducts` to include no-SKU products |
| `ESTADO_PROYECTO.md` | Modify | Update version and new endpoint docs |

---

## Task 1: Apps Script — actualizarSKU + include no-SKU products

**Files:**
- Modify: `Code_final_v2.gs`

- [ ] **Step 1: Add `actualizarSKU` to the `doPost` switch**

In `Code_final_v2.gs`, inside the `switch(action)` block (around line 63), add before `default:`:

```javascript
      case "actualizarSKU":
        result = actualizarSKU(data.localId || data.local, data.sku, data.producto);
        break;
```

- [ ] **Step 2: Write the `actualizarSKU` function**

Add after the `getConfig` function (around line 230):

```javascript
// ============================================================
// ACTUALIZAR SKU DE UN PRODUCTO (barcode assignment)
// ============================================================
function actualizarSKU(localId, sku, nombreProducto) {
  try {
    const sheetName = LOCAL_MAP[localId];
    if (!sheetName) return { ok: false, error: "Local no válido: " + localId };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { ok: false, error: "Pestaña no encontrada: " + sheetName };

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return { ok: false, error: "Sin productos" };

    const data = sheet.getRange(4, 1, lastRow - 3, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      const nombre = String(data[i][1] || "").trim();
      if (nombre.toLowerCase() === nombreProducto.toLowerCase()) {
        sheet.getRange(4 + i, 1).setValue(sku);
        return { ok: true, sku: sku, producto: nombreProducto, fila: 4 + i };
      }
    }
    return { ok: false, error: "Producto no encontrado: " + nombreProducto };
  } catch(err) {
    Logger.log("actualizarSKU error: " + err);
    return { ok: false, error: err.toString() };
  }
}
```

- [ ] **Step 3: Fix `getProducts` to include products without SKU**

In `getProducts` (around line 159), change the filter from:

```javascript
    const products = data
      .filter(r => r[0] && String(r[0]).trim())
      .map(r => ({
```

To:

```javascript
    const products = data
      .filter(r => r[1] && String(r[1]).trim())   // solo requiere nombre
      .map(r => ({
        sku:      String(r[0] || "").trim(),       // puede ser vacío
        nombre:   String(r[1]).trim(),
        producto: String(r[1]).trim(),
```

Leave the rest of the `.map()` body identical.

- [ ] **Step 4: Deploy new Apps Script version**

1. Open: https://script.google.com/u/0/home/projects/1tbSMdIbP2z5HCqpAS6UKv43gn4P3i6DHaKavP-Ib4ZNRYpwpoqc9ytUj/edit
2. Select all (`Ctrl+A`), delete, paste full content of updated `Code_final_v2.gs`
3. Save (`Ctrl+S`)
4. **Implementar → Nueva implementación → App web → Ejecutar como Yo → Cualquiera → Implementar**
5. Copy the new `/exec` URL
6. Update `SCRIPT_URL` in `index.html` (line 598) with the new URL

- [ ] **Step 5: Commit Apps Script changes**

```bash
cd /c/Users/jcbru/control-stock-pro
git add Code_final_v2.gs
git commit -m "feat: add actualizarSKU action and include no-SKU products in catalog"
```

---

## Task 2: CSS — Scanner overlay, cart, responsive layout

**Files:**
- Modify: `index.html` (CSS section, inside `<style>`)

- [ ] **Step 1: Add CSS variables for new components**

Add to `:root` block (after existing vars):

```css
  --cart-bg: #0d1526;
  --scanner-overlay: rgba(0,0,0,0.92);
  --badge-bg: #ef4444;
```

- [ ] **Step 2: Add scanner overlay CSS**

Add after `.status-dot` styles:

```css
/* ===== SCANNER OVERLAY ===== */
.scanner-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: var(--scanner-overlay);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.scanner-overlay.hidden { display: none; }

.scanner-video-wrap {
  position: relative; width: 100%; max-width: 400px;
  aspect-ratio: 1; overflow: hidden; border-radius: 16px;
}
.scanner-video-wrap video {
  width: 100%; height: 100%; object-fit: cover;
}
.scanner-corners {
  position: absolute; inset: 0; pointer-events: none;
}
.scanner-corners::before, .scanner-corners::after,
.scanner-corners span::before, .scanner-corners span::after {
  content: ""; position: absolute; width: 32px; height: 32px;
  border-color: #3b82f6; border-style: solid;
}
.scanner-corners::before  { top:12px; left:12px;  border-width: 3px 0 0 3px; }
.scanner-corners::after   { top:12px; right:12px; border-width: 3px 3px 0 0; }
.scanner-corners span::before  { bottom:12px; left:12px;  border-width: 0 0 3px 3px; }
.scanner-corners span::after   { bottom:12px; right:12px; border-width: 0 3px 3px 0; }

.scanner-line {
  position: absolute; left: 16px; right: 16px; height: 2px;
  background: #3b82f6; opacity: 0.8;
  animation: scanLine 2s ease-in-out infinite;
  box-shadow: 0 0 8px #3b82f6;
}
@keyframes scanLine {
  0%   { top: 16px; }
  50%  { top: calc(100% - 16px); }
  100% { top: 16px; }
}

.scanner-status {
  margin-top: 20px; color: #94a3b8; font-size: 14px; font-weight: 600;
  letter-spacing: 1px; text-align: center;
}
.scanner-close-btn {
  margin-top: 24px; padding: 12px 32px; border-radius: 12px;
  border: 1px solid var(--border-light); background: transparent;
  color: var(--text); font-size: 14px; font-weight: 600; cursor: pointer;
  font-family: inherit;
}
```

- [ ] **Step 3: Add cart CSS**

```css
/* ===== CART ===== */
.cart-badge {
  position: absolute; top: -6px; right: -6px;
  background: var(--badge-bg); color: #fff;
  font-size: 10px; font-weight: 800; line-height: 1;
  padding: 3px 5px; border-radius: 10px; min-width: 18px; text-align: center;
  display: none;
}
.cart-badge.show { display: block; }
.cart-badge.pop  { animation: badgePop 0.3s ease; }
@keyframes badgePop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.5); }
  100% { transform: scale(1); }
}

/* Mobile cart — bottom drawer */
.cart-drawer {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  background: var(--cart-bg); border-top: 1px solid var(--border-light);
  border-radius: 20px 20px 0 0;
  transform: translateY(calc(100% - 56px));
  transition: transform 0.3s ease;
  max-height: 70vh; display: flex; flex-direction: column;
}
.cart-drawer.open { transform: translateY(0); }
.cart-drawer-handle {
  padding: 12px 16px; display: flex; align-items: center;
  justify-content: space-between; cursor: pointer; flex-shrink: 0;
}
.cart-drawer-handle-bar {
  width: 36px; height: 4px; background: #334155; border-radius: 2px;
  position: absolute; left: 50%; transform: translateX(-50%);
}
.cart-handle-title {
  font-size: 13px; font-weight: 700; color: var(--primary-light);
  padding-top: 4px;
}
.cart-handle-count {
  font-size: 12px; color: var(--text-muted);
}
.cart-items-list {
  overflow-y: auto; flex: 1; padding: 0 16px;
}
.cart-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.cart-item:last-child { border-bottom: none; }
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-name {
  font-size: 13px; font-weight: 600; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cart-item-detail { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.cart-item-remove {
  background: none; border: none; color: #ef4444; cursor: pointer;
  font-size: 16px; padding: 4px 8px; flex-shrink: 0;
}
.cart-save-btn {
  margin: 12px 16px 16px; padding: 14px;
  background: linear-gradient(135deg, var(--success-dark), var(--success));
  color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 1px;
  border: none; border-radius: 12px; cursor: pointer; font-family: inherit;
  box-shadow: 0 6px 0 rgba(21,128,61,0.5); text-transform: uppercase;
  transition: all 0.15s; flex-shrink: 0;
}
.cart-save-btn:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(21,128,61,0.5); }
.cart-save-btn:disabled { background: #1f2937; color: #6b7280; box-shadow: none; }

/* Tablet/PC cart — side panel (overrides mobile styles) */
@media (min-width: 768px) {
  .cart-drawer {
    position: sticky; top: 16px;
    transform: none !important;
    border-radius: 16px; border: 1px solid var(--border-light);
    max-height: calc(100vh - 32px);
    height: fit-content; min-height: 200px;
  }
  .cart-drawer-handle-bar { display: none; }
  .cart-drawer-handle { cursor: default; }
}
```

- [ ] **Step 4: Add responsive layout + search CSS**

```css
/* ===== REGISTRO V2 LAYOUT ===== */
.registro-v2-layout {
  display: flex; flex-direction: column; gap: 0;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .app { max-width: 100%; }
  .registro-v2-layout {
    flex-direction: row; align-items: flex-start; gap: 16px; max-width: 1200px; margin: 0 auto;
  }
  .registro-v2-main { flex: 1; min-width: 0; }
  .registro-v2-cart { width: 320px; flex-shrink: 0; }
}

@media (min-width: 1024px) {
  .registro-v2-cart { width: 360px; }
}

/* Scan button */
.scan-btn {
  width: 100%; padding: 20px; border-radius: 16px; border: none;
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  color: #fff; font-size: 16px; font-weight: 700; letter-spacing: 1px;
  cursor: pointer; font-family: inherit; display: flex; align-items: center;
  justify-content: center; gap: 12px; margin-bottom: 12px;
  box-shadow: 0 8px 0 rgba(30,64,175,0.5), 0 12px 28px rgba(30,64,175,0.3);
  transition: all 0.15s; text-transform: uppercase;
}
.scan-btn:active { transform: translateY(4px); box-shadow: 0 4px 0 rgba(30,64,175,0.5); }
.scan-btn-icon { font-size: 28px; }

/* Search */
.search-wrap { position: relative; margin-bottom: 12px; }
.search-input {
  width: 100%; padding: 14px 16px 14px 44px;
  border-radius: 12px; border: 1px solid var(--border-light);
  background: var(--bg-input); color: var(--text); font-size: 15px;
  font-family: inherit; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: rgba(30,64,175,0.5); box-shadow: 0 0 0 3px rgba(30,64,175,0.1);
}
.search-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); font-size: 18px; pointer-events: none;
}
.search-results {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  background: #1e293b; border: 1px solid var(--border-light); border-radius: 12px;
  overflow: hidden; margin-top: 4px; max-height: 240px; overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.search-result-item {
  padding: 12px 16px; cursor: pointer; display: flex; align-items: center;
  justify-content: space-between; transition: background 0.15s;
}
.search-result-item:hover, .search-result-item:focus { background: #2d3f5a; }
.search-result-name { font-size: 14px; color: var(--text); font-weight: 500; }
.search-result-meta { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.search-result-sku { font-size: 11px; color: var(--text-dim); }

/* Confirm panel */
.confirm-panel {
  background: linear-gradient(180deg, var(--bg-card), rgba(15,23,42,0.8));
  border-radius: 16px; padding: 18px; border: 1px solid var(--border-light);
  margin-bottom: 12px;
}
.confirm-product-name { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.confirm-product-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
.qty-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.qty-btn {
  width: 44px; height: 44px; border-radius: 10px; border: none;
  background: var(--bg-card); color: var(--text); font-size: 22px; font-weight: 700;
  cursor: pointer; font-family: inherit; display: flex; align-items: center;
  justify-content: center; border: 1px solid var(--border-light);
  transition: background 0.15s;
}
.qty-btn:active { background: #1e3a5f; }
.qty-input {
  flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #3b82f6;
  background: var(--bg-input); color: var(--text); font-size: 20px;
  font-weight: 700; text-align: center; font-family: inherit; outline: none;
}
.add-to-cart-btn {
  width: 100%; padding: 14px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #1e3a8a, #1d4ed8);
  color: #fff; font-size: 14px; font-weight: 700; letter-spacing: 1px;
  cursor: pointer; font-family: inherit; text-transform: uppercase;
  transition: all 0.15s;
  box-shadow: 0 6px 0 rgba(30,64,175,0.5);
}
.add-to-cart-btn:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(30,64,175,0.5); }

/* Cart float button (mobile only) */
.cart-float-btn {
  position: fixed; bottom: 20px; right: 16px; z-index: 150;
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, var(--success-dark), var(--success));
  border: none; cursor: pointer; display: flex; align-items: center;
  justify-content: center; font-size: 24px;
  box-shadow: 0 4px 16px rgba(22,163,74,0.5);
}
.cart-float-btn.hidden { display: none; }
@media (min-width: 768px) { .cart-float-btn { display: none !important; } }

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, #1e293b 25%, #2d3f5a 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite; border-radius: 8px; height: 14px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Unknown barcode modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.7); display: flex;
  align-items: flex-end; justify-content: center;
}
.modal-overlay.hidden { display: none; }
.modal-box {
  background: #1e293b; border-radius: 20px 20px 0 0;
  padding: 24px; width: 100%; max-width: 480px;
  border-top: 1px solid var(--border-light);
}
@media (min-width: 768px) {
  .modal-overlay { align-items: center; }
  .modal-box { border-radius: 20px; max-width: 440px; }
}
.modal-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.modal-subtitle { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
```

- [ ] **Step 5: Verify CSS compiles (no stray unclosed braces)**

Open `index.html` in Chrome. Open DevTools → Console. No CSS parse errors should appear.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/jcbru/control-stock-pro
git add index.html
git commit -m "style: add scanner, cart, and responsive CSS for v2"
```

---

## Task 3: HTML — Scanner overlay + modal markup

**Files:**
- Modify: `index.html` (HTML section, before `<script>`)

- [ ] **Step 1: Add scanner overlay HTML**

After the closing `</div>` of `.app` (around line 570, after the footer div), add:

```html
<!-- SCANNER OVERLAY -->
<div class="scanner-overlay hidden" id="scannerOverlay">
  <div class="scanner-video-wrap">
    <video id="scannerVideo" autoplay muted playsinline></video>
    <div class="scanner-corners"><span></span></div>
    <div class="scanner-line"></div>
  </div>
  <div class="scanner-status" id="scannerStatus">Apuntá la cámara al código de barras</div>
  <button class="scanner-close-btn" onclick="closeScanner()">Cancelar</button>
</div>

<!-- UNKNOWN BARCODE MODAL -->
<div class="modal-overlay hidden" id="barcodeModal">
  <div class="modal-box">
    <div class="modal-title">⚠️ Código no reconocido</div>
    <div class="modal-subtitle" id="barcodeModalCode">Barcode: —</div>
    <label class="form-label">¿A qué producto corresponde?</label>
    <div class="search-wrap" style="margin-bottom:12px;">
      <span class="search-icon">🔍</span>
      <input type="text" class="search-input" id="barcodeModalSearch"
             placeholder="Buscar producto..." oninput="onBarcodeModalSearch()">
      <div class="search-results hidden" id="barcodeModalResults"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="save-btn" id="barcodeModalAssignBtn" disabled
              onclick="assignBarcode()" style="margin:0; flex:1; padding:12px;">
        ASIGNAR
      </button>
      <button onclick="closeBarcodeModal()"
              style="flex:1; padding:12px; border-radius:12px; border:1px solid var(--border-light);
                     background:transparent; color:var(--text-muted); cursor:pointer;
                     font-family:inherit; font-size:14px; font-weight:600;">
        Cancelar
      </button>
    </div>
  </div>
</div>

<!-- CART FLOAT BUTTON (mobile only) -->
<button class="cart-float-btn hidden" id="cartFloatBtn" onclick="toggleCartDrawer()">
  🛒
  <span class="cart-badge" id="cartFloatBadge"></span>
</button>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add scanner overlay and barcode modal HTML"
```

---

## Task 4: State + Cart core functions

**Files:**
- Modify: `index.html` (`<script>` section)

- [ ] **Step 1: Extend state object and globals**

Replace the existing `state` declaration (around line 612) with:

```javascript
const state = {
  localId:      null,
  localName:    null,
  activeTab:    "registro",
  products:     [],
  responsables: [],
  categorias:   [],
  tipoSeleccionado: "Entrada",
  configLoaded: false,
  pendingItems: [],          // kept for compatibility
  // v2
  cart:            [],       // { producto, sku, cantidad, tipo, nota, unidad }
  selectedProduct: null,     // product object currently in confirm panel
  cartOpen:        false,    // mobile drawer open state
  lastResponsable: "",
};

let pendingQueue = [];
let isSyncing    = false;
let scannerReader = null;   // ZXing reader instance
let barcodeModalProduct = null; // product selected in barcode modal
let barcodeModalCode    = "";   // barcode string pending assignment
```

- [ ] **Step 2: Add cart state functions**

Add after the `state` declaration:

```javascript
// ============================================================
// CART
// ============================================================
function cartAdd(item) {
  // item: { producto, sku, cantidad, tipo, nota, unidad }
  state.cart.push(item);
  saveCartToStorage();
  updateCartUI();
  if (navigator.vibrate) navigator.vibrate(30);
}

function cartRemove(index) {
  state.cart.splice(index, 1);
  saveCartToStorage();
  updateCartUI();
}

function cartClear() {
  state.cart = [];
  saveCartToStorage();
  updateCartUI();
}

function saveCartToStorage() {
  try {
    localStorage.setItem("csp_cart_" + (state.localId || ""), JSON.stringify(state.cart));
  } catch(e) {}
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem("csp_cart_" + (state.localId || ""));
    if (saved) state.cart = JSON.parse(saved);
  } catch(e) {}
}

function updateCartUI() {
  // Badge count
  const count = state.cart.length;
  const badge = document.getElementById("cartFloatBadge");
  const floatBtn = document.getElementById("cartFloatBtn");
  const drawerEl = document.getElementById("cartDrawer");

  if (badge) {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.add("show");
      badge.classList.remove("pop");
      void badge.offsetWidth; // reflow for animation
      badge.classList.add("pop");
    } else {
      badge.classList.remove("show");
    }
  }
  if (floatBtn) floatBtn.classList.toggle("hidden", count === 0);

  // Re-render cart contents
  renderCartContents();
}

function toggleCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  state.cartOpen = !state.cartOpen;
  drawer.classList.toggle("open", state.cartOpen);
}

function openCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  state.cartOpen = true;
  drawer.classList.add("open");
}

function renderCartContents() {
  const listEl    = document.getElementById("cartItemsList");
  const saveBtn   = document.getElementById("cartSaveBtn");
  const handleTitle = document.getElementById("cartHandleTitle");
  if (!listEl) return;

  const count = state.cart.length;
  if (handleTitle) handleTitle.textContent = count > 0
    ? `🛒 Carrito (${count} producto${count !== 1 ? "s" : ""})`
    : "🛒 Carrito vacío";

  if (saveBtn) saveBtn.disabled = count === 0;

  if (count === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Agregá productos para empezar</div>`;
    return;
  }

  listEl.innerHTML = state.cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.tipo === "Entrada" ? "📥" : "📤"} ${item.producto}</div>
        <div class="cart-item-detail">${item.cantidad}${item.unidad ? " " + item.unidad : ""} · ${item.tipo}${item.nota ? " · " + item.nota : ""}</div>
      </div>
      <button class="cart-item-remove" onclick="cartRemove(${i})">✕</button>
    </div>
  `).join("");
}
```

- [ ] **Step 3: Add handleSaveAll that uses state.cart**

```javascript
function handleSaveAllCart() {
  if (state.cart.length === 0) return;

  const resp = document.getElementById("selResponsableV2")?.value || state.lastResponsable;
  if (!resp) {
    showToast("Elegí un responsable primero", "error");
    return;
  }

  const items = [...state.cart];
  cartClear();

  items.forEach(item => {
    const registro = {
      action:      "agregarRegistro",
      local:       state.localId,
      localName:   state.localName,
      responsable: resp,
      producto:    item.producto,
      cantidad:    item.cantidad,
      tipo:        item.tipo,
      nota:        item.nota || "",
      _ts:         new Date().toISOString()
    };
    guardarEnHistorialLocal(registro);
    encolarEnvio(registro);
  });

  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  showToast(`✅ ${items.length} registro${items.length !== 1 ? "s" : ""} guardado${items.length !== 1 ? "s" : ""}!`, "success");
  
  // Close drawer on mobile
  const drawer = document.getElementById("cartDrawer");
  if (drawer) { state.cartOpen = false; drawer.classList.remove("open"); }
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add cart state, storage, and UI update functions"
```

---

## Task 5: ZXing scanner integration

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add ZXing CDN script tag**

In the `<head>` section, after the `<meta>` tags and before `<style>`:

```html
<script src="https://unpkg.com/@zxing/browser@0.1.5/dist/zxing-browser.min.js"></script>
```

- [ ] **Step 2: Add scanner open/close/read functions**

Add to the `<script>` section:

```javascript
// ============================================================
// SCANNER (ZXing)
// ============================================================
async function openScanner() {
  const overlay = document.getElementById("scannerOverlay");
  const video   = document.getElementById("scannerVideo");
  const status  = document.getElementById("scannerStatus");

  if (!overlay || !video) return;
  overlay.classList.remove("hidden");
  status.textContent = "Iniciando cámara...";

  try {
    const hints = new Map();
    const formats = [
      ZXingBrowser.BarcodeFormat.EAN_13,
      ZXingBrowser.BarcodeFormat.EAN_8,
      ZXingBrowser.BarcodeFormat.CODE_128,
      ZXingBrowser.BarcodeFormat.CODE_39,
      ZXingBrowser.BarcodeFormat.QR_CODE,
    ];
    hints.set(ZXingBrowser.DecodeHintType.POSSIBLE_FORMATS, formats);

    scannerReader = new ZXingBrowser.BrowserMultiFormatReader(hints);
    status.textContent = "Apuntá la cámara al código de barras";

    await scannerReader.decodeFromVideoDevice(null, video, (result, err) => {
      if (result) {
        const code = result.getText();
        closeScanner();
        handleScannedCode(code);
      }
      // Ignore NotFoundException (no barcode in frame) — it's normal
    });
  } catch(err) {
    status.textContent = "Error de cámara: " + err.message;
    console.error("Scanner error:", err);
  }
}

function closeScanner() {
  const overlay = document.getElementById("scannerOverlay");
  if (overlay) overlay.classList.add("hidden");
  if (scannerReader) {
    try { scannerReader.reset(); } catch(e) {}
    scannerReader = null;
  }
}

function handleScannedCode(code) {
  if (!code) return;

  // Look up by SKU
  const product = state.products.find(p =>
    p.sku && p.sku.trim().toLowerCase() === code.trim().toLowerCase()
  );

  if (product) {
    showConfirmPanel(product);
  } else {
    showBarcodeModal(code);
  }
}
```

- [ ] **Step 3: Manual test — scanner**

1. Open `index.html` in Chrome on your phone (serve locally or push to Vercel)
2. Select any local
3. Tap "ESCANEAR CÓDIGO"
4. Browser should ask for camera permission
5. Camera opens with corner guides and animated scan line
6. Point at any barcode — if SKU matches a product, confirm panel should appear
7. Tap "Cancelar" — camera closes cleanly

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: integrate ZXing barcode scanner with open/close/lookup flow"
```

---

## Task 6: Product search + confirm panel

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add product search functions**

```javascript
// ============================================================
// PRODUCT SEARCH
// ============================================================
function onProductSearch() {
  const query = (document.getElementById("productSearch")?.value || "").toLowerCase().trim();
  const resultsEl = document.getElementById("searchResults");
  if (!resultsEl) return;

  if (!query) {
    resultsEl.classList.add("hidden");
    return;
  }

  const matches = state.products.filter(p =>
    p.nombre.toLowerCase().includes(query) ||
    (p.sku && p.sku.toLowerCase().includes(query)) ||
    (p.categoria && p.categoria.toLowerCase().includes(query))
  ).slice(0, 8);

  if (matches.length === 0) {
    resultsEl.innerHTML = `<div class="search-result-item" style="color:var(--text-muted)">Sin resultados para "${query}"</div>`;
  } else {
    resultsEl.innerHTML = matches.map(p => `
      <div class="search-result-item" onclick="selectSearchResult('${p.sku || ""}', '${p.nombre.replace(/'/g, "\\'")}')">
        <div>
          <div class="search-result-name">${p.nombre}</div>
          <div class="search-result-meta">${p.categoria || ""} · ${p.unidad || "u"}</div>
        </div>
        <div class="search-result-sku">${p.sku || "sin SKU"}</div>
      </div>
    `).join("");
  }
  resultsEl.classList.remove("hidden");
}

function selectSearchResult(sku, nombre) {
  const product = state.products.find(p =>
    sku ? p.sku === sku : p.nombre === nombre
  );
  if (!product) return;

  // Clear search
  const searchInput = document.getElementById("productSearch");
  const resultsEl   = document.getElementById("searchResults");
  if (searchInput) searchInput.value = "";
  if (resultsEl) resultsEl.classList.add("hidden");

  showConfirmPanel(product);
}

// Close search results when clicking outside
document.addEventListener("click", e => {
  if (!e.target.closest(".search-wrap")) {
    document.getElementById("searchResults")?.classList.add("hidden");
    document.getElementById("barcodeModalResults")?.classList.add("hidden");
  }
});
```

- [ ] **Step 2: Add confirm panel functions**

```javascript
// ============================================================
// CONFIRM PANEL
// ============================================================
function showConfirmPanel(product) {
  state.selectedProduct = product;
  const panel = document.getElementById("confirmPanel");
  if (!panel) return;

  document.getElementById("confirmProductName").textContent = product.nombre;
  document.getElementById("confirmProductMeta").textContent =
    (product.sku || "sin SKU") + " · " + (product.unidad || "u") + (product.categoria ? " · " + product.categoria : "");
  document.getElementById("confirmQty").value = "1";
  document.getElementById("confirmNota").value = "";
  updateConfirmTipoButtons();
  panel.classList.remove("hidden");
  document.getElementById("confirmQty").focus();
}

function hideConfirmPanel() {
  state.selectedProduct = null;
  document.getElementById("confirmPanel")?.classList.add("hidden");
}

function updateConfirmTipoButtons() {
  const tipo = state.tipoSeleccionado;
  const btnE = document.getElementById("confirmTipoEntrada");
  const btnS = document.getElementById("confirmTipoSalida");
  if (btnE) {
    btnE.className = "tipo-btn" + (tipo === "Entrada" ? " active-entrada" : "");
  }
  if (btnS) {
    btnS.className = "tipo-btn" + (tipo === "Salida" ? " active-salida" : "");
  }
}

function confirmQtyStep(delta) {
  const input = document.getElementById("confirmQty");
  if (!input) return;
  const current = parseFloat(input.value) || 0;
  const next = Math.max(0, current + delta);
  input.value = next % 1 === 0 ? next : next.toFixed(1);
}

function handleAddToCart() {
  const product = state.selectedProduct;
  if (!product) return;

  const cantRaw = parseFloat(document.getElementById("confirmQty")?.value) || 0;
  const nota    = document.getElementById("confirmNota")?.value.trim() || "";
  const tipo    = state.tipoSeleccionado;

  if (cantRaw <= 0) {
    showToast("Cantidad debe ser mayor a 0", "error");
    return;
  }

  // Auto-assign SKU if product has none
  const sku = product.sku || autoGenerateSku(product.nombre);
  if (!product.sku) {
    product.sku = sku;
    // Persist to Sheet in background
    persistSku(product);
  }

  cartAdd({
    producto: product.nombre,
    sku:      sku,
    cantidad: cantRaw,
    tipo:     tipo,
    nota:     nota,
    unidad:   product.unidad || "u",
  });

  showToast(`Agregado: ${product.nombre} × ${cantRaw}`, "success");
  hideConfirmPanel();
  // On tablet/PC, open cart automatically
  if (window.innerWidth >= 768) openCartDrawer();
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add product search autocomplete and confirm panel logic"
```

---

## Task 7: Auto-SKU generation + barcode assignment modal

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add auto-SKU generation**

```javascript
// ============================================================
// SKU AUTO-GENERATION
// ============================================================
function autoGenerateSku(productName) {
  // Find highest existing CSP-XXX number
  const existing = state.products
    .map(p => p.sku || "")
    .filter(s => /^CSP-\d+$/.test(s))
    .map(s => parseInt(s.replace("CSP-", ""), 10));
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return "CSP-" + String(max + 1).padStart(3, "0");
}

async function persistSku(product) {
  if (!product.sku || !product.nombre || !state.localId) return;
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode:   "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action:   "actualizarSKU",
        local:    state.localId,
        sku:      product.sku,
        producto: product.nombre,
      })
    });
    // Update in cache
    const cacheKey = "csp_config_" + state.localId;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "{}");
      if (cached.productos && cached.productos[state.localId]) {
        const p = cached.productos[state.localId].find(cp => cp.nombre === product.nombre);
        if (p) p.sku = product.sku;
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      }
    } catch(e) {}
  } catch(err) {
    console.warn("persistSku failed (will retry):", err);
  }
}
```

- [ ] **Step 2: Add barcode modal functions**

```javascript
// ============================================================
// BARCODE MODAL (unknown barcode assignment)
// ============================================================
function showBarcodeModal(code) {
  barcodeModalCode    = code;
  barcodeModalProduct = null;
  document.getElementById("barcodeModalCode").textContent = "Código: " + code;
  document.getElementById("barcodeModalSearch").value = "";
  document.getElementById("barcodeModalResults").classList.add("hidden");
  document.getElementById("barcodeModalAssignBtn").disabled = true;
  document.getElementById("barcodeModal").classList.remove("hidden");
}

function closeBarcodeModal() {
  barcodeModalCode    = "";
  barcodeModalProduct = null;
  document.getElementById("barcodeModal").classList.add("hidden");
}

function onBarcodeModalSearch() {
  const query = (document.getElementById("barcodeModalSearch")?.value || "").toLowerCase().trim();
  const resultsEl = document.getElementById("barcodeModalResults");
  if (!resultsEl) return;

  if (!query) {
    resultsEl.classList.add("hidden");
    return;
  }

  const matches = state.products.filter(p =>
    p.nombre.toLowerCase().includes(query)
  ).slice(0, 6);

  resultsEl.innerHTML = matches.map(p => `
    <div class="search-result-item" onclick="selectBarcodeProduct('${p.sku || ""}','${p.nombre.replace(/'/g, "\\'")}')">
      <div>
        <div class="search-result-name">${p.nombre}</div>
        <div class="search-result-meta">${p.categoria || ""}</div>
      </div>
    </div>
  `).join("");
  resultsEl.classList.remove("hidden");
}

function selectBarcodeProduct(sku, nombre) {
  barcodeModalProduct = state.products.find(p =>
    sku ? p.sku === sku : p.nombre === nombre
  ) || { nombre, sku };
  document.getElementById("barcodeModalSearch").value = nombre;
  document.getElementById("barcodeModalResults").classList.add("hidden");
  document.getElementById("barcodeModalAssignBtn").disabled = false;
}

async function assignBarcode() {
  if (!barcodeModalProduct || !barcodeModalCode) return;

  const btn = document.getElementById("barcodeModalAssignBtn");
  if (btn) btn.disabled = true;

  barcodeModalProduct.sku = barcodeModalCode;
  // Update state.products
  const p = state.products.find(cp => cp.nombre === barcodeModalProduct.nombre);
  if (p) p.sku = barcodeModalCode;

  await persistSku(barcodeModalProduct);

  showToast(`✅ ${barcodeModalCode} asignado a ${barcodeModalProduct.nombre}`, "success");
  closeBarcodeModal();

  // Show product in confirm panel
  const product = state.products.find(cp => cp.nombre === barcodeModalProduct.nombre);
  if (product) showConfirmPanel(product);
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add auto-SKU generation and unknown barcode assignment modal"
```

---

## Task 8: New renderRegistro — wire everything together

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace `renderRegistro` with v2 version**

Find the existing `renderRegistro()` function (around line 783) and replace it entirely with:

```javascript
function renderRegistro() {
  if (!state.localId) return;
  const savedResp = document.getElementById("selResponsableV2")?.value || state.lastResponsable || "";

  const responsableHtml = state.configLoaded
    ? `<select class="form-select" id="selResponsableV2"
         onchange="state.lastResponsable=this.value" style="margin-bottom:0">
         <option value="">Seleccionar responsable...</option>
         ${state.responsables.map(r => `<option value="${r}" ${r === savedResp ? "selected" : ""}>${r}</option>`).join("")}
       </select>`
    : `<div class="skeleton" style="height:48px; border-radius:12px;"></div>`;

  document.getElementById("tabRegistro").innerHTML = `
    <div class="registro-v2-layout">

      <!-- MAIN COLUMN -->
      <div class="registro-v2-main">

        <!-- Responsable -->
        <div class="card" style="margin:0 0 12px; padding:14px 16px;">
          <label class="form-label" style="margin-bottom:8px;">Responsable</label>
          ${responsableHtml}
        </div>

        <!-- Tipo movimiento -->
        <div class="card" style="margin:0 0 12px; padding:14px 16px;">
          <label class="form-label" style="margin-bottom:8px;">Tipo de Movimiento</label>
          <div class="tipo-row" style="margin:0">
            <button type="button" class="tipo-btn ${state.tipoSeleccionado === "Entrada" ? "active-entrada" : ""}"
                    id="confirmTipoEntrada"
                    onclick="seleccionarTipo('Entrada')">📥 Entrada</button>
            <button type="button" class="tipo-btn ${state.tipoSeleccionado === "Salida" ? "active-salida" : ""}"
                    id="confirmTipoSalida"
                    onclick="seleccionarTipo('Salida')">📤 Salida</button>
          </div>
        </div>

        <!-- Scan button -->
        <button class="scan-btn" onclick="openScanner()">
          <span class="scan-btn-icon">📷</span>
          ESCANEAR CÓDIGO DE BARRAS
        </button>

        <!-- Search -->
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="productSearch"
                 placeholder="Buscar producto por nombre o SKU..."
                 oninput="onProductSearch()" autocomplete="off">
          <div class="search-results hidden" id="searchResults"></div>
        </div>

        <!-- Confirm panel (hidden until product selected) -->
        <div class="confirm-panel hidden" id="confirmPanel">
          <div class="confirm-product-name" id="confirmProductName">—</div>
          <div class="confirm-product-meta" id="confirmProductMeta">—</div>
          <div class="qty-row">
            <button class="qty-btn" onclick="confirmQtyStep(-1)">−</button>
            <input type="number" class="qty-input" id="confirmQty"
                   value="1" min="0" step="0.5" oninput="">
            <button class="qty-btn" onclick="confirmQtyStep(1)">+</button>
          </div>
          <input type="text" class="form-input" id="confirmNota"
                 placeholder="Nota (opcional)..." style="margin-bottom:12px;">
          <button class="add-to-cart-btn" onclick="handleAddToCart()">
            ✓ AGREGAR AL CARRITO
          </button>
          <button onclick="hideConfirmPanel()"
                  style="width:100%; margin-top:8px; padding:10px; background:none;
                         border:1px solid var(--border); border-radius:10px; color:var(--text-muted);
                         cursor:pointer; font-family:inherit; font-size:13px;">
            Cancelar
          </button>
        </div>

      </div>

      <!-- CART COLUMN (tablet/PC side panel) -->
      <div class="registro-v2-cart" id="cartColumn">
        <div class="cart-drawer" id="cartDrawer">
          <div class="cart-drawer-handle" onclick="toggleCartDrawer()">
            <div class="cart-drawer-handle-bar"></div>
            <span class="cart-handle-title" id="cartHandleTitle">🛒 Carrito vacío</span>
            <span class="cart-handle-count" id="cartHandleCount"></span>
          </div>
          <div class="cart-items-list" id="cartItemsList"></div>
          <button class="cart-save-btn" id="cartSaveBtn" disabled onclick="handleSaveAllCart()">
            GUARDAR TODO
          </button>
        </div>
      </div>

    </div>
  `;

  // Restore responsable
  if (savedResp) {
    const sel = document.getElementById("selResponsableV2");
    if (sel && !sel.value) sel.value = savedResp;
  }

  updateCartUI();
}
```

- [ ] **Step 2: Update `seleccionarTipo` to refresh confirm panel buttons**

Find existing `seleccionarTipo` function and replace:

```javascript
function seleccionarTipo(tipo) {
  state.tipoSeleccionado = tipo;
  document.querySelectorAll(".tipo-btn").forEach(b => {
    b.className = "tipo-btn";
    if (b.textContent.includes("Entrada") && tipo === "Entrada") b.classList.add("active-entrada");
    if (b.textContent.includes("Salida")  && tipo === "Salida")  b.classList.add("active-salida");
  });
}
```

- [ ] **Step 3: Update `selectLocal` to call `loadCartFromStorage`**

In `selectLocal` function (around line 752), add `loadCartFromStorage();` after `state.products = [];`:

```javascript
  state.cart = [];
  loadCartFromStorage();
```

- [ ] **Step 4: Manual test — full flow**

1. Open app in browser (Chrome)
2. Select a local (e.g. Umo Grill) — registration tab should show new layout with scan button + search
3. Search "har" — should show products containing "har" in dropdown
4. Click a product — confirm panel appears with name, qty controls
5. Tap "AGREGAR AL CARRITO" — panel hides, cart badge appears, toast shows
6. Add 2 more products — cart shows 3 items
7. On mobile: tap cart float button — bottom drawer slides up showing items
8. Tap "GUARDAR TODO" — all sent, cart clears, success toast

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: wire v2 renderRegistro with scanner, search, confirm panel, and cart"
```

---

## Task 9: Polish + final wiring

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add ZXing namespace safety check on init**

In `DOMContentLoaded` handler, add before `initLocalGrid()`:

```javascript
  // ZXing namespace alias (library exports as ZXingBrowser on window)
  if (typeof ZXingBrowser === "undefined" && typeof ZXing !== "undefined") {
    window.ZXingBrowser = ZXing;
  }
```

- [ ] **Step 2: Add cart float button to HTML outside .app**

Verify the cart float button HTML (from Task 3) is placed **outside** `.registro-v2-layout` but inside `.app`. It should already be there from Task 3. Confirm `id="cartFloatBtn"` exists.

- [ ] **Step 3: Update `ESTADO_PROYECTO.md`**

Update the version line to:

```markdown
**Fecha de último estado funcional:** 03/05/2026  
**Estado:** ✅ FUNCIONANDO — v2 Scanner+Cart
```

Add to the `Acciones disponibles (doPost)` table:

```markdown
| `actualizarSKU` | Asigna/actualiza el SKU de un producto en el catálogo |
```

- [ ] **Step 4: Push to Vercel (auto-deploy)**

```bash
cd /c/Users/jcbru/control-stock-pro
git add .
git commit -m "chore: update project state docs for v2"
git push origin main
```

Vercel auto-deploys. Verify at https://control-stock-pro.vercel.app after ~30s.

- [ ] **Step 5: Smoke test on real devices**

**iPhone:**
- [ ] App loads, dark theme renders correctly
- [ ] Scan button opens camera
- [ ] Search finds products
- [ ] Cart bottom drawer opens/closes
- [ ] Guardar todo sends to Sheets (check Telegram notification)

**iPad:**
- [ ] Two-column layout (scan left, cart right)
- [ ] Cart always visible alongside scanner

**PC (Chrome):**
- [ ] Search focused by default
- [ ] Cart panel fixed right
- [ ] Keyboard navigation works (tab through fields)

---

## Self-Review

**Spec coverage:**
- ✅ Barcode scanning (ZXing) — Tasks 5
- ✅ Cart-based multi-product flow — Tasks 4, 6, 8
- ✅ Unknown barcode auto-assign → Sheets sync — Tasks 7
- ✅ Auto-generate SKU for no-SKU products — Tasks 7
- ✅ Responsive layout (mobile/tablet/PC) — Tasks 2, 8
- ✅ Speed: skeleton loading in renderRegistro, cart persists through reload — Tasks 4, 8
- ✅ actualizarSKU Apps Script action — Task 1
- ✅ getProducts includes no-SKU products — Task 1
- ✅ Existing tabs (Historial/Stats/Config) untouched — confirmed, only renderRegistro replaced

**Placeholder scan:** None found.

**Type consistency:**
- `cartAdd`, `cartRemove`, `cartClear` defined in Task 4, called in Tasks 4 and 6 ✅
- `showConfirmPanel(product)` defined Task 6, called Tasks 6 and 7 ✅
- `state.cart` initialized in Task 4 state declaration, used throughout ✅
- `barcodeModalProduct`, `barcodeModalCode` globals defined Task 4, used Task 7 ✅
- `persistSku(product)` defined Task 7, called Tasks 6 and 7 ✅
