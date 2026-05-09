const SHEET_NAME = 'Sugerencias';

/**
 * Initializes the spreadsheet with headers and formatting.
 * MUST BE RUN MANUALLY ONCE in the Apps Script editor.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  } else {
    sheet.clear(); // Start fresh if it exists to ensure headers are correct
  }
  
  const headers = ['ID', 'Fecha', 'Nombre', 'Apellido', 'Area', 'Sugerencia', 'Estado'];
  sheet.appendRow(headers);
  
  // Design & Formatting
  const headerRange = sheet.getRange(1, 1, 1, 7);
  headerRange.setFontWeight('bold')
             .setBackground('#4f46e5')
             .setFontColor('#ffffff')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
             
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 50);  // ID
  sheet.setColumnWidth(2, 130); // Fecha
  sheet.setColumnWidth(3, 120); // Nombre
  sheet.setColumnWidth(4, 120); // Apellido
  sheet.setColumnWidth(5, 100); // Area
  sheet.setColumnWidth(6, 400); // Sugerencia
  sheet.setColumnWidth(7, 100); // Estado
  
  // Add alternating colors to the data range as it grows
  sheet.setRowHeight(1, 35);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) return errorResponse('Hoja no configurada. Ejecuta setup() primero.');

    if (data.action === 'addSuggestion') {
      const id = Utilities.getUuid().substring(0, 8); // Shorter ID
      const date = new Date();
      sheet.appendRow([
        id,
        date,
        data.nombre,
        data.apellido,
        data.area,
        data.sugerencia,
        'Pendiente'
      ]);
      
      // Auto-format the new row
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1, 1, 7).setVerticalAlignment('top').setWrap(true);
      
      return successResponse({ success: true, id: id });
    } 
    
    if (data.action === 'updateStatus') {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 7).setValue(data.status);
          return successResponse({ success: true });
        }
      }
    }

    return errorResponse('Acción no reconocida');
      
  } catch (err) {
    return errorResponse(err.toString());
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return successResponse([]);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return successResponse([]); // Only headers or empty
    
    const headers = data[0];
    const suggestions = [];
    
    for (let i = 1; i < data.length; i++) {
      const obj = {};
      headers.forEach((header, index) => {
        const key = header.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Clean keys
        obj[key] = data[i][index];
      });
      suggestions.push(obj);
    }
    
    return successResponse(suggestions);
      
  } catch (err) {
    return errorResponse(err.toString());
  }
}

function successResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
