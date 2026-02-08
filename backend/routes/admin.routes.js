/**
 * ============================================
 * RUTAS DEL ADMINISTRADOR
 * ============================================
 * Agrupa todas las rutas de gestión del admin
 */

const express = require('express');
const router = express.Router();

// Importar middlewares
const { verificarAuth } = require('../middleware/auth');
const { esAdministrador, esAdminOAuxiliar, soloAdministrador } = require('../middleware/checkRole');

// Importar configuración de multer para subida de imágenes
const { upload } = require('../config/multer');

// Importar controladores
const categoriaController = require('../controllers/categoria.controller');
const subcategoriaController = require('../controllers/subcategoria.controller');
const productoController = require('../controllers/producto.controller');
const usuarioController = require('../controllers/usuario.controller');
const pedidoController = require('../controllers/pedido.controller');

// ==========================================
// MIDDLEWARE GLOBAL: Verificar autenticación y rol admin/auxiliar
// ==========================================
// Todas las rutas requieren autenticación y rol de administrador o auxiliar
// Las restricciones específicas se aplican en cada ruta
router.use(verificarAuth, esAdminOAuxiliar);

// ==========================================
// RUTAS DE CATEGORÍAS
// ==========================================

/**
 * GET /api/admin/categorias
 * Obtener todas las categorías
 */
router.get('/categorias', categoriaController.getCategorias);

/**
 * GET /api/admin/categorias/:id
 * Obtener una categoría por ID
 */
router.get('/categorias/:id', categoriaController.getCategoriaById);

/**
 * GET /api/admin/categorias/:id/stats
 * Obtener estadísticas de una categoría
 */
router.get('/categorias/:id/stats', categoriaController.getEstadisticasCategoria);

/**
 * POST /api/admin/categorias
 * Crear nueva categoría
 * Body: { nombre, descripcion }
 */
router.post('/categorias', categoriaController.crearCategoria);

/**
 * PUT /api/admin/categorias/:id
 * Actualizar categoría
 * Body: { nombre, descripcion }
 */
router.put('/categorias/:id', categoriaController.actualizarCategoria);

/**
 * PATCH /api/admin/categorias/:id/toggle
 * Activar/Desactivar categoría
 */
router.patch('/categorias/:id/toggle', categoriaController.toggleCategoria);

/**
 * DELETE /api/admin/categorias/:id
 * Eliminar categoría (solo si no tiene subcategorías ni productos)
 * SOLO ADMINISTRADOR
 */
router.delete('/categorias/:id', soloAdministrador, categoriaController.eliminarCategoria);

// ==========================================
// RUTAS DE SUBCATEGORÍAS
// ==========================================

/**
 * GET /api/admin/subcategorias
 * Obtener todas las subcategorías
 * Query: ?categoriaId=1&activo=true&incluirCategoria=true
 */
router.get('/subcategorias', subcategoriaController.getSubcategorias);

/**
 * GET /api/admin/subcategorias/:id
 * Obtener una subcategoría por ID
 */
router.get('/subcategorias/:id', subcategoriaController.getSubcategoriaById);

/**
 * GET /api/admin/subcategorias/:id/stats
 * Obtener estadísticas de una subcategoría
 */
router.get('/subcategorias/:id/stats', subcategoriaController.getEstadisticasSubcategoria);

/**
 * POST /api/admin/subcategorias
 * Crear nueva subcategoría
 * Body: { nombre, descripcion, categoriaId }
 */
router.post('/subcategorias', subcategoriaController.crearSubcategoria);

/**
 * PUT /api/admin/subcategorias/:id
 * Actualizar subcategoría
 * Body: { nombre, descripcion, categoriaId }
 */
router.put('/subcategorias/:id', subcategoriaController.actualizarSubcategoria);

/**
 * PATCH /api/admin/subcategorias/:id/toggle
 * Activar/Desactivar subcategoría
 */
router.patch('/subcategorias/:id/toggle', subcategoriaController.toggleSubcategoria);

/**
 * DELETE /api/admin/subcategorias/:id
 * Eliminar subcategoría (solo si no tiene productos)
 * SOLO ADMINISTRADOR
 */
router.delete('/subcategorias/:id', soloAdministrador, subcategoriaController.eliminarSubcategoria);

// ==========================================
// RUTAS DE PRODUCTOS
// ==========================================

/**
 * GET /api/admin/productos
 * Obtener todos los productos
 * Query: ?categoriaId=1&subcategoriaId=1&activo=true&conStock=true&buscar=texto&pagina=1&limite=10
 */
