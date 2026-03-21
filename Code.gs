// CONTROL STOCK PRO — Google Apps Script Backend v2.1 MEJORADO
// Docks del Puerto • Tigre
// ============================================================
// MEJORAS: SKU automático, Config separada, Excel import/export
// ============================================================

// ============================================================
// ⚙️ CONFIGURACIÓN — EDITAR ESTOS VALORES
// ============================================================

// Telegram Bot
const TELEGRAM_BOT_TOKEN = "PEGAR_TU_BOT_TOKEN";
const TELEGRAM_CHAT_ID   = "PEGAR_TU_CHAT_ID";

// Email
const NOTIFY_EMAILS = "jacobo@tumail.com";

// Activar/desactivar notificaciones
const NOTIFY_EMAIL_ON    = true;
const NOTIFY_TELEGRAM_ON = true;

// Umbral: notificar solo si stock está bajo mínimo
const NOTIFY_ONLY_CRITICAL = false;

// ============================================================
// CONSTANTES
// ============================================================
const LOCALES = {
  "umo": "UmoGrill",
  "gelato": "PuertoGelato",
  "brooklyn": "Brooklyn",
  "trento": "TrentoCafe",
  "eventos": "Eventos",
  "shopping": "Shopping"
};

const LOCAL_NAMES = {
  "umo": "Umo Grill",
  "gelato": "Puerto Gelato",
  "brooklyn": "Brooklyn",
  "trento": "Trento Cafe",
  "eventos": "Eventos",
  "shopping": "Shopping"
};

// Prefijos para SKU automático
const SKU_PREFIXES = {
  "umo": "UMO",
  "gelato": "GEL",
  "brooklyn": "BRO",
  "trento": "TRE",
  "eventos": "EVE",
  "shopping": "SHP"
};

const CONFIG_SHEET = "Config";
const DASHBOARD_SHEET = "Dashboard";

// Paleta de colores corporativa (Google-inspired)
const COLORS = {
  primary:    "#1e40af",
  primaryLight: "#3b82f6",
  primaryDark: "#1e3a8a",
  secondary:  "#0f766e",
  secondaryLight: "#14b8a6",
  success:    "#16a34a",
  successDark:"#15803d",
  danger:     "#dc2626",
  dangerDark: "#b91c1c",
  warning:    "#ea580c",
  
  navyDark:   "#0a0f1c",
  navy:       "#111827",
  navyMid:    "#1a2236",
  white:      "#ffffff",
  lightGray:  "#f1f5f9",
  medGray:    "#94a3b8",
  darkGray:   "#374151",
  headerBg:   "#0f172a",
  prodHeaderBg: "#1e3a5f",
  logHeaderBg:  "#7f1d1d",
  configHeaderBg: "#312e81",
  rowEven:    "#f8fafc",
  rowOdd:     "#ffffff",
  borderColor:"#e2e8f0",
};

// ============================================================
// 🎨 FUNCIÓN: CREAR ESTRUCTURA PROFESIONAL v2
// Ejecutar UNA SOLA VEZ
// ============================================================
function crearEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ── Crear hojas por local ──
  Object.entries(LOCALES).forEach(([localId, sheetName]) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
      sheet.clearFormats();
    }
    
    formatLocalSheet(sheet, sheetName, localId);
  });
  
  // ── Crear hoja Config (NUEVA ESTRUCTURA) ──
  let configSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG_SHEET);
  } else {
    configSheet.clear();
    configSheet.clearFormats();
  }
  formatConfigSheetV2(configSheet);
  
  // ── Crear hoja Dashboard ──
  let dashSheet = ss.getSheetByName(DASHBOARD_SHEET);
  if (!dashSheet) {
    dashSheet = ss.insertSheet(DASHBOARD_SHEET);
  } else {
    dashSheet.clear();
    dashSheet.clearFormats();
  }
  formatDashboardSheet(dashSheet);
  
  // Mover Dashboard al inicio
  ss.setActiveSheet(dashSheet);
  ss.moveActiveSheet(1);
  
  // Eliminar Sheet1/Hoja 1 si existe
  const sheet1 = ss.getSheetByName("Hoja 1") || ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch(e) {}
  }
  
  SpreadsheetApp.getUi().alert("✅ Estructura PRO v2 creada con éxito.\n\nAhora ejecutá 'cargarDatosDemo' para cargar productos de ejemplo.");
}

