// ============================================================
// CONTROL STOCK PRO — Google Apps Script Backend v2.0
// Docks del Puerto • Tigre
// ============================================================
// CON: Plantilla PRO formateada + Notificaciones Email + Telegram
// ============================================================

// ============================================================
// ⚙️ CONFIGURACIÓN — EDITAR ESTOS VALORES
// ============================================================

// Telegram Bot
const TELEGRAM_BOT_TOKEN = "PEGAR_TU_BOT_TOKEN";  // Obtener de @BotFather
const TELEGRAM_CHAT_ID   = "PEGAR_TU_CHAT_ID";     // Obtener de @userinfobot

// Email (puede ser más de uno, separados por coma)
const NOTIFY_EMAILS = "jacobo@tumail.com";  // Cambiar por tu email real

// Activar/desactivar notificaciones
const NOTIFY_EMAIL_ON    = true;
const NOTIFY_TELEGRAM_ON = true;

// Umbral: notificar solo si stock está bajo mínimo
const NOTIFY_ONLY_CRITICAL = false; // true = solo avisa si < mínimo, false = avisa siempre

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

const CONFIG_SHEET = "Config";
const DASHBOARD_SHEET = "Dashboard";

// Paleta de colores corporativa
const COLORS = {
  navyDark:   "#0a0f1c",
  navy:       "#111827",
  navyMid:    "#1a2236",
  accent:     "#3b82f6",
  accentDark: "#1d4ed8",
  success:    "#10b981",
  successDark:"#059669",
  danger:     "#ef4444",
  dangerDark: "#dc2626",
  warning:    "#f59e0b",
  purple:     "#8b5cf6",
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

// Colores por local (pestaña)
const TAB_COLORS = {
  "UmoGrill":      "#dc2626",  // rojo fuego
  "PuertoGelato":  "#2563eb",  // azul
  "Brooklyn":      "#d97706",  // naranja
  "TrentoCafe":    "#059669",  // verde
  "Eventos":       "#7c3aed",  // violeta
  "Shopping":      "#0891b2",  // cyan
  "Config":        "#374151",  // gris oscuro
  "Dashboard":     "#0f172a",  // navy
};

// ============================================================
// 🎨 FUNCIÓN: CREAR ESTRUCTURA PROFESIONAL
// Ejecutar UNA SOLA VEZ
// ============================================================
function crearEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTheme(SpreadsheetApp.newSpreadsheetTheme().setConcreteColor(SpreadsheetApp.ThemeColorType.TEXT, SpreadsheetApp.newColor().setRgbColor("#1a1a2e").build()).build());
  
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
  
  // ── Crear hoja Config ──
  let configSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG_SHEET);
  } else {
    configSheet.clear();
    configSheet.clearFormats();
  }
  formatConfigSheet(configSheet);
  
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
  
  // Setear colores de pestañas
  Object.entries(TAB_COLORS).forEach(([name, color]) => {
    const s = ss.getSheetByName(name);
    if (s) s.setTabColor(color);
  });
  
  SpreadsheetApp.getUi().alert("✅ Estructura PRO creada con éxito.\n\nAhora ejecutá 'cargarDatosDemo' para cargar productos de ejemplo.");
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
    .setFontSize(10).setFontWeight("bold").setFontColor(COLORS.accent)
    .setBackground(COLORS.navy)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(2, 28);
  
  // ── Headers Products (fila 3) ──
  const prodHeaders = ["SKU", "PRODUCTO", "CATEGORÍA", "UNIDAD", "MÍNIMO", "ACTIVO"];
  sheet.getRange("A3:F3").setValues([prodHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.prodHeaderBg)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.accent, SpreadsheetApp.BorderStyle.SOLID);
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
  sheet.getRange("G1:G500").setBackground(COLORS.accent);
  
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
  // Products: alternate row colors
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
  
  // ── Formato condicional: stock bajo mínimo ──
  // Se aplica después cuando hay datos
  
  // ── Freeze headers ──
  sheet.setFrozenRows(3);
  
  // ── Proteger headers ──
  const protection = sheet.getRange("A1:N3").protect();
  protection.setDescription("Headers — no editar");
  protection.setWarningOnly(true);
}

