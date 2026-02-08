/**
 * ============================================
 * CONTROLADOR DE USUARIOS (ADMIN)
 * ============================================
 * Maneja la gestión de usuarios por administradores
 * Lista usuarios, activa/desactiva cuentas
 */

// Importar modelo Usuario
const Usuario = require('../models/Usuario');

/**
 * Obtener todos los usuarios
 * 
 * GET /api/admin/usuarios
 * Query params:
 * - rol: 'cliente' | 'administrador'
 * - activo: true/false
 * - buscar: texto para buscar en nombre, apellido o email
 * - pagina: número de página
 * - limite: registros por página
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getUsuarios = async (req, res) => {
  try {
    const { rol, activo, buscar, pagina = 1, limite = 10 } = req.query;
    
    // Construir filtros
    const where = {};
    if (rol) where.rol = rol;
    if (activo !== undefined) where.activo = activo === 'true';
    
    // Búsqueda por texto
    if (buscar) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { nombre: { [Op.like]: `%${buscar}%` } },
        { apellido: { [Op.like]: `%${buscar}%` } },
        { email: { [Op.like]: `%${buscar}%` } }
      ];
    }
    
    // Paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Obtener usuarios (sin password)
    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limite),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        usuarios,
        paginacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / parseInt(limite))
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getUsuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

/**
 * Obtener un usuario por ID
 * 
 * GET /api/admin/usuarios/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: {
        usuario
      }
    });
    
  } catch (error) {
    console.error('Error en getUsuarioById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

/**
 * Crear nuevo usuario (por admin)
 * 
 * POST /api/admin/usuarios
 * Body: { nombre, apellido, email, password, rol, telefono, direccion }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, telefono, direccion } = req.body;
    
    // Validaciones
    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, apellido, email, password y rol'
      });
    }
    
    // Validar rol
    if (!['cliente', 'auxiliar', 'administrador'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Debe ser: cliente, auxiliar o administrador'
      });
    }
    
    // Verificar email único
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    // Crear usuario
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      rol,
      telefono: telefono || null,
      direccion: direccion || null,
      activo: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        usuario: nuevoUsuario.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Error en crearUsuario:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message
    });
  }
};

/**
 * Actualizar usuario (por admin)
 * 
 * PUT /api/admin/usuarios/:id
 * Body: { nombre, apellido, telefono, direccion, rol }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, direccion, rol } = req.body;
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Validar rol si se proporciona
    if (rol && !['cliente', 'administrador'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }
    
    // Actualizar campos
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (direccion !== undefined) usuario.direccion = direccion;
    if (rol !== undefined) usuario.rol = rol;
    
    await usuario.save();
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: {
        usuario: usuario.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarUsuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

/**
 * Activar/Desactivar usuario
 * 
 * PATCH /api/admin/usuarios/:id/toggle
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const toggleUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir desactivar al propio admin
    if (usuario.id === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }
    
    usuario.activo = !usuario.activo;
    await usuario.save();
    
    res.json({
      success: true,
      message: `Usuario ${usuario.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        usuario: usuario.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Error en toggleUsuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del usuario',
      error: error.message
    });
  }
};

/**
 * Eliminar usuario
 * 
 * DELETE /api/admin/usuarios/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No permitir eliminar al propio admin
    if (usuario.id === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }
    
    await usuario.destroy();
    
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error en eliminarUsuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de usuarios
 * 
 * GET /api/admin/usuarios/stats
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getEstadisticasUsuarios = async (req, res) => {
  try {
    const totalUsuarios = await Usuario.count();
    const totalClientes = await Usuario.count({ where: { rol: 'cliente' } });
    const totalAdmins = await Usuario.count({ where: { rol: 'administrador' } });
    const usuariosActivos = await Usuario.count({ where: { activo: true } });
    const usuariosInactivos = await Usuario.count({ where: { activo: false } });
    
    res.json({
      success: true,
      data: {
        total: totalUsuarios,
        porRol: {
          clientes: totalClientes,
          administradores: totalAdmins
        },
        porEstado: {
          activos: usuariosActivos,
          inactivos: usuariosInactivos
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getEstadisticasUsuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Exportar controladores
module.exports = {
  getUsuarios,
  getUsuarioById,
  crearUsuario,
  actualizarUsuario,
  toggleUsuario,
  eliminarUsuario,
  getEstadisticasUsuarios
};
