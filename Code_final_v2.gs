const TELEGRAM_BOT_TOKEN = "7315157878:AAEw2_hUb9pzpjP2d-OSBZxUzfN1ioXcOu0";
const TELEGRAM_CHAT_ID = "7259177758";
const EMAIL_NOTIFICACION = "yaakovrubi@gmail.com";

const LOCAL_MAP = {
  "umo": "UmoGrill",
  "gelato": "PuertoGelato",
  "brooklyn": "Brooklyn",
  "trento": "TrentoCafe",
  "eventos": "Eventos",
  "shopping": "Shopping"
};

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "getConfig") {
      output.setContent(JSON.stringify(getConfig()));
    } else if (data.action === "agregarRegistro") {
      agregarRegistro(data.local, data.responsable, data.producto, data.cantidad, data.tipo, data.nota || "");
      output.setContent(JSON.stringify({success: true}));
    } else if (data.action === "getStock") {
      const stock = getStock(data.local);
      output.setContent(JSON.stringify({success: true, data: stock}));
    } else {
      output.setContent(JSON.stringify({ok: true}));
    }
  } catch (e) {
    output.setContent(JSON.stringify({error: e.toString()}));
  }
  return output;
}

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const action = e.parameter.action;
    if (action === "getConfig") {
      output.setContent(JSON.stringify(getConfig()));
    } else if (action === "getStock") {
      const stock = getStock(e.parameter.local);
      output.setContent(JSON.stringify({success: true, data: stock}));
    } else {
      output.setContent(JSON.stringify({ok: true}));
    }
  } catch (e) {
    output.setContent(JSON.stringify({error: e.toString()}));
  }
  return output;
}

function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName("Config");
  if (!configSheet) {
    return {responsables: {}, categorias: {}, productos: {}};
  }
  
  const config = {responsables: {}, categorias: {}, productos: {}};
  
  try {
    // Leer Responsables (A:B)
    const respRange = configSheet.getRange("A4:B50");
    const respValues = respRange.getValues();
    respValues.forEach(row => {
      if (row[0] && String(row[0]).trim() && row[1] && String(row[1]).trim()) {
        const localId = String(row[0]).toLowerCase().trim();
        if (!config.responsables[localId]) config.responsables[localId] = [];
        const resp = String(row[1]).trim();
        if (config.responsables[localId].indexOf(resp) === -1) {
          config.responsables[localId].push(resp);
        }
      }
    });
  } catch (e) {
    Logger.log("Error leyendo responsables: " + e);
  }
  
  try {
    // Leer Categorías (D:E)
    const catRange = configSheet.getRange("D4:E50");
    const catValues = catRange.getValues();
    catValues.forEach(row => {
      if (row[0] && String(row[0]).trim() && row[1] && String(row[1]).trim()) {
        const localId = String(row[0]).toLowerCase().trim();
        if (!config.categorias[localId]) config.categorias[localId] = [];
        const cat = String(row[1]).trim();
        if (config.categorias[localId].indexOf(cat) === -1) {
          config.categorias[localId].push(cat);
        }
      }
    });
  } catch (e) {
    Logger.log("Error leyendo categorías: " + e);
  }
  
  try {
    // Leer Productos (M:P) - FLEXIBLE
    // Buscar el rango que tiene datos
    const prodRange = configSheet.getRange("M4:P50");
    const prodValues = prodRange.getValues();
    
    prodValues.forEach(row => {
      // row[0] = LOCAL ID, row[1] = PRODUCTO, row[2] = CATEGORÍA, row[3] = UNIDAD
      if (row[0] && String(row[0]).trim()) {
        const localId = String(row[0]).toLowerCase().trim();
        const producto = String(row[1] || "").trim();
        const categoria = String(row[2] || "").trim();
        const unidad = String(row[3] || "").trim();
        
        // Solo agregar si hay al menos LOCAL ID y PRODUCTO
        if (producto) {
          if (!config.productos[localId]) config.productos[localId] = [];
          config.productos[localId].push({
            sku: "",
            nombre: producto,
            categoria: categoria,
            unidad: unidad
          });
        }
      }
    });
  } catch (e) {
    Logger.log("Error leyendo productos: " + e);
  }
  
  return config;
}

