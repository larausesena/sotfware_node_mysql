/**
 * ============================================
 * SERVIDOR PRINCIPAL - E-COMMERCE BACKEND
 * ============================================
 * Este es el archivo principal del servidor backend
 * Configura Express, middlewares, rutas y conexión a base de datos
 */

// ==========================================
// IMPORTACIONES
// ==========================================

// Importar Express - Framework para crear el servidor web
const express = require('express');

// Importar CORS - Permite peticiones desde el frontend (React)
const cors = require('cors');

// Importar path - Para trabajar con rutas de archivos
const path = require('path');

// Importar dotenv - Para cargar variables de entorno desde .env
require('dotenv').config();

// Importar configuración de base de datos
const { testConnection, syncDatabase } = require('./config/database');

// Importar modelos y asociaciones
const { initAssociations } = require('./models');

// Importar seeders
const { runSeeders } = require('./seeders/adminSeeder');

// ==========================================
// CREAR APLICACIÓN EXPRESS
// ==========================================
const app = express();

// Obtener el puerto desde variables de entorno o usar 5000 por defecto
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARES GLOBALES
// ==========================================

/**
 * CORS - Permitir peticiones desde el frontend
 * Configura qué dominios pueden hacer peticiones al backend
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // URL del frontend
  credentials: true, // Permitir envío de cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'] // Headers permitidos
}));

/**
 * express.json() - Parsear el body de las peticiones en formato JSON
 * Permite acceder a req.body en formato objeto JavaScript
 */
app.use(express.json());

/**
 * express.urlencoded() - Parsear el body de formularios
 * Permite recibir datos de formularios HTML
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Servir archivos estáticos (imágenes) desde la carpeta uploads
 * Las imágenes estarán disponibles en: http://localhost:5000/uploads/imagen.jpg
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Middleware para logging de peticiones (solo en desarrollo)
 * Muestra en consola cada petición que llega al servidor
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// ==========================================
// RUTAS
// ==========================================

/**
 * Ruta raíz - Verificar que el servidor está corriendo
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Servidor E-commerce Backend corriendo correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Ruta de salud - Health check para verificar el estado del servidor
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// RUTAS DE LA API
// ==========================================

/**
 * Rutas de autenticación
 * Incluye registro, login, perfil, etc.
 */
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

/**
 * Rutas del administrador
 * Requieren autenticación y rol de administrador
 * Incluye: categorías, subcategorías, productos, usuarios
 */
const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

/**
 * Rutas del cliente
 * Incluye rutas públicas (catálogo) y protegidas (carrito, pedidos)
 */
const clienteRoutes = require('./routes/cliente.routes');
app.use('/api', clienteRoutes);

// ==========================================
// MANEJO DE RUTAS NO ENCONTRADAS (404)
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '❌ Ruta no encontrada',
    path: req.path
  });
});

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Error de Multer (subida de archivos)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: 'Error al subir archivo',
      error: err.message
    });
  }
  
  // Otros errores
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==========================================
// INICIALIZAR SERVIDOR Y BASE DE DATOS
// ==========================================

/**
 * Función principal para iniciar el servidor
 * 1. Prueba la conexión a MySQL
 * 2. Sincroniza los modelos (crea las tablas)
 * 3. Inicia el servidor Express
 */
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor E-commerce Backend...\n');
    
    // PASO 1: Probar conexión a MySQL
    console.log('📡 Conectando a MySQL...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a MySQL. Verifica XAMPP y el archivo .env');
      process.exit(1); // Salir si no hay conexión
    }
    
    // PASO 2: Sincronizar modelos con la base de datos
    // force: false - NO borra las tablas existentes
    // alter: false - NO modifica la estructura de las tablas (seguro para producción)
    console.log('\n📊 Sincronizando modelos con la base de datos...');
    
    // Inicializar asociaciones entre modelos
    initAssociations();
    
    // En desarrollo: alter puede ser true para actualizar estructura
    // En producción: ambos deben ser false para proteger los datos
    const alterTables = process.env.NODE_ENV === 'development';
    const dbSynced = await syncDatabase(false, alterTables);
    
    if (!dbSynced) {
      console.error('❌ Error al sincronizar la base de datos');
      process.exit(1);
    }
    
    // PASO 3: Ejecutar seeders (datos iniciales)
    await runSeeders();
    
    // PASO 4: Iniciar servidor Express
    app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log(`║  ✅ Servidor corriendo en puerto ${PORT}          ║`);
      console.log(`║  🌐 URL: http://localhost:${PORT}                ║`);
      console.log(`║  📚 Documentación API: http://localhost:${PORT}  ║`);
      console.log(`║  🗄️  Base de datos: ${process.env.DB_NAME}        ║`);
      console.log(`║  🔧 Modo: ${process.env.NODE_ENV}                     ║`);
      console.log('╚════════════════════════════════════════════════╝\n');
      console.log('📝 Servidor listo para recibir peticiones...\n');
    });
    
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

// ==========================================
// MANEJO DE CIERRE GRACEFUL
// ==========================================

/**
 * Capturar CTRL+C para cerrar el servidor correctamente
 */
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Cerrando servidor...');
  process.exit(0);
});

/**
 * Capturar errores no manejados
 */
process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado:', err);
  process.exit(1);
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
startServer();

// Exportar app para testing (opcional)
module.exports = app;
