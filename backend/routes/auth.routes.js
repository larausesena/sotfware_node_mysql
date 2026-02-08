/**
 * ============================================
 * RUTAS DE AUTENTICACIÓN
 * ============================================
 * Define los endpoints para registro, login y gestión de perfil
 */

// Importar Router de Express
const express = require('express');
const router = express.Router();

// Importar controladores de autenticación
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword
} = require('../controllers/auth.controller');

// Importar middlewares
const { verificarAuth } = require('../middleware/auth');

// ==========================================
// RUTAS PÚBLICAS (No requieren autenticación)
// ==========================================

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario cliente
 * 
 * Body:
 * {
 *   "nombre": "Juan",
 *   "apellido": "Pérez",
 *   "email": "juan@ejemplo.com",
 *   "password": "password123",
 *   "telefono": "3001234567",      // Opcional
 *   "direccion": "Calle 123 #45-67" // Opcional
 * }
 * 
 * Respuesta exitosa (201):
 * {
 *   "success": true,
 *   "message": "Usuario registrado exitosamente",
 *   "data": {
 *     "usuario": { id, nombre, apellido, email, ... },
 *     "token": "eyJhbGciOiJIUzI1NiIs..."
 *   }
 * }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Iniciar sesión con email y contraseña
 * 
 * Body:
 * {
 *   "email": "admin@ecommerce.com",
 *   "password": "admin123"
 * }
 * 
 * Respuesta exitosa (200):
 * {
 *   "success": true,
 *   "message": "Inicio de sesión exitoso",
 *   "data": {
 *     "usuario": { id, nombre, apellido, email, rol, ... },
 *     "token": "eyJhbGciOiJIUzI1NiIs..."
 *   }
 * }
 */
router.post('/login', login);

// ==========================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ==========================================

/**
 * GET /api/auth/me
 * Obtener perfil del usuario autenticado
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
 * }
 * 
 * Respuesta exitosa (200):
 * {
 *   "success": true,
 *   "data": {
 *     "usuario": { id, nombre, apellido, email, rol, ... }
 *   }
 * }
 */
router.get('/me', verificarAuth, getMe);

/**
 * PUT /api/auth/me
 * Actualizar perfil del usuario autenticado
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
 * }
 * 
 * Body (todos los campos son opcionales):
 * {
 *   "nombre": "Juan Carlos",
 *   "apellido": "Pérez López",
 *   "telefono": "3001234567",
 *   "direccion": "Carrera 10 #20-30"
 * }
 * 
 * Respuesta exitosa (200):
 * {
 *   "success": true,
 *   "message": "Perfil actualizado exitosamente",
 *   "data": {
 *     "usuario": { id, nombre, apellido, ... }
 *   }
 * }
 */
router.put('/me', verificarAuth, updateMe);

/**
 * PUT /api/auth/change-password
 * Cambiar contraseña del usuario autenticado
 * 
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
 * }
 * 
 * Body:
 * {
 *   "passwordActual": "miPasswordVieja123",
 *   "passwordNueva": "miPasswordNueva456"
 * }
 * 
 * Respuesta exitosa (200):
 * {
 *   "success": true,
 *   "message": "Contraseña actualizada exitosamente"
 * }
 */
router.put('/change-password', verificarAuth, changePassword);

// ==========================================
// EXPORTAR ROUTER
// ==========================================
module.exports = router;