function getStock(local) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = LOCAL_MAP[local] || local;
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  try {
    const stockRange = sheet.getRange("H3:J50");
    const stockValues = stockRange.getValues();
    const stock = [];
    
    stockValues.forEach(row => {
      if (row[0] && String(row[0]).trim()) {
        stock.push({
          producto: String(row[0]).trim(),
          cantidad: Number(row[1]) || 0,
          ultimaActualizacion: String(row[2] || "")
        });
      }
    });
    
    return stock;
  } catch (e) {
    Logger.log("Error: " + e);
    return [];
  }
}

function agregarRegistro(local, responsable, producto, cantidad, tipo, nota) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = LOCAL_MAP[local] || local;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    const lastRow = sheet.getLastRow();
    const nextRow = Math.max(4, lastRow + 1);
    const fecha = new Date();
    const fechaFormato = fecha.toLocaleDateString("es-AR");
    const horaFormato = fecha.toLocaleTimeString("es-AR");
    
    sheet.getRange("A" + nextRow).setValue(fechaFormato);
    sheet.getRange("B" + nextRow).setValue(horaFormato);
    sheet.getRange("C" + nextRow).setValue(responsable);
    sheet.getRange("D" + nextRow).setValue(producto);
    sheet.getRange("E" + nextRow).setValue(cantidad);
    sheet.getRange("F" + nextRow).setValue(tipo);
    sheet.getRange("G" + nextRow).setValue(nota);
    
    actualizarStock(local, producto, cantidad, tipo);
    enviarNotificaciones(local, responsable, producto, cantidad, tipo);
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function actualizarStock(local, producto, cantidad, tipo) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = LOCAL_MAP[local] || local;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    const stockRange = sheet.getRange("H4:J50");
    const stockValues = stockRange.getValues();
    let encontrado = false;
    
    for (let i = 0; i < stockValues.length; i++) {
      if (String(stockValues[i][0]).trim() === String(producto).trim()) {
        const stockActual = Number(stockValues[i][1]) || 0;
        const nuevoStock = tipo === "Entrada" ? stockActual + Number(cantidad) : stockActual - Number(cantidad);
        sheet.getRange("I" + (i + 4)).setValue(nuevoStock);
        sheet.getRange("J" + (i + 4)).setValue(new Date().toLocaleString("es-AR"));
        encontrado = true;
        break;
      }
    }
    
    if (!encontrado) {
      const lastStockRow = sheet.getLastRow();
      const nextStockRow = lastStockRow + 1;
      sheet.getRange("H" + nextStockRow).setValue(producto);
      sheet.getRange("I" + nextStockRow).setValue(tipo === "Entrada" ? cantidad : -cantidad);
      sheet.getRange("J" + nextStockRow).setValue(new Date().toLocaleString("es-AR"));
    }
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function enviarNotificaciones(local, responsable, producto, cantidad, tipo) {
  try {
    if (!tipo) return;
    
    const fecha = new Date();
    const fechaFormato = fecha.toLocaleDateString("es-AR");
    const horaFormato = fecha.toLocaleTimeString("es-AR");
    
    const tipoEmoji = tipo === "Entrada" ? "📥" : "📤";
    const tipoColor = tipo === "Entrada" ? "✅" : "⚠️";
    
    const mensaje = 
      tipoEmoji + " " + tipo.toUpperCase() + " DE MERCADERÍA" + "\n" +
      "═══════════════════════════════" + "\n" +
      "📍 LOCAL: " + local.toUpperCase() + "\n" +
      "👤 RESPONSABLE: " + responsable + "\n" +
      "📦 PRODUCTO: " + producto + "\n" +
      "═══════════════════════════════" + "\n" +
      "📊 CANTIDAD: " + cantidad + "\n" +
      "═══════════════════════════════" + "\n" +
      "📅 FECHA: " + fechaFormato + "\n" +
      "🕐 HORA: " + horaFormato + "\n" +
      "═══════════════════════════════";
    
    try {
      const asunto = tipoColor + " " + tipo + " registrada - " + local + " (" + producto + ")";
      GmailApp.sendEmail(EMAIL_NOTIFICACION, asunto, mensaje);
    } catch (e) {}
    
    try {
      const url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
      UrlFetchApp.fetch(url, {
        method: "post",
        payload: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: mensaje,
          parse_mode: "HTML"
        }),
        contentType: "application/json"
      });
    } catch (e) {}
  } catch (e) {
    Logger.log("Error: " + e);
  }
}
