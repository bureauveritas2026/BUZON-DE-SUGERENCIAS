/**
 * Google Apps Script for Buzón de Sugerencias
 * Handles POST requests for new suggestions and status updates.
 * Handles GET requests for fetching data.
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // User will need to fill this
const SHEET_NAME = 'Sugerencias';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Fecha', 'Nombre', 'Apellido', 'Area', 'Sugerencia', 'Estado']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#f3f3f3');
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (data.action === 'addSuggestion') {
      const id = Utilities.getUuid();
      const date = new Date();
      sheet.appendRow([
        id,
        date,
        data.nombre,
        data.apellido,
        data.area,
        data.sugerencia,
        'Pendiente' // Default status
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    
    if (data.action === 'updateStatus') {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 7).setValue(data.status);
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Acción no reconocida' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    const headers = data[0];
    const suggestions = [];
    
    for (let i = 1; i < data.length; i++) {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.toLowerCase()] = data[i][index];
      });
      suggestions.push(obj);
    }
    
    return ContentService.createTextOutput(JSON.stringify(suggestions))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