// ============================================================
// FORMATEAR HOJA DE LOCAL
// ============================================================
function formatLocalSheet(sheet, sheetName, localId) {
  const localName = LOCAL_NAMES[localId] || sheetName;
  
  // ── Título del local (fila 1, merge A1:N1) ──
  sheet.getRange("A1:N1").merge()
    .setValue("📦 STOCK — " + localName.toUpperCase())
    .setFontSize(16).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.navyDark)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 45);
  
  // ── Subtítulo PRODUCTOS (fila 2, A2:F2) ──
  sheet.getRange("A2:F2").merge()
    .setValue("CATÁLOGO DE PRODUCTOS")
    .setFontSize(10).setFontWeight("bold").setFontColor(COLORS.primaryLight)
    .setBackground(COLORS.navy)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(2, 28);
  
  // ── Headers Products (fila 3) ──
  const prodHeaders = ["SKU", "PRODUCTO", "CATEGORÍA", "UNIDAD", "MÍNIMO", "ACTIVO"];
  sheet.getRange("A3:F3").setValues([prodHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.prodHeaderBg)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.primary, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(3, 30);
  
  // ── Anchos de columnas Products ──
  sheet.setColumnWidth(1, 100);  // SKU
  sheet.setColumnWidth(2, 180);  // Producto
  sheet.setColumnWidth(3, 130);  // Categoría
  sheet.setColumnWidth(4, 70);   // Unidad
  sheet.setColumnWidth(5, 80);   // Mínimo
  sheet.setColumnWidth(6, 70);   // Activo
  
  // ── Columna G = separador ──
  sheet.setColumnWidth(7, 8);
  sheet.getRange("G1:G500").setBackground(COLORS.primary);
  
  // ── Subtítulo STOCKLOG (fila 2, H2:N2) ──
  sheet.getRange("H2:N2").merge()
    .setValue("REGISTRO DE STOCK (HISTORIAL)")
    .setFontSize(10).setFontWeight("bold").setFontColor(COLORS.danger)
    .setBackground(COLORS.navy)
    .setHorizontalAlignment("center");
  
  // ── Headers StockLog (fila 3) ──
  const logHeaders = ["FECHA", "HORA", "RESPONSABLE", "SKU", "PRODUCTO", "STOCK", "NOTA"];
  sheet.getRange("H3:N3").setValues([logHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.logHeaderBg)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.danger, SpreadsheetApp.BorderStyle.SOLID);
  
  // ── Anchos de columnas StockLog ──
  sheet.setColumnWidth(8, 100);   // Fecha
  sheet.setColumnWidth(9, 60);    // Hora
  sheet.setColumnWidth(10, 120);  // Responsable
  sheet.setColumnWidth(11, 90);   // SKU
  sheet.setColumnWidth(12, 160);  // Producto
  sheet.setColumnWidth(13, 70);   // Stock
  sheet.setColumnWidth(14, 160);  // Nota
  
  // ── Formato de datos (filas 4-100) ──
  for (let r = 4; r <= 100; r++) {
    const bg = (r % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
    sheet.getRange(r, 1, 1, 6).setBackground(bg)
      .setFontSize(10).setVerticalAlignment("middle")
      .setBorder(false, false, true, false, false, false, COLORS.borderColor, SpreadsheetApp.BorderStyle.DOTTED);
    sheet.getRange(r, 8, 1, 7).setBackground(bg)
      .setFontSize(10).setVerticalAlignment("middle")
      .setBorder(false, false, true, false, false, false, COLORS.borderColor, SpreadsheetApp.BorderStyle.DOTTED);
  }
  
  // ── Alinear columnas numéricas al centro ──
  sheet.getRange("D4:F100").setHorizontalAlignment("center");
  sheet.getRange("H4:I100").setHorizontalAlignment("center");
  sheet.getRange("K4:K100").setHorizontalAlignment("center");
  sheet.getRange("M4:M100").setHorizontalAlignment("center").setFontWeight("bold");
  
  // ── Freeze headers ──
  sheet.setFrozenRows(3);
  
  // ── Proteger headers ──
  const protection = sheet.getRange("A1:N3").protect();
  protection.setDescription("Headers — no editar");
  protection.setWarningOnly(true);
}

// ============================================================
// FORMATEAR HOJA CONFIG v2 (SEPARADA)
// ============================================================
function formatConfigSheetV2(sheet) {
  // Título
  sheet.getRange("A1:H1").merge()
    .setValue("⚙️ CONFIGURACIÓN GLOBAL — ESTRUCTURA SEPARADA")
    .setFontSize(14).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.navyDark)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(1, 40);
  
  // ── SECCIÓN A: RESPONSABLES ──
  sheet.getRange("A3:B3").merge()
    .setValue("RESPONSABLES")
    .setFontSize(11).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.configHeaderBg)
    .setHorizontalAlignment("center");
  
  const respHeaders = ["LOCAL ID", "RESPONSABLE"];
  sheet.getRange("A4:B4").setValues([respHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.primary)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.primary, SpreadsheetApp.BorderStyle.SOLID);
  
  // ── SECCIÓN B: CATEGORÍAS ──
  sheet.getRange("D3:E3").merge()
    .setValue("CATEGORÍAS")
    .setFontSize(11).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.configHeaderBg)
    .setHorizontalAlignment("center");
  
  const catHeaders = ["LOCAL ID", "CATEGORÍA"];
  sheet.getRange("D4:E4").setValues([catHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.primary)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.primary, SpreadsheetApp.BorderStyle.SOLID);
  
  // ── SECCIÓN C: PRÓXIMO SKU POR LOCAL (para auto-increment) ──
  sheet.getRange("G3:H3").merge()
    .setValue("PRÓXIMO SKU")
    .setFontSize(11).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.configHeaderBg)
    .setHorizontalAlignment("center");
  
  const skuHeaders = ["LOCAL ID", "PRÓXIMO #"];
  sheet.getRange("G4:H4").setValues([skuHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.primary)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.primary, SpreadsheetApp.BorderStyle.SOLID);
  
  // Inicializar próximos SKU
  const localIds = Object.keys(LOCALES);
  localIds.forEach((id, idx) => {
    sheet.getRange(5 + idx, 7).setValue(id);
    sheet.getRange(5 + idx, 8).setValue(1);
  });
  
  // ── Anchos ──
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 20);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 20);
  sheet.setColumnWidth(7, 100);
  sheet.setColumnWidth(8, 80);
  
  // ── Formato de datos ──
  for (let r = 5; r <= 50; r++) {
    const bg = (r % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
    sheet.getRange(r, 1, 1, 2).setBackground(bg).setFontSize(10);
    sheet.getRange(r, 4, 1, 2).setBackground(bg).setFontSize(10);
    sheet.getRange(r, 7, 1, 2).setBackground(bg).setFontSize(10);
  }
  
  sheet.setFrozenRows(4);
}

