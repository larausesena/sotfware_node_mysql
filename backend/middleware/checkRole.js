/**
 * ============================================
 * MIDDLEWARE DE VERIFICACIÓN DE ROLES
 * ============================================
 * Estos middlewares verifican que el usuario tenga el rol requerido
 * IMPORTANTE: Deben usarse DESPUÉS del middleware verificarAuth
 */

/**
 * Middleware para verificar que el usuario es administrador
 * 
 * Verifica que req.usuario existe (verificarAuth debe ejecutarse antes)
 * y que el rol es "administrador"
 * 
 * Uso en rutas de administrador:
 * router.post('/crear', verificarAuth, esAdministrador, controlador);
 * 
 * @param {Object} req - Request de Express (debe tener req.usuario del middleware verificarAuth)
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next() de Express
 */
const esAdministrador = (req, res, next) => {
  try {
    // Verificar que existe req.usuario (viene de verificarAuth)
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Debes iniciar sesión primero'
      });
    }
    
    // Verificar que el rol es administrador
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }
    
    // El usuario es administrador, continuar
    next();
    
  } catch (error) {
    console.error('Error en middleware esAdministrador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar que el usuario es cliente
 * 
 * Similar a esAdministrador pero verifica rol "cliente"
 * Útil para rutas exclusivas de clientes (como carrito de compras)
 * 
 * Uso en rutas de cliente:
 * router.post('/carrito', verificarAuth, esCliente, controlador);
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next() de Express
 */
const esCliente = (req, res, next) => {
  try {
    // Verificar que existe req.usuario
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Debes iniciar sesión primero'
      });
    }
    
    // Verificar que el rol es cliente
    if (req.usuario.rol !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Esta función es solo para clientes'
      });
    }
    
    // El usuario es cliente, continuar
    next();
    
  } catch (error) {
    console.error('Error en middleware esCliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware flexible para verificar múltiples roles
 * 
 * Permite especificar varios roles válidos
 * Útil cuando una ruta puede ser accedida por varios tipos de usuario
 * 
 * Uso con múltiples roles:
 * router.get('/perfil', verificarAuth, tieneRol(['cliente', 'administrador']), controlador);
 * 
 * @param {Array} rolesPermitidos - Array de roles que pueden acceder
 * @returns {Function} Middleware de Express
 */
const tieneRol = (rolesPermitidos) => {
  return (req, res, next) => {
    try {
      // Verificar que existe req.usuario
      if (!req.usuario) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado. Debes iniciar sesión primero'
        });
      }
      
      // Verificar que el rol del usuario está en la lista de roles permitidos
      if (!rolesPermitidos.includes(req.usuario.rol)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`
        });
      }
      
      // El usuario tiene un rol válido, continuar
      next();
      
    } catch (error) {
      console.error('Error en middleware tieneRol:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar permisos',
        error: error.message
      });
    }
  };
};

/**
 * Middleware para verificar que el usuario accede a sus propios datos
 * 
 * Verifica que el usuarioId en los parámetros coincide con el usuario autenticado
 * Los administradores pueden acceder a datos de cualquier usuario
 * 
 * Uso en rutas que acceden a datos de usuario:
 * router.get('/pedidos/:usuarioId', verificarAuth, esPropioUsuarioOAdmin, controlador);
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next() de Express
 */
const esPropioUsuarioOAdmin = (req, res, next) => {
  try {
    // Verificar que existe req.usuario
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Debes iniciar sesión primero'
      });
    }
    
    // Los administradores pueden acceder a datos de cualquier usuario
    if (req.usuario.rol === 'administrador') {
      return next();
    }
    
    // Obtener el usuarioId de los parámetros de la ruta
    const usuarioIdParam = req.params.usuarioId || req.params.id;
    
    // Verificar que el usuarioId coincide con el usuario autenticado
    if (parseInt(usuarioIdParam) !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No puedes acceder a datos de otros usuarios'
      });
    }
    
    // El usuario accede a sus propios datos, continuar
    next();
    
  } catch (error) {
    console.error('Error en middleware esPropioUsuarioOAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar que el usuario es administrador o auxiliar
 * 
 * Permite el acceso a usuarios con rol 'administrador' o 'auxiliar'
 * Útil para rutas del panel de administración que auxiliares pueden ver
 * 
 * Uso en rutas:
 * router.get('/lista', verificarAuth, esAdminOAuxiliar, controlador);
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next() de Express
 */
const esAdminOAuxiliar = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Debes iniciar sesión primero'
      });
    }
    
    if (!['administrador', 'auxiliar'].includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador o auxiliar'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware esAdminOAuxiliar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar que el usuario es solo administrador (no auxiliar)
 * 
 * Bloquea el acceso a operaciones críticas como eliminaciones
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next() de Express
 */
const soloAdministrador = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Debes iniciar sesión primero'
      });
    }
    
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden realizar esta operación'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware soloAdministrador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

// Exportar todos los middlewares
module.exports = {
  esAdministrador,
  esCliente,
  tieneRol,
  esPropioUsuarioOAdmin,
  esAdminOAuxiliar,
  soloAdministrador
};