// ============================================================
// FORMATEAR HOJA CONFIG
// ============================================================
function formatConfigSheet(sheet) {
  // Título
  sheet.getRange("A1:C1").merge()
    .setValue("⚙️ CONFIGURACIÓN GLOBAL")
    .setFontSize(14).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.navyDark)
    .setHorizontalAlignment("center");
  sheet.setRowHeight(1, 40);
  
  // Headers
  const headers = ["LOCAL ID", "TIPO", "VALOR"];
  sheet.getRange("A2:C2").setValues([headers])
    .setFontSize(10).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.configHeaderBg)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, COLORS.purple, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(2, 30);
  
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 200);
  
  // Alternate rows
  for (let r = 3; r <= 200; r++) {
    const bg = (r % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
    sheet.getRange(r, 1, 1, 3).setBackground(bg).setFontSize(10)
      .setBorder(false, false, true, false, false, false, COLORS.borderColor, SpreadsheetApp.BorderStyle.DOTTED);
  }
  
  sheet.setFrozenRows(2);
  
  // Leyenda
  sheet.getRange("E1").setValue("📌 LEYENDA").setFontWeight("bold").setFontSize(10);
  sheet.getRange("E2").setValue("tipo = 'responsable' → Nombre del responsable");
  sheet.getRange("E3").setValue("tipo = 'categoria' → Categoría de producto");
  sheet.getRange("E2:E3").setFontSize(9).setFontColor(COLORS.medGray);
  sheet.setColumnWidth(5, 300);
}

// ============================================================
// FORMATEAR HOJA DASHBOARD
// ============================================================
function formatDashboardSheet(sheet) {
  // Fondo general
  sheet.getRange("A1:J30").setBackground(COLORS.navyDark);
  
  // Título principal
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
  
  // Separador
  sheet.getRange("A3:J3").setBackground(COLORS.accent);
  sheet.setRowHeight(3, 3);
  
  // Headers resumen por local
  sheet.getRange("A5:J5").merge()
    .setValue("RESUMEN POR LOCAL — Último stock registrado")
    .setFontSize(12).setFontWeight("bold").setFontColor(COLORS.accent)
    .setBackground(COLORS.navy).setHorizontalAlignment("center");
  
  const dashHeaders = ["LOCAL", "PRODUCTOS", "REGISTROS", "BAJO MÍNIMO", "ÚLTIMO REGISTRO", "ESTADO"];
  sheet.getRange("A6:F6").setValues([dashHeaders])
    .setFontSize(9).setFontWeight("bold").setFontColor(COLORS.white)
    .setBackground(COLORS.prodHeaderBg).setHorizontalAlignment("center");
  sheet.setRowHeight(6, 28);
  
  // Filas por local
  const localNames = Object.values(LOCAL_NAMES);
  const localIds = Object.keys(LOCALES);
  for (let i = 0; i < localNames.length; i++) {
    const row = 7 + i;
    const bg = i % 2 === 0 ? "#1e293b" : "#111827";
    sheet.getRange(row, 1, 1, 6).setBackground(bg).setFontColor(COLORS.lightGray).setFontSize(10).setHorizontalAlignment("center");
    sheet.getRange(row, 1).setValue(localNames[i]).setHorizontalAlignment("left").setFontWeight("bold");
    
    // Fórmulas que se actualizan automáticamente
    const sn = LOCALES[localIds[i]];
    sheet.getRange(row, 2).setFormula(`=COUNTA('${sn}'!A4:A100)`);
    sheet.getRange(row, 3).setFormula(`=COUNTA('${sn}'!H4:H500)`);
    sheet.getRange(row, 4).setFormula(`=0`); // Se actualiza vía script
    sheet.getRange(row, 5).setFormula(`=IF(COUNTA('${sn}'!H4:H500)>0, INDEX('${sn}'!H4:I500, COUNTA('${sn}'!H4:H500), 1) & " " & INDEX('${sn}'!H4:I500, COUNTA('${sn}'!H4:H500), 2), "Sin datos")`);
    sheet.getRange(row, 6).setValue("✅ OK");
  }
  
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 80);
  
  // Nota
  sheet.getRange("A15:J15").merge()
    .setValue("💡 Este dashboard se actualiza automáticamente cada vez que se registra stock desde la app")
    .setFontSize(9).setFontColor(COLORS.medGray).setBackground(COLORS.navyDark).setHorizontalAlignment("center");
  
  sheet.setFrozenRows(6);
  
  // Ancho columnas extras
  for (let c = 7; c <= 10; c++) sheet.setColumnWidth(c, 80);
}