// ============================================================
// FORMATEAR HOJA DASHBOARD
// ============================================================
function formatDashboardSheet(sheet) {
  sheet.getRange("A1:J30").setBackground(COLORS.navyDark);
  
  sheet.getRange("A1:J1").merge()
    .setValue("📦 CONTROL STOCK PRO — DASHBOARD")
    .setFontSize(18).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.navyDark)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 55);
  
  sheet.getRange("A2:J2").merge()
    .setValue("Docks del Puerto • Tigre — Resumen automático")
    .setFontSize(11).setFontColor(COLORS.medGray)
    .setBackground(COLORS.navyDark)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(2, 30);
  
  sheet.getRange("A3:J3").setBackground(COLORS.primary);
  sheet.setRowHeight(3, 3);
  
  sheet.getRange("A5:J5").merge()
    .setValue("RESUMEN POR LOCAL — Último stock registrado")
    .setFontSize(12).setFontWeight("bold").setFontColor(COLORS.primary)
    .setBackground(COLORS.navy).setHorizontalAlignment("center");
  
  const dashHeaders = ["LOCAL", "PRODUCTOS", "REGISTROS", "BAJO MÍNIMO", "ÚLTIMO REGISTRO", "ESTADO"];
  sheet.getRange("A6:F6").setValues([dashHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.prodHeaderBg).setHorizontalAlignment("center");
  sheet.setRowHeight(6, 28);
  
  const localNames = Object.values(LOCAL_NAMES);
  const localIds = Object.keys(LOCALES);
  for (let i = 0; i < localNames.length; i++) {
    const row = 7 + i;
    const bg = i % 2 === 0 ? "#1e293b" : "#111827";
    sheet.getRange(row, 1, 1, 6).setBackground(bg).setFontColor(COLORS.lightGray).setFontSize(10).setHorizontalAlignment("center");
    sheet.getRange(row, 1).setValue(localNames[i]).setHorizontalAlignment("left").setFontWeight("bold");
    
    const sn = LOCALES[localIds[i]];
    sheet.getRange(row, 2).setFormula(`=COUNTA('${sn}'!A4:A100)`);
    sheet.getRange(row, 3).setFormula(`=COUNTA('${sn}'!H4:H500)`);
    sheet.getRange(row, 4).setFormula(`=0`);
    sheet.getRange(row, 5).setFormula(`=IF(COUNTA('${sn}'!H4:H500)>0, INDEX('${sn}'!H4:I500, COUNTA('${sn}'!H4:H500), 1) & " " & INDEX('${sn}'!H4:I500, COUNTA('${sn}'!H4:H500), 2), "Sin datos")`);
    sheet.getRange(row, 6).setValue("✅ OK");
  }
  
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 80);
  
  sheet.getRange("A15:J15").merge()
    .setValue("💡 Este dashboard se actualiza automáticamente cada vez que se registra stock desde la app")
    .setFontSize(9).setFontColor(COLORS.medGray).setBackground(COLORS.navyDark).setHorizontalAlignment("center");
  
  sheet.setFrozenRows(6);
  
  for (let c = 7; c <= 10; c++) sheet.setColumnWidth(c, 80);
}

