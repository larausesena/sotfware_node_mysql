/**
 * ============================================
 * CONFIGURACIÓN DE JWT (JSON WEB TOKENS)
 * ============================================
 * Este archivo contiene funciones para generar y verificar tokens JWT
 * Los JWT se usan para autenticar usuarios sin necesidad de sesiones
 */

// Importar jsonwebtoken para manejar los tokens
const jwt = require('jsonwebtoken');

// Importar dotenv para acceder a las variables de entorno
require('dotenv').config();

/**
 * Generar un token JWT para un usuario
 * 
 * @param {Object} payload - Datos que se incluirán en el token (id, email, rol)
 * @returns {String} - Token JWT generado
 * 
 * Ejemplo de uso:
 * const token = generateToken({ id: 1, email: 'usuario@email.com', rol: 'cliente' });
 */
const generateToken = (payload) => {
  try {
    // jwt.sign() crea y firma un token
    // Parámetros:
    // 1. payload: datos a incluir en el token
    // 2. secret: clave secreta para firmar (desde .env)
    // 3. options: opciones adicionales como tiempo de expiración
    const token = jwt.sign(
      payload,                          // Datos del usuario
      process.env.JWT_SECRET,           // Clave secreta desde .env
      { expiresIn: process.env.JWT_EXPIRES_IN }  // Tiempo de expiración
    );
    
    return token;
  } catch (error) {
    console.error('❌ Error al generar token JWT:', error.message);
    throw new Error('Error al generar token de autenticación');
  }
};

/**
 * Verificar si un token JWT es válido
 * 
 * @param {String} token - Token JWT a verificar
 * @returns {Object} - Datos decodificados del token si es válido
 * @throws {Error} - Si el token es inválido o ha expirado
 * 
 * Ejemplo de uso:
 * const decoded = verifyToken(token);
 * console.log(decoded.id); // ID del usuario
 */
const verifyToken = (token) => {
  try {
    // jwt.verify() verifica la firma del token y lo decodifica
    // Parámetros:
    // 1. token: el token JWT a verificar
    // 2. secret: la misma clave secreta usada para firmarlo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    return decoded;
  } catch (error) {
    // Diferentes tipos de errores
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      throw new Error('Error al verificar token');
    }
  }
};

/**
 * Extraer el token del header Authorization
 * El token viene en formato: "Bearer <token>"
 * 
 * @param {String} authHeader - Header Authorization de la petición
 * @returns {String|null} - Token extraído o null si no existe
 * 
 * Ejemplo de uso:
 * const token = extractToken(req.headers.authorization);
 */
const extractToken = (authHeader) => {
  // Verificar que el header existe y empieza con "Bearer "
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extraer solo el token (quitar "Bearer ")
    return authHeader.substring(7);
  }
  
  return null;
};

// Exportar las funciones para usarlas en otros archivos
module.exports = {
  generateToken,    // Función para generar tokens
  verifyToken,      // Función para verificar tokens
  extractToken      // Función para extraer token del header
};
