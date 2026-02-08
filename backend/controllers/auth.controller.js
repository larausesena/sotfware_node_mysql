/**
 * ============================================
 * CONTROLADOR DE AUTENTICACIÓN
 * ============================================
 * Maneja el registro, login y obtención de perfil de usuarios
 */

// Importar modelo Usuario
const Usuario = require('../models/Usuario');

// Importar función para generar tokens JWT
const { generateToken } = require('../config/jwt');

/**
 * Registrar nuevo usuario
 * 
 * Crea un nuevo usuario cliente en el sistema
 * Los administradores solo pueden ser creados desde el seeder o por otro administrador
 * 
 * POST /api/auth/register
 * Body: { nombre, apellido, email, password, telefono, direccion }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const register = async (req, res) => {
  try {
    // Extraer datos del body
    const { nombre, apellido, email, password, telefono, direccion } = req.body;
    
    // VALIDACIÓN 1: Verificar que todos los campos requeridos están presentes
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, apellido, email y password son obligatorios'
      });
    }
    
    // VALIDACIÓN 2: Verificar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido'
      });
    }
    
    // VALIDACIÓN 3: Verificar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // VALIDACIÓN 4: Verificar que el email no esté registrado
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    // CREAR USUARIO
    // El hook beforeCreate en el modelo se encargará de hashear la contraseña
    // El rol por defecto es 'cliente' (definido en el modelo)
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      telefono: telefono || null,
      direccion: direccion || null,
      rol: 'cliente' // Forzar rol cliente (por seguridad)
    });
    
    // GENERAR TOKEN JWT con datos básicos del usuario
    const token = generateToken({
      id: nuevoUsuario.id,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol
    });
    
    // RESPUESTA EXITOSA
    // El método toJSON() del modelo excluye automáticamente el password
    const usuarioRespuesta = nuevoUsuario.toJSON();
    delete usuarioRespuesta.password;
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuario: usuarioRespuesta,
        token
      }
    });
    
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

/**
 * Iniciar sesión (Login)
 * 
 * Autentica un usuario con email y contraseña
 * Retorna el usuario y un token JWT si las credenciales son correctas
 * 
 * POST /api/auth/login
 * Body: { email, password }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const login = async (req, res) => {
  try {
    // Extraer credenciales del body
    const { email, password } = req.body;
    
    // VALIDACIÓN 1: Verificar que se proporcionaron email y password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }
    
    // VALIDACIÓN 2: Buscar usuario por email
    // Necesitamos incluir el password aquí (normalmente se excluye)
    const usuario = await Usuario.scope('withPassword').findOne({
      where: { email }
    });
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // VALIDACIÓN 3: Verificar que el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador'
      });
    }
    
    // VALIDACIÓN 4: Verificar la contraseña
    // Usamos el método compararPassword() del modelo Usuario
    const passwordValida = await usuario.compararPassword(password);
    
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // GENERAR TOKEN JWT con datos básicos del usuario
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    });
    
    // PREPARAR RESPUESTA (sin password)
    const usuarioSinPassword = usuario.toJSON();
    delete usuarioSinPassword.password;
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        usuario: usuarioSinPassword,
        token
      }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

/**
 * Obtener perfil del usuario autenticado
 * 
 * Retorna los datos del usuario que está autenticado
 * Requiere middleware verificarAuth
 * 
 * GET /api/auth/me
 * Headers: { Authorization: 'Bearer TOKEN' }
 * 
 * @param {Object} req - Request de Express (contiene req.usuario del middleware)
 * @param {Object} res - Response de Express
 */
const getMe = async (req, res) => {
  try {
    // El usuario ya está en req.usuario (viene del middleware verificarAuth)
    // Pero volvemos a consultar para obtener datos actualizados
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        usuario
      }
    });
    
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

/**
 * Actualizar perfil del usuario autenticado
 * 
 * Permite al usuario actualizar su información personal
 * No permite cambiar el rol o el estado activo
 * 
 * PUT /api/auth/me
 * Headers: { Authorization: 'Bearer TOKEN' }
 * Body: { nombre, apellido, telefono, direccion }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const updateMe = async (req, res) => {
  try {
    // Extraer campos permitidos (no permitimos cambiar rol ni activo)
    const { nombre, apellido, telefono, direccion } = req.body;
    
    // Buscar usuario
    const usuario = await Usuario.findByPk(req.usuario.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // ACTUALIZAR CAMPOS
    // Solo actualizamos los campos que vienen en el body
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (direccion !== undefined) usuario.direccion = direccion;
    
    // Guardar cambios
    await usuario.save();
    
    // RESPUESTA EXITOSA (sin password)
    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        usuario: usuario.toJSON()
      }
    });
    
  } catch (error) {
    console.error('Error en updateMe:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

/**
 * Cambiar contraseña del usuario autenticado
 * 
 * Permite al usuario cambiar su contraseña
 * Requiere la contraseña actual por seguridad
 * 
 * PUT /api/auth/change-password
 * Headers: { Authorization: 'Bearer TOKEN' }
 * Body: { passwordActual, passwordNueva }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const changePassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    
    // VALIDACIÓN 1: Verificar que se proporcionaron ambas contraseñas
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere contraseña actual y nueva contraseña'
      });
    }
    
    // VALIDACIÓN 2: Verificar longitud de nueva contraseña
    if (passwordNueva.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // VALIDACIÓN 3: Buscar usuario con password incluido
    const usuario = await Usuario.scope('withPassword').findByPk(req.usuario.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // VALIDACIÓN 4: Verificar que la contraseña actual es correcta
    const passwordValida = await usuario.compararPassword(passwordActual);
    
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }
    
    // ACTUALIZAR CONTRASEÑA
    // El hook beforeUpdate se encargará de hashear la nueva contraseña
    usuario.password = passwordNueva;
    await usuario.save();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
    
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
};

// Exportar todos los controladores
module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword
};