// ============================================================
// CARGAR DATOS DEMO
// ============================================================
function cargarDatosDemo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Config - Responsables
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const respData = [
    ["umo","Jacobo"],["umo","Martín"],["umo","Laura"],
    ["gelato","Jacobo"],["gelato","Sofía"],["gelato","Pedro"],
    ["brooklyn","Jacobo"],["brooklyn","Diego"],["brooklyn","Ana"],
    ["trento","Jacobo"],["trento","Valeria"],["trento","Lucas"],
    ["eventos","Jacobo"],["eventos","Carolina"],
    ["shopping","Jacobo"],["shopping","Roberto"],
  ];
  configSheet.getRange(5, 1, respData.length, 2).setValues(respData);
  
  // Config - Categorías
  const catData = [
    ["umo","Carnes"],["umo","Verduras"],["umo","Bebidas"],["umo","Descartables"],
    ["gelato","Helados"],["gelato","Toppings"],["gelato","Conos"],["gelato","Bebidas"],
    ["brooklyn","Panes"],["brooklyn","Proteínas"],["brooklyn","Salsas"],["brooklyn","Papas"],
    ["trento","Café"],["trento","Pastelería"],["trento","Bebidas"],["trento","Descartables"],
    ["eventos","Vajilla"],["eventos","Bebidas"],["eventos","Insumos"],
    ["shopping","Limpieza"],["shopping","Mantenimiento"],["shopping","Seguridad"],
  ];
  configSheet.getRange(5, 4, catData.length, 2).setValues(catData);
  
  // Productos por local
  const productSets = {
    "UmoGrill": [
      ["UMO-001","Vacío","Carnes","kg",10,true],
      ["UMO-002","Tira de asado","Carnes","kg",15,true],
      ["UMO-003","Chorizo","Carnes","kg",8,true],
      ["UMO-004","Morcilla","Carnes","u",20,true],
      ["UMO-005","Lechuga","Verduras","u",10,true],
      ["UMO-006","Tomate","Verduras","kg",5,true],
      ["UMO-007","Coca-Cola 1.5L","Bebidas","u",24,true],
      ["UMO-008","Agua mineral","Bebidas","u",30,true],
      ["UMO-009","Servilletas","Descartables","u",500,true],
      ["UMO-010","Bandeja aluminio","Descartables","u",50,true],
    ],
    "PuertoGelato": [
      ["GEL-001","Chocolate","Helados","kg",5,true],
      ["GEL-002","Vainilla","Helados","kg",5,true],
      ["GEL-003","Fresa","Helados","kg",4,true],
      ["GEL-004","Granola","Toppings","kg",2,true],
      ["GEL-005","Conos de waffle","Conos","u",100,true],
      ["GEL-006","Coca-Cola","Bebidas","u",20,true],
    ],
    "Brooklyn": [
      ["BRO-001","Pan integral","Panes","u",30,true],
      ["BRO-002","Pan blanco","Panes","u",40,true],
      ["BRO-003","Pechuga de pollo","Proteínas","kg",10,true],
      ["BRO-004","Mayonesa","Salsas","kg",2,true],
      ["BRO-005","Papas fritas","Papas","kg",5,true],
    ],
    "TrentoCafe": [
      ["TRE-001","Café molido","Café","kg",3,true],
      ["TRE-002","Café en grano","Café","kg",2,true],
      ["TRE-003","Croissant","Pastelería","u",20,true],
      ["TRE-004","Medialunas","Pastelería","u",30,true],
      ["TRE-005","Leche","Bebidas","l",10,true],
    ],
    "Eventos": [
      ["EVE-001","Platos descartables","Vajilla","u",500,true],
      ["EVE-002","Vasos plásticos","Vajilla","u",1000,true],
      ["EVE-003","Agua mineral","Bebidas","u",50,true],
      ["EVE-004","Servilletas","Insumos","u",1000,true],
    ],
    "Shopping": [
      ["SHP-001","Detergente","Limpieza","l",5,true],
      ["SHP-002","Desinfectante","Limpieza","l",3,true],
      ["SHP-003","Escoba","Mantenimiento","u",10,true],
      ["SHP-004","Pala","Mantenimiento","u",5,true],
    ]
  };
  
  Object.entries(productSets).forEach(([sheetName, products]) => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      sheet.getRange(4, 1, products.length, 6).setValues(products);
    }
  });
  
  SpreadsheetApp.getUi().alert("✅ Datos demo cargados exitosamente.");
}

