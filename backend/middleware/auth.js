/**
 * ============================================
 * MIDDLEWARE DE AUTENTICACIÓN JWT
 * ============================================
 * Este middleware verifica que el usuario tenga un token JWT válido
 * Se usa en rutas protegidas que requieren autenticación
 */

// Importar funciones de JWT
const { verifyToken, extractToken } = require('../config/jwt');

// Importar modelo Usuario
const Usuario = require('../models/Usuario');

/**
 * Middleware para verificar autenticación
 * 
 * Verifica que:
 * 1. El token existe en el header Authorization
 * 2. El token es válido y no ha expirado
 * 3. El usuario del token existe en la base de datos
 * 4. El usuario está activo
 * 
 * Si todo es válido, agrega el usuario a req.usuario
 * Si algo falla, retorna error 401 (No autorizado)
 * 
 * Uso en rutas:
 * router.get('/ruta-protegida', verificarAuth, controlador);
 */
const verificarAuth = async (req, res, next) => {
  try {
    // PASO 1: Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }
    
    // Extraer el token (quitar "Bearer ")
    const token = extractToken(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación inválido'
      });
    }
    
    // PASO 2: Verificar que el token es válido
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message // "Token expirado" o "Token inválido"
      });
    }
    
    // PASO 3: Buscar el usuario en la base de datos
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: { exclude: ['password'] } // No incluir la contraseña
    });
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // PASO 4: Verificar que el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador'
      });
    }
    
    // PASO 5: Agregar el usuario al objeto req para uso posterior
    // Ahora en los controladores podemos acceder a req.usuario
    req.usuario = usuario;
    
    // Continuar con el siguiente middleware o controlador
    next();
    
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar autenticación',
      error: error.message
    });
  }
};

/**
 * Middleware opcional de autenticación
 * Similar a verificarAuth pero no retorna error si no hay token
 * Solo agrega el usuario a req.usuario si el token es válido
 * 
 * Útil para rutas que funcionan con o sin autenticación
 * Ejemplo: Catálogo de productos (todos pueden ver, pero usuarios logueados ven más info)
 */
const verificarAuthOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Si no hay token, continuar sin usuario
    if (!authHeader) {
      req.usuario = null;
      return next();
    }
    
    const token = extractToken(authHeader);
    
    if (!token) {
      req.usuario = null;
      return next();
    }
    
    try {
      const decoded = verifyToken(token);
      const usuario = await Usuario.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (usuario && usuario.activo) {
        req.usuario = usuario;
      } else {
        req.usuario = null;
      }
    } catch (error) {
      // Token inválido o expirado, continuar sin usuario
      req.usuario = null;
    }
    
    next();
    
  } catch (error) {
    console.error('Error en middleware de autenticación opcional:', error);
    req.usuario = null;
    next();
  }
};

// Exportar los middlewares
module.exports = {
  verificarAuth,
  verificarAuthOpcional
};