router.get('/productos', productoController.getProductos);

/**
 * GET /api/admin/productos/:id
 * Obtener un producto por ID
 */
router.get('/productos/:id', productoController.getProductoById);

/**
 * POST /api/admin/productos
 * Crear nuevo producto
 * Content-Type: multipart/form-data
 * Body: { nombre, descripcion, precio, stock, categoriaId, subcategoriaId, imagen (file) }
 * 
 * IMPORTANTE: Usar upload.single('imagen') middleware para subir imagen
 */
router.post('/productos', upload.single('imagen'), productoController.crearProducto);

/**
 * PUT /api/admin/productos/:id
 * Actualizar producto
 * Content-Type: multipart/form-data
 * Body: { nombre, descripcion, precio, stock, categoriaId, subcategoriaId, imagen (file) }
 */
router.put('/productos/:id', upload.single('imagen'), productoController.actualizarProducto);

/**
 * PATCH /api/admin/productos/:id/toggle
 * Activar/Desactivar producto
 */
router.patch('/productos/:id/toggle', productoController.toggleProducto);

/**
 * PATCH /api/admin/productos/:id/stock
 * Actualizar stock de un producto
 * Body: { cantidad, operacion: 'aumentar' | 'reducir' | 'establecer' }
 */
router.patch('/productos/:id/stock', productoController.actualizarStock);

/**
 * DELETE /api/admin/productos/:id
 * Eliminar producto
 * SOLO ADMINISTRADOR
 */
router.delete('/productos/:id', soloAdministrador, productoController.eliminarProducto);

// ==========================================
// RUTAS DE USUARIOS
// ==========================================

/**
 * GET /api/admin/usuarios/stats
 * Obtener estadísticas de usuarios
 * NOTA: Debe ir ANTES de /:id para no confundir 'stats' con un ID
 */
router.get('/usuarios/stats', usuarioController.getEstadisticasUsuarios);

/**
 * GET /api/admin/usuarios
 * Obtener todos los usuarios
 * Query: ?rol=cliente&activo=true&buscar=texto&pagina=1&limite=10
 */
router.get('/usuarios', usuarioController.getUsuarios);

/**
 * GET /api/admin/usuarios/:id
 * Obtener un usuario por ID
 */
router.get('/usuarios/:id', usuarioController.getUsuarioById);

/**
 * POST /api/admin/usuarios
 * Crear nuevo usuario
 * Body: { nombre, apellido, email, password, rol, telefono, direccion }
 * SOLO ADMINISTRADOR
 */
router.post('/usuarios', soloAdministrador, usuarioController.crearUsuario);

/**
 * PUT /api/admin/usuarios/:id
 * Actualizar usuario
 * Body: { nombre, apellido, telefono, direccion, rol }
 * SOLO ADMINISTRADOR
 */
router.put('/usuarios/:id', soloAdministrador, usuarioController.actualizarUsuario);

/**
 * PATCH /api/admin/usuarios/:id/toggle
 * Activar/Desactivar usuario
 * SOLO ADMINISTRADOR
 */
router.patch('/usuarios/:id/toggle', soloAdministrador, usuarioController.toggleUsuario);

/**
 * DELETE /api/admin/usuarios/:id
 * Eliminar usuario
 * SOLO ADMINISTRADOR
 */
router.delete('/usuarios/:id', soloAdministrador, usuarioController.eliminarUsuario);

// ==========================================
// RUTAS DE PEDIDOS (ADMIN)
// ==========================================

/**
 * GET /api/admin/pedidos/estadisticas
 * Obtener estadísticas de pedidos
 * NOTA: Debe ir ANTES de /:id
 */
router.get('/pedidos/estadisticas', pedidoController.getEstadisticasPedidos);

/**
 * GET /api/admin/pedidos
 * Obtener todos los pedidos
 * Query: ?estado=pendiente&usuarioId=1&pagina=1&limite=20
 */
router.get('/pedidos', pedidoController.getAllPedidos);

/**
 * GET /api/admin/pedidos/:id
 * Obtener un pedido específico por ID
 */
router.get('/pedidos/:id', pedidoController.getPedidoById);

/**
 * PUT /api/admin/pedidos/:id/estado
 * Actualizar estado de un pedido
 * Body: { estado }
 */
router.put('/pedidos/:id/estado', pedidoController.actualizarEstadoPedido);

// ==========================================
// EXPORTAR ROUTER
// ==========================================
module.exports = router;