// ============================================================
// GENERAR SKU AUTOMÁTICO
// ============================================================
function generateNextSKU(localId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  
  const prefix = SKU_PREFIXES[localId] || "SKU";
  
  // Buscar la fila del local en la sección de próximos SKU (columnas G:H)
  const skuData = configSheet.getRange("G5:H20").getValues();
  let nextNum = 1;
  
  for (let i = 0; i < skuData.length; i++) {
    if (String(skuData[i][0]) === String(localId)) {
      nextNum = Number(skuData[i][1]) || 1;
      // Incrementar y guardar
      configSheet.getRange(5 + i, 8).setValue(nextNum + 1);
      break;
    }
  }
  
  return prefix + "-" + String(nextNum).padStart(3, "0");
}

// ============================================================
// WEB APP HANDLERS
// ============================================================
function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "";
    let result;
    
    switch(action) {
      case "getProducts": result = getProducts(params.localId); break;
      case "getConfig": result = getConfig(params.localId); break;
      case "getHistory": result = getHistory(params.localId, parseInt(params.limit) || 50); break;
      case "getStats": result = getStats(params.localId); break;
      case "saveStock": result = saveStockEntry(params.localId, JSON.parse(params.entry)); break;
      case "addProduct": result = addProduct(params.localId, JSON.parse(params.product)); break;
      case "toggleProduct": result = toggleProduct(params.localId, params.sku, params.activo === "true"); break;
      case "addConfig": result = addConfigItem(params.localId, params.tipo, params.valor); break;
      case "removeConfig": result = removeConfigItem(params.localId, params.tipo, params.valor); break;
      case "removeProduct": result = removeProduct(params.localId, params.sku); break;
      case "getAllData": result = getAllData(params.localId); break;
      case "generateSKU": result = { sku: generateNextSKU(params.localId) }; break;
      default: result = { error: "Acción no válida: " + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// READ OPERATIONS
// ============================================================
function getProducts(localId) {
  const sheetName = LOCALES[localId];
  if (!sheetName) return { error: "Local no válido" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: "Hoja no encontrada" };
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { products: [] };
  
  const colA = sheet.getRange("A4:A" + lastRow).getValues();
  let dataRows = 0;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i][0] !== "" && colA[i][0] !== null) dataRows = i + 1;
  }
  if (dataRows === 0) return { products: [] };
  
  const data = sheet.getRange(4, 1, dataRows, 6).getValues();
  const products = data.filter(r => r[0] !== "" && r[0] !== null).map(r => ({
    sku: String(r[0]), producto: String(r[1]), categoria: String(r[2]),
    unidad: String(r[3] || "u"), minimo: Number(r[4]) || 0,
    activo: r[5] === true || String(r[5]).toLowerCase() === "true"
  }));
  
  return { products };
}