// ============================================================
// CARGAR DATOS DEMO
// ============================================================
function cargarDatosDemo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Config
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const configData = [
    ["umo","responsable","Jacobo"],["umo","responsable","Martín"],["umo","responsable","Laura"],
    ["umo","categoria","Carnes"],["umo","categoria","Verduras"],["umo","categoria","Bebidas"],["umo","categoria","Descartables"],
    ["gelato","responsable","Jacobo"],["gelato","responsable","Sofía"],["gelato","responsable","Pedro"],
    ["gelato","categoria","Helados"],["gelato","categoria","Toppings"],["gelato","categoria","Conos"],["gelato","categoria","Bebidas"],
    ["brooklyn","responsable","Jacobo"],["brooklyn","responsable","Diego"],["brooklyn","responsable","Ana"],
    ["brooklyn","categoria","Panes"],["brooklyn","categoria","Proteínas"],["brooklyn","categoria","Salsas"],["brooklyn","categoria","Papas"],
    ["trento","responsable","Jacobo"],["trento","responsable","Valeria"],["trento","responsable","Lucas"],
    ["trento","categoria","Café"],["trento","categoria","Pastelería"],["trento","categoria","Bebidas"],["trento","categoria","Descartables"],
    ["eventos","responsable","Jacobo"],["eventos","responsable","Carolina"],
    ["eventos","categoria","Vajilla"],["eventos","categoria","Bebidas"],["eventos","categoria","Insumos"],
    ["shopping","responsable","Jacobo"],["shopping","responsable","Roberto"],
    ["shopping","categoria","Limpieza"],["shopping","categoria","Mantenimiento"],["shopping","categoria","Seguridad"],
  ];
  configSheet.getRange(3, 1, configData.length, 3).setValues(configData);
  
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
      ["GEL-002","Dulce de leche","Helados","kg",5,true],
      ["GEL-003","Frutilla","Helados","kg",4,true],
      ["GEL-004","Salsa chocolate","Toppings","l",2,true],
      ["GEL-005","Cono simple","Conos","u",100,true],
      ["GEL-006","Cucurucho","Conos","u",80,true],
    ],
    "Brooklyn": [
      ["BRK-001","Pan brioche","Panes","u",50,true],
      ["BRK-002","Carne smash","Proteínas","kg",10,true],
      ["BRK-003","Cheddar","Proteínas","kg",5,true],
      ["BRK-004","Salsa burger","Salsas","l",3,true],
      ["BRK-005","Papas congeladas","Papas","kg",20,true],
      ["BRK-006","Bacon","Proteínas","kg",4,true],
    ],
    "TrentoCafe": [
      ["TRE-001","Café grano","Café","kg",5,true],
      ["TRE-002","Medialunas","Pastelería","u",30,true],
      ["TRE-003","Leche entera","Bebidas","l",10,true],
      ["TRE-004","Vasos descartables","Descartables","u",200,true],
      ["TRE-005","Tostadas","Pastelería","u",40,true],
    ],
    "Eventos": [
      ["EVT-001","Platos llanos","Vajilla","u",120,true],
      ["EVT-002","Copas vino","Vajilla","u",80,true],
      ["EVT-003","Manteles","Insumos","u",30,true],
      ["EVT-004","Servilletas tela","Insumos","u",100,true],
    ],
    "Shopping": [
      ["SHP-001","Lavandina 5L","Limpieza","u",10,true],
      ["SHP-002","Bolsas residuo","Limpieza","u",100,true],
      ["SHP-003","Tubos LED","Mantenimiento","u",10,true],
      ["SHP-004","Desodorante amb.","Limpieza","u",15,true],
    ],
  };
  
  Object.entries(productSets).forEach(([sheetName, products]) => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet && products.length > 0) {
      sheet.getRange(4, 1, products.length, 6).setValues(products);
    }
  });
  
  // Aplicar formato condicional de activo
  Object.values(LOCALES).forEach(sheetName => {
    applyConditionalFormatting(ss.getSheetByName(sheetName));
  });
  
  SpreadsheetApp.getUi().alert("✅ Datos demo cargados.\n\n• 6 locales con productos\n• Responsables y categorías configurados\n• Dashboard listo\n\nYa podés hacer el Deploy de la Web App.");
}

