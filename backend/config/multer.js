/**
 * ============================================
 * CONFIGURACIÓN DE MULTER
 * ============================================
 * Multer es un middleware para manejar la subida de archivos
 * Este archivo configura cómo y dónde se guardarán las imágenes
 */

// Importar multer para manejar archivos
const multer = require('multer');

// Importar path para trabajar con rutas de archivos
const path = require('path');

// Importar fs para verificar/crear directorios
const fs = require('fs');

// Importar dotenv para variables de entorno
require('dotenv').config();

// Obtener la ruta donde se guardarán los archivos
const uploadPath = process.env.UPLOAD_PATH || './uploads';

// Verificar si la carpeta uploads existe, si no, crearla
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`📁 Carpeta ${uploadPath} creada`);
}

/**
 * Configuración de almacenamiento de multer
 * Define dónde y cómo se guardarán los archivos
 */
const storage = multer.diskStorage({
  /**
   * destination: Define la carpeta destino donde se guardará el archivo
   * 
   * @param {Object} req - Objeto de petición HTTP
   * @param {Object} file - Archivo que se está subiendo
   * @param {Function} cb - Callback que se llama con (error, destination)
   */
  destination: function (req, file, cb) {
    // cb(null, ruta) -> null = sin error, ruta = carpeta destino
    cb(null, uploadPath);
  },
  
  /**
   * filename: Define el nombre con el que se guardará el archivo
   * Formato: timestamp-nombreoriginal.extension
   * Ejemplo: 1709578800000-producto.jpg
   * 
   * @param {Object} req - Objeto de petición HTTP
   * @param {Object} file - Archivo que se está subiendo
   * @param {Function} cb - Callback que se llama con (error, filename)
   */
  filename: function (req, file, cb) {
    // Generar nombre único usando timestamp + nombre original
    // Date.now() genera un timestamp único
    // path.extname() extrae la extensión del archivo (.jpg, .png, etc)
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

/**
 * Filtro para validar el tipo de archivo
 * Solo permite imágenes (jpg, jpeg, png, gif)
 * 
 * @param {Object} req - Objeto de petición HTTP
 * @param {Object} file - Archivo que se está subiendo
 * @param {Function} cb - Callback que se llama con (error, acceptFile)
 */
const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos para imágenes
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  // Verificar si el tipo del archivo está en la lista permitida
  if (allowedMimeTypes.includes(file.mimetype)) {
    // cb(null, true) -> Aceptar el archivo
    cb(null, true);
  } else {
    // cb(error, false) -> Rechazar el archivo
    cb(new Error('Solo se permiten imágenes (JPG, JPEG, PNG, GIF)'), false);
  }
};

/**
 * Configurar multer con las opciones definidas
 */
const upload = multer({
  storage: storage,              // Configuración de almacenamiento
  fileFilter: fileFilter,        // Filtro de validación de archivos
  limits: {
    // Límite de tamaño del archivo en bytes
    // Por defecto 5MB (5242880 bytes)
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880
  }
});

/**
 * Función para eliminar un archivo del servidor
 * Útil cuando se actualiza o elimina un producto
 * 
 * @param {String} filename - Nombre del archivo a eliminar
 * @returns {Boolean} - true si se eliminó, false si hubo error
 */
const deleteFile = (filename) => {
  try {
    // Construir la ruta completa del archivo
    const filePath = path.join(uploadPath, filename);
    
    // Verificar si el archivo existe
    if (fs.existsSync(filePath)) {
      // Eliminar el archivo
      fs.unlinkSync(filePath);
      console.log(`🗑️ Archivo eliminado: ${filename}`);
      return true;
    } else {
      console.log(`⚠️ Archivo no encontrado: ${filename}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al eliminar archivo:', error.message);
    return false;
  }
};

// Exportar configuración de multer y función de eliminación
module.exports = {
  upload,        // Middleware de multer para usar en rutas
  deleteFile     // Función para eliminar archivos
};