function getConfig(localId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) return { responsables: [], categorias: [] };
  
  // Responsables (columnas A:B)
  const respData = sheet.getRange("A5:B50").getValues();
  const responsables = [];
  respData.forEach(row => {
    if (String(row[0]) === String(localId) && row[1]) {
      responsables.push(String(row[1]));
    }
  });
  
  // Categorías (columnas D:E)
  const catData = sheet.getRange("D5:E50").getValues();
  const categorias = [];
  catData.forEach(row => {
    if (String(row[0]) === String(localId) && row[1]) {
      categorias.push(String(row[1]));
    }
  });
  
  const prodResult = getProducts(localId);   return { responsables, categorias, productos: prodResult.products || [] };
}

function getHistory(localId, limit) {
  const sheetName = LOCALES[localId];
  if (!sheetName) return { history: [] };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { history: [] };
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { history: [] };
  
  const colH = sheet.getRange("H4:H" + lastRow).getValues();
  let dataRows = 0;
  for (let i = 0; i < colH.length; i++) {
    if (colH[i][0] !== "" && colH[i][0] !== null) dataRows = i + 1;
  }
  if (dataRows === 0) return { history: [] };
  
  const data = sheet.getRange(4, 8, dataRows, 7).getValues();
  const history = data.filter(r => r[0] !== "" && r[0] !== null).map(r => ({
    fecha: formatDate(r[0]), hora: String(r[1]), usuario: String(r[2]),
    sku: String(r[3]), producto: String(r[4]), stock: Number(r[5]) || 0, nota: String(r[6] || "")
  })).reverse().slice(0, limit || 50);
  
  return { history };
}

function formatDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val);
}

function getStats(localId) {
  const prodResult = getProducts(localId);
  const histResult = getHistory(localId, 500);
  const products = prodResult.products || [];
  const history = histResult.history || [];
  const activeProducts = products.filter(p => p.activo);
  
  const latestByProduct = {};
  history.forEach(h => {
    if (!latestByProduct[h.sku] || (h.fecha + h.hora) > (latestByProduct[h.sku].fecha + latestByProduct[h.sku].hora)) {
      latestByProduct[h.sku] = h;
    }
  });
  
  const critical = activeProducts
    .filter(p => latestByProduct[p.sku] && latestByProduct[p.sku].stock < p.minimo)
    .map(p => ({ sku: p.sku, producto: p.producto, categoria: p.categoria, unidad: p.unidad, minimo: p.minimo, currentStock: latestByProduct[p.sku].stock, deficit: p.minimo - latestByProduct[p.sku].stock }))
    .sort((a, b) => b.deficit - a.deficit).slice(0, 10);
  
  return { totalProducts: activeProducts.length, belowMinimum: critical.length, totalRegistros: history.length, lastEntry: history[0] || null, critical };
}