// ============================================================
// FORMATO CONDICIONAL
// ============================================================
function applyConditionalFormatting(sheet) {
  if (!sheet) return;
  
  // Activo TRUE = verde, FALSE = rojo (columna F)
  const activeRange = sheet.getRange("F4:F100");
  
  const ruleTrue = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("TRUE")
    .setBackground("#d1fae5").setFontColor("#065f46")
    .setRanges([activeRange]).build();
  
  const ruleFalse = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("FALSE")
    .setBackground("#fee2e2").setFontColor("#991b1b")
    .setRanges([activeRange]).build();
  
  // Stock bajo mínimo (columna M roja si es número)
  const stockRange = sheet.getRange("M4:M500");
  
  const rules = sheet.getConditionalFormatRules();
  rules.push(ruleTrue, ruleFalse);
  sheet.setConditionalFormatRules(rules);
}

// ============================================================
// 🔔 NOTIFICACIONES
// ============================================================

function sendTelegramNotification(message) {
  if (!NOTIFY_TELEGRAM_ON || TELEGRAM_BOT_TOKEN === "PEGAR_TU_BOT_TOKEN") return;
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch(e) {
    Logger.log("Error Telegram: " + e.toString());
  }
}

function sendEmailNotification(subject, htmlBody) {
  if (!NOTIFY_EMAIL_ON || !NOTIFY_EMAILS) return;
  
  try {
    const emails = NOTIFY_EMAILS.split(",").map(e => e.trim());
    emails.forEach(email => {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
      });
    });
  } catch(e) {
    Logger.log("Error Email: " + e.toString());
  }
}

