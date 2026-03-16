// scripts/initSheets.js
const { google } = require('googleapis');

async function initializeSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Crear nuevo spreadsheet
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'TransiMio - Base de Datos'
      },
      sheets: [
        { properties: { title: 'USUARIOS' } },
        { properties: { title: 'CONDUCTORES' } },
        { properties: { title: 'VEHICULOS' } },
        { properties: { title: 'RUTAS' } },
        { properties: { title: 'ESTACIONES' } },
        { properties: { title: 'INCIDENTES' } },
        { properties: { title: 'UBICACION_VEHICULOS_TIEMPO_REAL' } },
        { properties: { title: 'REPORTES_USUARIOS' } },
        { properties: { title: 'CALIFICACIONES' } },
        { properties: { title: 'REGISTRO_SEGURIDAD' } }
      ]
    }
  });

  const spreadsheetId = response.data.spreadsheetId;

  // Configurar headers para cada hoja
  const headers = {
    'USUARIOS': ['ID_usuario', 'nombre_completo', 'nombre_usuario', 'correo_electronico', 'telefono', 'contraseña_hash', 'foto_perfil', 'fecha_nacimiento', 'genero', 'ciudad', 'pais', 'idioma', 'fecha_registro', 'estado_cuenta', 'verificacion_correo', 'verificacion_telefono', 'rutas_favoritas', 'estaciones_favoritas', 'historial_viajes', 'nivel_usuario', 'ip_registro', 'dispositivo_registro'],
    'CONDUCTORES': ['ID_conductor', 'nombre_completo', 'documento_identidad', 'RUT', 'foto_conductor', 'telefono', 'correo', 'direccion', 'fecha_nacimiento', 'numero_licencia', 'categoria_licencia', 'fecha_expedicion_licencia', 'fecha_vencimiento_licencia', 'empresa_operadora', 'años_experiencia', 'estado_conductor', 'verificacion_identidad', 'antecedentes_verificados', 'calificacion_promedio', 'historial_incidentes'],
    // ... más headers
  };

  for (const [sheet, headerRow] of Object.entries(headers)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheet}!A1:Z1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headerRow]
      }
    });
  }

  console.log('Spreadsheet creado:', spreadsheetId);
}

initializeSheets();