function getAllData(localId) {
  return {
    products: (getProducts(localId)).products || [],
    responsables: (getConfig(localId)).responsables || [],
    categorias: (getConfig(localId)).categorias || [],
    history: (getHistory(localId, 50)).history || [],
    stats: getStats(localId),
  };
}

// ============================================================
// WRITE OPERATIONS
// ============================================================
function saveStockEntry(localId, entry) {
  const sheetName = LOCALES[localId];
  if (!sheetName) return { error: "Local no válido" };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  const lastRow = Math.max(sheet.getLastRow(), 3);
  const colH = sheet.getRange("H4:H" + (lastRow + 5)).getValues();
  let nextRow = 4;
  for (let i = 0; i < colH.length; i++) {
    if (colH[i][0] === "" || colH[i][0] === null) { nextRow = i + 4; break; }
    nextRow = i + 5;
  }
  
  const now = new Date();
  const fecha = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const hora = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm");
  
  const row = [fecha, hora, entry.usuario || "", entry.sku || "", entry.producto || "", Number(entry.stock) || 0, entry.nota || ""];
  sheet.getRange(nextRow, 8, 1, 7).setValues([row]);
  
  const bg = (nextRow % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
  sheet.getRange(nextRow, 8, 1, 7).setBackground(bg).setFontSize(10)
    .setBorder(false, false, true, false, false, false, COLORS.borderColor, SpreadsheetApp.BorderStyle.DOTTED);
  sheet.getRange(nextRow, 13).setHorizontalAlignment("center").setFontWeight("bold");
  
  const prodResult = getProducts(localId);
  const product = (prodResult.products || []).find(p => p.sku === entry.sku);
  if (product && Number(entry.stock) < product.minimo) {
    sheet.getRange(nextRow, 13).setFontColor(COLORS.danger).setBackground("#fee2e2");
  } else {
    sheet.getRange(nextRow, 13).setFontColor(COLORS.success);
  }
  
  const fullEntry = { fecha, hora, ...entry, stock: Number(entry.stock) };
  notifyNewStock(localId, fullEntry, product);
  
  updateDashboard(localId);
  
  return { ok: true, entry: fullEntry };
}

function addProduct(localId, product) {
  const sheetName = LOCALES[localId];
  if (!sheetName) return { error: "Local no válido" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  const lastRow = Math.max(sheet.getLastRow(), 3);
  const colA = sheet.getRange("A4:A" + (lastRow + 5)).getValues();
  let nextRow = 4;
  for (let i = 0; i < colA.length; i++) {
    if (colA[i][0] === "" || colA[i][0] === null) { nextRow = i + 4; break; }
    nextRow = i + 5;
  }
  
  // Si no hay SKU, generar automáticamente
  const sku = product.sku || generateNextSKU(localId);
  
  sheet.getRange(nextRow, 1, 1, 6).setValues([[sku, product.nombre || product.producto || "", product.categoria || "", product.unidad || "u", product.minimo || 0, true]]);

  const bg = (nextRow % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
  sheet.getRange(nextRow, 1, 1, 6).setBackground(bg).setFontSize(10);
  
  return { ok: true, sku };
}

function toggleProduct(localId, sku, newActive) {
  const sheetName = LOCALES[localId];
  if (!sheetName) return { error: "Local no válido" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { error: "No hay productos" };
  
  const skus = sheet.getRange("A4:A" + lastRow).getValues();
  for (let i = 0; i < skus.length; i++) {
    if (String(skus[i][0]) === String(sku)) {
      sheet.getRange(i + 4, 6).setValue(newActive);
      return { ok: true };
    }
  }
  return { error: "No encontrado" };
}

function addConfigItem(localId, tipo, valor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  
  if (tipo === "responsable") {
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, 2).setValues([[localId, valor]]);
  } else if (tipo === "categoria") {
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 4, 1, 2).setValues([[localId, valor]]);
  }
  
  return { ok: true };
}

function removeConfigItem(localId, tipo, valor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  
  if (tipo === "responsable") {
    const data = sheet.getRange("A5:B50").getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === String(localId) && String(data[i][1]) === String(valor)) {
        sheet.deleteRow(i + 5);
        return { ok: true };
      }
    }
  } else if (tipo === "categoria") {
    const data = sheet.getRange("D5:E50").getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === String(localId) && String(data[i][1]) === String(valor)) {
        sheet.deleteRow(i + 5);
        return { ok: true };
      }
    }
  }
  
  return { ok: true };
}