function notifyNewStock(localId, entry, product) {
  const localName = LOCAL_NAMES[localId] || localId;
  const isLow = product && entry.stock < product.minimo;
  
  // Si solo queremos críticos y no es bajo mínimo, no notificar
  if (NOTIFY_ONLY_CRITICAL && !isLow) return;
  
  const statusIcon = isLow ? "🔴" : "🟢";
  const statusText = isLow ? "⚠️ BAJO MÍNIMO" : "✅ OK";
  const minText = product ? `Mín: ${product.minimo} ${product.unidad}` : "";
  
  // ── Telegram ──
  const tgMsg = [
    `${statusIcon} <b>NUEVO STOCK — ${localName}</b>`,
    ``,
    `📦 <b>${entry.producto}</b> (${entry.sku})`,
    `📊 Stock: <b>${entry.stock}</b> ${product ? product.unidad : ""}`,
    minText ? `📉 ${minText}` : "",
    `👤 ${entry.usuario}`,
    `🕐 ${entry.fecha} ${entry.hora}`,
    entry.nota ? `📝 ${entry.nota}` : "",
    ``,
    `${statusText}`,
  ].filter(l => l !== "").join("\n");
  
  sendTelegramNotification(tgMsg);
  
  // ── Email ──
  const emailSubject = `${isLow ? "⚠️" : "📦"} Stock ${localName}: ${entry.producto} = ${entry.stock}`;
  
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:${isLow ? '#dc2626' : '#059669'};padding:16px 20px;text-align:center;">
        <h2 style="color:#fff;margin:0;font-size:18px;">${statusIcon} REGISTRO DE STOCK</h2>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${localName} — Control Stock PRO</p>
      </div>
      <div style="padding:20px;color:#e2e8f0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">PRODUCTO</td><td style="padding:8px 0;font-weight:bold;font-size:15px;">${entry.producto}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">SKU</td><td style="padding:8px 0;">${entry.sku}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">STOCK</td><td style="padding:8px 0;font-weight:bold;font-size:18px;color:${isLow ? '#ef4444' : '#10b981'};">${entry.stock} ${product ? product.unidad : ""}</td></tr>
          ${product ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">MÍNIMO</td><td style="padding:8px 0;">${product.minimo} ${product.unidad}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">RESPONSABLE</td><td style="padding:8px 0;">${entry.usuario}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">FECHA/HORA</td><td style="padding:8px 0;">${entry.fecha} ${entry.hora}</td></tr>
          ${entry.nota ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:12px;">NOTA</td><td style="padding:8px 0;color:#f59e0b;">${entry.nota}</td></tr>` : ""}
        </table>
        ${isLow ? `<div style="margin-top:16px;padding:12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;text-align:center;color:#ef4444;font-weight:bold;">⚠️ STOCK BAJO MÍNIMO — REPONER</div>` : ""}
      </div>
      <div style="background:#0a0f1c;padding:12px;text-align:center;color:#374151;font-size:11px;">
        Docks del Puerto • Tigre — Control Stock PRO
      </div>
    </div>
  `;
  
  sendEmailNotification(emailSubject, emailHtml);
}

// ============================================================
// ACTUALIZAR DASHBOARD
// ============================================================
function updateDashboard(localId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dash = ss.getSheetByName(DASHBOARD_SHEET);
    if (!dash) return;
    
    const localIds = Object.keys(LOCALES);
    const idx = localIds.indexOf(localId);
    if (idx === -1) return;
    
    const row = 7 + idx;
    
    // Calcular bajo mínimo
    const stats = getStats(localId);
    dash.getRange(row, 4).setValue(stats.belowMinimum || 0);
    
    // Estado
    const status = (stats.belowMinimum > 0) ? "⚠️ ALERTA" : "✅ OK";
    dash.getRange(row, 6).setValue(status);
    
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
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { responsables: [], categorias: [] };
  
  const data = sheet.getRange(3, 1, lastRow - 2, 3).getValues();
  const responsables = [], categorias = [];
  
  data.forEach(row => {
    const lid = String(row[0]), tipo = String(row[1]), valor = String(row[2]);
    if ((lid === localId || lid === "global") && valor) {
      if (tipo === "responsable") responsables.push(valor);
      if (tipo === "categoria") categorias.push(valor);
    }
  });
  
  return { responsables, categorias };
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
  
  // Encontrar siguiente fila vacía en columna H (desde fila 4)
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
  
  // Formato de la fila nueva
  const bg = (nextRow % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
  sheet.getRange(nextRow, 8, 1, 7).setBackground(bg).setFontSize(10)
    .setBorder(false, false, true, false, false, false, COLORS.borderColor, SpreadsheetApp.BorderStyle.DOTTED);
  sheet.getRange(nextRow, 13).setHorizontalAlignment("center").setFontWeight("bold");
  
  // Color stock si bajo mínimo
  const prodResult = getProducts(localId);
  const product = (prodResult.products || []).find(p => p.sku === entry.sku);
  if (product && Number(entry.stock) < product.minimo) {
    sheet.getRange(nextRow, 13).setFontColor(COLORS.danger).setBackground("#fee2e2");
  } else {
    sheet.getRange(nextRow, 13).setFontColor(COLORS.successDark);
  }
  
  // 🔔 Notificaciones
  const fullEntry = { fecha, hora, ...entry, stock: Number(entry.stock) };
  notifyNewStock(localId, fullEntry, product);
  
  // 📊 Actualizar dashboard
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
  
  sheet.getRange(nextRow, 1, 1, 6).setValues([[product.sku || "", product.producto || "", product.categoria || "", product.unidad || "u", Number(product.minimo) || 0, true]]);
  
  const bg = (nextRow % 2 === 0) ? COLORS.rowEven : COLORS.rowOdd;
  sheet.getRange(nextRow, 1, 1, 6).setBackground(bg).setFontSize(10);
  
  return { ok: true };
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
  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, 3).setValues([[localId, tipo, valor]]);
  return { ok: true };
}

function removeConfigItem(localId, tipo, valor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { ok: true };
  const data = sheet.getRange(3, 1, lastRow - 2, 3).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0]) === String(localId) && String(data[i][1]) === String(tipo) && String(data[i][2]) === String(valor)) {
      sheet.deleteRow(i + 3);
      return { ok: true };
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
