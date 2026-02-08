/**
 * ============================================
 * CONFIGURACIÓN DE LA BASE DE DATOS
 * ============================================
 * Este archivo configura la conexión con MySQL usando Sequelize ORM
 * Sequelize es un ORM (Object-Relational Mapping) que permite trabajar
 * con la base de datos usando objetos JavaScript en lugar de SQL puro
 */

// Importar Sequelize
const { Sequelize } = require('sequelize');

// Importar dotenv para leer las variables de entorno del archivo .env
require('dotenv').config();

/**
 * Crear instancia de Sequelize con la configuración de la base de datos
 * Los parámetros son:
 * 1. Nombre de la base de datos
 * 2. Usuario de MySQL
 * 3. Contraseña de MySQL
 * 4. Objeto de configuración adicional
 */
const sequelize = new Sequelize(
  process.env.DB_NAME,      // Nombre de la base de datos desde .env
  process.env.DB_USER,      // Usuario de MySQL desde .env
  process.env.DB_PASSWORD,  // Contraseña de MySQL desde .env
  {
    host: process.env.DB_HOST,    // Host donde está MySQL (localhost)
    port: process.env.DB_PORT,    // Puerto de MySQL (3306)
    dialect: 'mysql',             // Tipo de base de datos que usamos
    
    // Configuración del pool de conexiones
    // El pool mantiene conexiones abiertas para reutilizarlas y mejorar el rendimiento
    pool: {
      max: 5,        // Número máximo de conexiones simultáneas
      min: 0,        // Número mínimo de conexiones
      acquire: 30000,  // Tiempo máximo (ms) para obtener una conexión
      idle: 10000    // Tiempo máximo (ms) que una conexión puede estar inactiva
    },
    
    // Configuración de logging
    // false = no mostrar queries SQL en consola
    // console.log = mostrar queries SQL en consola (útil para desarrollo)
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Zona horaria
    timezone: '-05:00', // Zona horaria de Colombia (ajustar según necesidad)
    
    // Opciones adicionales
    define: {
      // timestamps: true crea automáticamente campos createdAt y updatedAt
      timestamps: true,
      
      // underscored: true usa snake_case para nombres de columnas (ej: created_at)
      // false usa camelCase (ej: createdAt)
      underscored: false,
      
      // freezeTableName: true usa el nombre del modelo tal cual para la tabla
      // false pluraliza el nombre (ej: User -> Users)
      freezeTableName: true
    }
  }
);

/**
 * Función para probar la conexión a la base de datos
 * Esta función se llamará al iniciar el servidor
 */
const testConnection = async () => {
  try {
    // Intentar autenticar (conectar) con la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    console.error('📋 Verifica que XAMPP esté corriendo y las credenciales en .env sean correctas');
    return false;
  }
};

/**
 * Función para sincronizar los modelos con la base de datos
 * Esta función creará las tablas automáticamente basándose en los modelos
 * 
 * @param {boolean} force - Si es true, elimina y recrea todas las tablas (usar solo en desarrollo)
 * @param {boolean} alter - Si es true, modifica las tablas existentes para que coincidan con los modelos
 */
const syncDatabase = async (force = false, alter = false) => {
  try {
    // Sincronizar todos los modelos con la base de datos
    await sequelize.sync({ force, alter });
    
    if (force) {
      console.log('🔄 Base de datos sincronizada (todas las tablas recreadas).');
    } else if (alter) {
      console.log('🔄 Base de datos sincronizada (tablas alteradas según modelos).');
    } else {
      console.log('✅ Base de datos sincronizada correctamente.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error.message);
    return false;
  }
};

// Exportar la instancia de sequelize y las funciones
module.exports = {
  sequelize,        // Instancia de Sequelize para usarla en otros archivos
  testConnection,   // Función para probar la conexión
  syncDatabase      // Función para sincronizar modelos con la base de datos
};