function removeProduct(localId, sku) {
  const sheetName = LOCALES[localId];
  if (!sheetName) return { error: "Local no válido" };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { error: "No hay productos" };
  const skus = sheet.getRange("A4:A" + lastRow).getValues();
  for (let i = skus.length - 1; i >= 0; i--) {
    if (String(skus[i][0]) === String(sku)) { sheet.deleteRow(i + 4); return { ok: true }; }
  }
  return { error: "No encontrado" };
}

// ============================================================
// NOTIFICACIONES (mantener igual)
// ============================================================
function notifyNewStock(localId, entry, product) {
  if (!NOTIFY_EMAIL_ON && !NOTIFY_TELEGRAM_ON) return;
  
  const localName = LOCAL_NAMES[localId] || localId;
  const isCritical = product && entry.stock < product.minimo;
  
  if (NOTIFY_ONLY_CRITICAL && !isCritical) return;
  
  if (NOTIFY_TELEGRAM_ON) {
        const msg = `📥 Registro de stock\n🏪 Local: ${localName}\n📦 Producto: ${entry.producto} (${entry.sku})\n🔢 Stock: ${entry.stock} ${product?.unidad || 'u'}\n📉 Mínimo: ${product?.minimo || 0} ${product?.unidad || 'u'} • ${isCritical ? '⚠️ BAJO' : '✅ OK'}\n👤 Responsable: ${entry.usuario}\n🕒 Fecha: ${new Date(entry._ts || Date.now()).toLocaleString('es-AR')}`;sendTelegram(msg);
  }
  
  if (NOTIFY_EMAIL_ON) {
    const subject = `[${localName}] Stock: ${entry.producto}`;
    const htmlBody = `<h2>${localName}</h2><p><strong>${entry.producto}</strong> (${entry.sku})</p><p>Stock: <strong>${entry.stock} ${product?.unidad || 'u'}</strong></p><p>Mínimo: ${product?.minimo || 'N/A'}</p><p>Responsable: ${entry.usuario}</p>`;
    GmailApp.sendEmail(NOTIFY_EMAILS, subject, "", { htmlBody });
  }
}

function sendTelegram(message) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: TELEGRAM_CHAT_ID, text: message };
    UrlFetchApp.fetch(url, { method: "post", payload: JSON.stringify(payload), contentType: "application/json" });
  } catch(e) {
    Logger.log("Telegram error: " + e);
  }
}

function updateDashboard(localId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dash = ss.getSheetByName(DASHBOARD_SHEET);
    if (!dash) return;
    
    const localIds = Object.keys(LOCALES);
    const idx = localIds.indexOf(localId);
    if (idx === -1) return;
    
    const row = 7 + idx;
    const stats = getStats(localId);
    
    dash.getRange(row, 4).setValue(stats.belowMinimum || 0);
    
    if (stats.belowMinimum > 0) {
      dash.getRange(row, 4).setFontColor(COLORS.danger).setFontWeight("bold");
      dash.getRange(row, 6).setFontColor(COLORS.danger).setFontWeight("bold");
    } else {
      dash.getRange(row, 4).setFontColor(COLORS.success).setFontWeight("bold");
      dash.getRange(row, 6).setFontColor(COLORS.success).setFontWeight("bold");
    }
  } catch(e) {
    Logger.log("Dashboard update error: " + e);
  }
}
