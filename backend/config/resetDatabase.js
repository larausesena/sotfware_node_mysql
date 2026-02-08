/**
 * ============================================
 * SCRIPT DE RESET DE BASE DE DATOS
 * ============================================
 * Este script elimina y recrea la base de datos
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const resetDatabase = async () => {
  let connection;
  
  try {
    console.log('🔧 Iniciando reset de base de datos...\n');
    
    // Conectar a MySQL SIN especificar base de datos
    console.log('📡 Conectando a MySQL...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('✅ Conexión a MySQL establecida\n');
    
    const dbName = process.env.DB_NAME || 'ecommerce_db';
    
    // Eliminar la base de datos si existe
    console.log(`🗑️  Eliminando base de datos: ${dbName}...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`✅ Base de datos eliminada\n`);
    
    // Crear la base de datos nueva
    console.log(`📦 Creando base de datos: ${dbName}...`);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Base de datos '${dbName}' creada exitosamente\n`);
    
    // Cerrar conexión
    await connection.end();
    
    console.log('🎉 ¡Proceso completado! Ahora puedes iniciar el servidor con: npm run dev\n');
    
  } catch (error) {
    console.error('❌ Error al resetear la base de datos:', error.message);
    process.exit(1);
  }
};

// Ejecutar
resetDatabase();
