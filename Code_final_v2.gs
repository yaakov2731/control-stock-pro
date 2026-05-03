/**
 * CONTROL STOCK PRO — Google Apps Script Backend v3.1
 * Docks del Puerto • Tigre
 *
 * ESTRUCTURA DE LA PLANILLA (real):
 * ─ Pestañas por local: UmoGrill, PuertoGelato, Brooklyn, TrentoCafe, Eventos, Shopping
 *   - Fila 1: Título del local (merge)
 *   - Fila 2: Subtítulos (CATÁLOGO / REGISTRO)
 *   - Fila 3: Headers (A=SKU, B=PRODUCTO, C=CATEGORÍA, D=UNIDAD, E=MÍNIMO, F=ACTIVO | H=FECHA, I=HORA, J=RESPONSABLE, K=SKU, L=PRODUCTO, M=STOCK, N=NOTA)
 *   - Fila 4+: Datos
 *
 * ─ Pestaña Config:
 *   - A:B = Responsables (LOCAL ID, RESPONSABLE) desde fila 5
 *   - D:E = Categorías (LOCAL ID, CATEGORÍA) desde fila 5
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Pegá este código en https://script.google.com/ (proyecto vinculado a la planilla)
 * 2. Menú → Implementar → Nueva implementación
 * 3. Tipo: Aplicación web | Ejecutar como: Yo | Acceso: Cualquiera
 * 4. Implementar → copiar la URL /exec
 * 5. Pegar la URL en index.html como valor de SCRIPT_URL
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const TELEGRAM_BOT_TOKEN = "8667407358:AAF9VdTQ9IMffKDFbvLPw-2cCqmED-OgzpE";
const TELEGRAM_CHAT_ID   = "7259177758";
const EMAIL_NOTIFICACION = "yaakovrubi@gmail.com";

// Mapeo: localId (frontend) → nombre exacto de pestaña en Sheets
const LOCAL_MAP = {
  "umo":      "UmoGrill",
  "gelato":   "PuertoGelato",
  "brooklyn": "Brooklyn",
  "trento":   "TrentoCafe",
  "eventos":  "Eventos",
  "shopping": "Shopping"
};

const LOCAL_NAMES = {
  "umo":      "Umo Grill",
  "gelato":   "Puerto Gelato",
  "brooklyn": "Brooklyn",
  "trento":   "Trento Cafe",
  "eventos":  "Eventos",
  "shopping": "Shopping"
};

// ============================================================
// HANDLERS PRINCIPALES
// ============================================================
function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action || "";
    let result   = { ok: true };

    switch(action) {
      case "agregarRegistro":
        result = agregarRegistro(data.local, data.responsable, data.producto, data.cantidad, data.tipo, data.nota || "");
        break;
      case "getConfig":
        result = getConfig(data.localId || data.local || "");
        break;
      case "getProducts":
        result = getProducts(data.localId || data.local || "");
        break;
      case "addConfig":
        result = addConfigItem(data.localId, data.tipo, data.valor);
        break;
      case "removeConfig":
        result = removeConfigItem(data.localId, data.tipo, data.valor);
        break;
      case "addProduct":
        result = addProduct(data.localId, typeof data.product === "string" ? JSON.parse(data.product) : data.product);
        break;
      case "removeProduct":
        result = removeProduct(data.localId, data.sku);
        break;
      case "actualizarSKU":
        result = actualizarSKU(data.localId || data.local, data.sku, data.producto);
        break;
      default:
        result = { ok: true, action: action, version: "3.1" };
    }

    output.setContent(JSON.stringify(result));
  } catch(err) {
    Logger.log("doPost error: " + err.toString());
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || "";
    let result   = { ok: true };

    switch(action) {
      case "getConfig":
        result = getConfig(e.parameter.localId || e.parameter.local || "");
        break;
      case "getProducts":
        result = getProducts(e.parameter.localId || e.parameter.local || "");
        break;
      case "getHistory":
        result = { history: getHistory(e.parameter.local, parseInt(e.parameter.limit) || 50) };
        break;
      case "addConfig":
        result = addConfigItem(e.parameter.localId, e.parameter.tipo, e.parameter.valor);
        break;
      case "removeConfig":
        result = removeConfigItem(e.parameter.localId, e.parameter.tipo, e.parameter.valor);
        break;
      case "addProduct":
        result = addProduct(e.parameter.localId, JSON.parse(e.parameter.product || "{}"));
        break;
      case "removeProduct":
        result = removeProduct(e.parameter.localId, e.parameter.sku);
        break;
      case "ping":
        result = { status: "online", version: "3.1", locales: Object.keys(LOCAL_MAP) };
        break;
      default:
        result = { ok: true, version: "3.1" };
    }

    output.setContent(JSON.stringify(result));
  } catch(err) {
    Logger.log("doGet error: " + err.toString());
    output.setContent(JSON.stringify({ error: err.toString() }));
  }

  return output;
}

// ============================================================
// LEER PRODUCTOS DEL CATÁLOGO (columnas A-F, desde fila 4)
// ============================================================
function getProducts(localId) {
  try {
    const sheetName = LOCAL_MAP[localId];
    if (!sheetName) return { products: [], error: "Local no válido: " + localId };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { products: [], error: "Pestaña no encontrada: " + sheetName };

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return { products: [] };

    const data = sheet.getRange(4, 1, lastRow - 3, 6).getValues();
    const products = data
      .filter(r => r[1] && String(r[1]).trim())   // solo requiere nombre
      .map(r => ({
        sku:      String(r[0] || "").trim(),       // puede ser vacío
        nombre:   String(r[1]).trim(),
        producto: String(r[1]).trim(),
        categoria: String(r[2]).trim(),
        unidad:   String(r[3] || "u").trim(),
        minimo:   Number(r[4]) || 0,
        activo:   String(r[5]).toLowerCase() !== "false"
      }))
      .filter(p => p.activo !== false);

    return { products };
  } catch(err) {
    Logger.log("getProducts error: " + err);
    return { products: [], error: err.toString() };
  }
}

// ============================================================
// LEER CONFIG (responsables A:B + categorías D:E desde fila 5)
// ============================================================
function getConfig(localId) {
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName("Config");

  const result = {
    responsables: {},
    categorias:   {},
    productos:    {}
  };

  if (!configSheet) return result;

  try {
    // Responsables (A:B desde fila 5)
    const respValues = configSheet.getRange("A5:B100").getValues();
    respValues.forEach(row => {
      if (!row[0] || !row[1]) return;
      const lid  = String(row[0]).toLowerCase().trim();
      const resp = String(row[1]).trim();
      if (!result.responsables[lid]) result.responsables[lid] = [];
      if (!result.responsables[lid].includes(resp)) result.responsables[lid].push(resp);
    });
  } catch(e) { Logger.log("Error responsables: " + e); }

  try {
    // Categorías (D:E desde fila 5)
    const catValues = configSheet.getRange("D5:E100").getValues();
    catValues.forEach(row => {
      if (!row[0] || !row[1]) return;
      const lid = String(row[0]).toLowerCase().trim();
      const cat = String(row[1]).trim();
      if (!result.categorias[lid]) result.categorias[lid] = [];
      if (!result.categorias[lid].includes(cat)) result.categorias[lid].push(cat);
    });
  } catch(e) { Logger.log("Error categorías: " + e); }

  // Productos: leer desde la pestaña de cada local (catálogo A-F)
  const localIds = localId ? [localId] : Object.keys(LOCAL_MAP);
  localIds.forEach(lid => {
    const prodResult = getProducts(lid);
    if (prodResult.products && prodResult.products.length > 0) {
      result.productos[lid] = prodResult.products.map(p => ({
        sku:       p.sku,
        nombre:    p.nombre,
        categoria: p.categoria,
        unidad:    p.unidad
      }));
    }
  });

  return result;
}

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

// ============================================================
// LEER HISTORIAL (columnas H-N, desde fila 4)
// H=FECHA, I=HORA, J=RESPONSABLE, K=SKU, L=PRODUCTO, M=STOCK, N=NOTA
// ============================================================
function getHistory(localId, limit) {
  try {
    const sheetName = LOCAL_MAP[localId];
    if (!sheetName) return [];

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return [];

    const data = sheet.getRange(4, 8, lastRow - 3, 7).getValues();
    return data
      .filter(r => r[0] && String(r[0]).trim())
      .reverse()
      .slice(0, limit || 50)
      .map(r => ({
        fecha:       String(r[0]),
        hora:        String(r[1]),
        responsable: String(r[2]),
        sku:         String(r[3]),
        producto:    String(r[4]),
        stock:       Number(r[5]) || 0,
        nota:        String(r[6] || "")
      }));
  } catch(err) {
    Logger.log("getHistory error: " + err);
    return [];
  }
}

// ============================================================
// AGREGAR REGISTRO DE STOCK
// Escribe en columnas H-N (historial), fila 4+
// H=FECHA, I=HORA, J=RESPONSABLE, K=SKU, L=PRODUCTO, M=STOCK, N=NOTA
// ============================================================
function agregarRegistro(localId, responsable, producto, cantidad, tipo, nota) {
  try {
    const sheetName = LOCAL_MAP[localId];
    if (!sheetName) {
      Logger.log("Local no válido: " + localId);
      return { error: "Local no válido: " + localId };
    }

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Pestaña no encontrada: " + sheetName);
      return { error: "Pestaña no encontrada: " + sheetName };
    }

    // Encontrar próxima fila vacía en columna H (historial)
    const lastRow = sheet.getLastRow();
    const colH    = sheet.getRange("H4:H" + Math.max(lastRow + 5, 10)).getValues();
    let nextRow   = 4;
    for (let i = 0; i < colH.length; i++) {
      if (colH[i][0] === "" || colH[i][0] === null) {
        nextRow = i + 4;
        break;
      }
      nextRow = i + 5;
    }

    const now   = new Date();
    const fecha = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
    const hora  = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm");

    // Buscar SKU del producto en el catálogo
    const prodResult = getProducts(localId);
    const prod       = (prodResult.products || []).find(p =>
      p.nombre === producto || p.sku === producto || p.producto === producto
    );
    const sku = prod ? prod.sku : "";

    // Calcular stock: cantidad positiva para entrada, negativa para salida
    const stockValue = tipo === "Salida" ? -Math.abs(Number(cantidad)) : Math.abs(Number(cantidad));

    // Escribir en H-N
    sheet.getRange(nextRow, 8, 1, 7).setValues([[
      fecha,
      hora,
      responsable || "",
      sku,
      producto    || "",
      stockValue,
      nota        || ""
    ]]);

    // Obtener mínimo del producto para el mensaje de Telegram
    const minimoProducto = prod ? (prod.minimo || 0) : 0;

    // Enviar notificaciones en background (no bloquea)
    try {
      const unidadProducto = prod ? (prod.unidad || "") : "";
      enviarNotificaciones(localId, responsable, producto, cantidad, tipo, nota, sku, stockValue, minimoProducto, unidadProducto);
    } catch(e) { Logger.log("Notif error: " + e); }

    return {
      success:    true,
      local:      localId,
      sheetName:  sheetName,
      row:        nextRow,
      fecha:      fecha,
      hora:       hora,
      sku:        sku,
      producto:   producto,
      stock:      stockValue,
      tipo:       tipo
    };

  } catch(err) {
    Logger.log("agregarRegistro error: " + err.toString());
    return { error: err.toString() };
  }
}

// ============================================================
// GESTIÓN DE CONFIGURACIÓN
// ============================================================
function addConfigItem(localId, tipo, valor) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Config");
    if (!sheet) return { error: "Hoja Config no encontrada" };

    if (tipo === "responsable") {
      const nextRow = getNextEmptyInColumn(sheet, "A", 5);
      sheet.getRange(nextRow, 1, 1, 2).setValues([[localId, valor]]);
    } else if (tipo === "categoria") {
      const nextRow = getNextEmptyInColumn(sheet, "D", 5);
      sheet.getRange(nextRow, 4, 1, 2).setValues([[localId, valor]]);
    }

    return { ok: true };
  } catch(e) {
    return { error: e.toString() };
  }
}

function removeConfigItem(localId, tipo, valor) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Config");
    if (!sheet) return { error: "Hoja Config no encontrada" };

    if (tipo === "responsable") {
      const data = sheet.getRange("A5:B100").getValues();
      for (let i = data.length - 1; i >= 0; i--) {
        if (String(data[i][0]).toLowerCase() === String(localId).toLowerCase() &&
            String(data[i][1]) === String(valor)) {
          sheet.deleteRow(i + 5);
          return { ok: true };
        }
      }
    } else if (tipo === "categoria") {
      const data = sheet.getRange("D5:E100").getValues();
      for (let i = data.length - 1; i >= 0; i--) {
        if (String(data[i][0]).toLowerCase() === String(localId).toLowerCase() &&
            String(data[i][1]) === String(valor)) {
          sheet.deleteRow(i + 5);
          return { ok: true };
        }
      }
    }

    return { ok: true };
  } catch(e) {
    return { error: e.toString() };
  }
}

function addProduct(localId, product) {
  try {
    const sheetName = LOCAL_MAP[localId];
    if (!sheetName) return { error: "Local no válido" };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { error: "Pestaña no encontrada: " + sheetName };

    // Encontrar próxima fila vacía en columna A (catálogo)
    const lastRow = sheet.getLastRow();
    const colA    = sheet.getRange("A4:A" + Math.max(lastRow + 5, 10)).getValues();
    let nextRow   = 4;
    for (let i = 0; i < colA.length; i++) {
      if (colA[i][0] === "" || colA[i][0] === null) {
        nextRow = i + 4;
        break;
      }
      nextRow = i + 5;
    }

    // Generar SKU automático
    const prefix = { umo: "UMO", gelato: "GEL", brooklyn: "BRO", trento: "TRE", eventos: "EVE", shopping: "SHP" }[localId] || "SKU";
    const sku    = product.sku || (prefix + "-" + String(nextRow - 3).padStart(3, "0"));

    sheet.getRange(nextRow, 1, 1, 6).setValues([[
      sku,
      product.producto || product.nombre || "",
      product.categoria || "",
      product.unidad || "u",
      Number(product.minimo) || 0,
      true
    ]]);

    return { ok: true, sku: sku };
  } catch(e) {
    return { error: e.toString() };
  }
}

function removeProduct(localId, sku) {
  try {
    const sheetName = LOCAL_MAP[localId];
    if (!sheetName) return { error: "Local no válido" };

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { error: "Pestaña no encontrada" };

    const lastRow = sheet.getLastRow();
    if (lastRow < 4) return { ok: true };

    const skus = sheet.getRange("A4:A" + lastRow).getValues();
    for (let i = skus.length - 1; i >= 0; i--) {
      if (String(skus[i][0]).trim() === String(sku).trim()) {
        sheet.deleteRow(i + 4);
        return { ok: true };
      }
    }

    // Si no encontró por SKU, buscar por nombre (columna B)
    const nombres = sheet.getRange("B4:B" + lastRow).getValues();
    for (let i = nombres.length - 1; i >= 0; i--) {
      if (String(nombres[i][0]).trim() === String(sku).trim()) {
        sheet.deleteRow(i + 4);
        return { ok: true };
      }
    }

    return { ok: true };
  } catch(e) {
    return { error: e.toString() };
  }
}

// ============================================================
// NOTIFICACIONES
// ============================================================
function enviarNotificaciones(localId, responsable, producto, cantidad, tipo, nota, sku, stockValue, minimo, unidad) {
  const localName = LOCAL_NAMES[localId] || localId;
  const now       = new Date();
  const fechaHora = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  // Determinar estado vs mínimo
  const minimoNum = Number(minimo) || 0;
  const stockNum  = Number(stockValue) || Number(cantidad) || 0;
  const estadoMin = minimoNum > 0 && stockNum < minimoNum ? "⚠️ BAJO MÍNIMO" : "✅ OK";

  // Formato exacto solicitado
  const emoji = tipo === "Entrada" ? "📥" : "📤";
  const skuStr = sku ? " (" + sku + ")" : "";
  const mensaje =
    emoji + " Registro de stock\n" +
    "🏪 Local: " + localName + "\n" +
    "📦 Producto: " + producto + skuStr + "\n" +
    "🔢 Stock: " + stockNum + (unidad ? " " + unidad : "") + "\n" +
    "📉 Mínimo: " + minimoNum + (unidad ? " " + unidad : "") + " • " + estadoMin + "\n" +
    "👤 Responsable: " + responsable + "\n" +
    "🕒 Fecha: " + fechaHora;

  try {
    const resp = UrlFetchApp.fetch(
      "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage",
      {
        method:             "post",
        payload:            JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: mensaje }),
        contentType:        "application/json",
        muteHttpExceptions: true
      }
    );
    const body = resp.getContentText();
    if (resp.getResponseCode() !== 200) {
      Logger.log("Telegram error HTTP " + resp.getResponseCode() + ": " + body);
    }
  } catch(e) { Logger.log("Telegram error: " + e); }
}

// ============================================================
// HELPER
// ============================================================
function getNextEmptyInColumn(sheet, col, startRow) {
  const values = sheet.getRange(col + startRow + ":" + col + "200").getValues();
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0] || String(values[i][0]).trim() === "") return i + startRow;
  }
  return startRow + values.length;
}

// ============================================================
// TEST — Ejecutar desde el editor para verificar Telegram
// ============================================================
function testTelegram() {
  enviarNotificaciones(
    "trento",           // localId
    "Angie",            // responsable
    "Azúcar x10kg",     // producto
    10,                 // cantidad
    "Entrada",          // tipo
    "TEST desde editor",// nota
    "trento-almacen-azucar-10-k", // sku
    10,                 // stockValue
    5                   // minimo
  );
  Logger.log("Telegram enviado OK");
}
