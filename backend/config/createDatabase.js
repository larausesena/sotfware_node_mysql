/**
 * ============================================
 * SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS
 * ============================================
 * Este script crea la base de datos si no existe
 * Debe ejecutarse una sola vez antes de iniciar el servidor
 */

// Importar mysql2 para conexión directa
const mysql = require('mysql2/promise');

// Importar dotenv para variables de entorno
require('dotenv').config();

/**
 * Función para crear la base de datos
 */
const createDatabase = async () => {
  let connection;
  
  try {
    console.log('🔧 Iniciando creación de base de datos...\n');
    
    // Conectar a MySQL SIN especificar base de datos
    console.log('📡 Conectando a MySQL...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('✅ Conexión a MySQL establecida\n');
    
    // Crear la base de datos si no existe
    const dbName = process.env.DB_NAME || 'ecommerce_db';
    console.log(`📦 Creando base de datos: ${dbName}...`);
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log(`✅ Base de datos '${dbName}' creada/verificada exitosamente\n`);
    
    // Cerrar conexión
    await connection.end();
    
    console.log('🎉 ¡Proceso completado! Ahora puedes iniciar el servidor con: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Error al crear la base de datos:', error.message);
    console.error('\n📋 Verifica que:');
    console.error('   1. XAMPP esté corriendo');
    console.error('   2. MySQL esté iniciado en XAMPP');
    console.error('   3. Las credenciales en .env sean correctas\n');
    
    if (connection) {
      await connection.end();
    }
    
    process.exit(1);
  }
};

// Ejecutar la función
createDatabase();
