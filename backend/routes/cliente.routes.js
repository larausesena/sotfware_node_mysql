/**
 * ============================================
 * RUTAS DEL CLIENTE
 * ============================================
 * Rutas públicas y para clientes autenticados
 */

const express = require('express');
const router = express.Router();

// Importar middlewares
const { verificarAuth } = require('../middleware/auth');
const { esCliente } = require('../middleware/checkRole');

// Importar controladores
const catalogoController = require('../controllers/catalogo.controller');
const carritoController = require('../controllers/carrito.controller');
const pedidoController = require('../controllers/pedido.controller');

// ============================================
// RUTAS PÚBLICAS - CATÁLOGO
// ============================================
// No requieren autenticación

/**
 * GET /api/catalogo/productos
 * Obtener productos con filtros y paginación
 */
router.get('/catalogo/productos', catalogoController.getProductos);

/**
 * GET /api/catalogo/productos/:id
 * Obtener un producto específico
 */
router.get('/catalogo/productos/:id', catalogoController.getProductoById);

/**
 * GET /api/catalogo/categorias
 * Obtener todas las categorías activas
 */
router.get('/catalogo/categorias', catalogoController.getCategorias);

/**
 * GET /api/catalogo/categorias/:id/subcategorias
 * Obtener subcategorías de una categoría
 */
router.get('/catalogo/categorias/:id/subcategorias', catalogoController.getSubcategoriasPorCategoria);

/**
 * GET /api/catalogo/destacados
 * Obtener productos destacados/recientes
 */
router.get('/catalogo/destacados', catalogoController.getProductosDestacados);

// ============================================
// RUTAS DE CARRITO
// ============================================
// Requieren autenticación (cliente o admin)

/**
 * GET /api/cliente/carrito
 * Obtener carrito del usuario
 */
router.get('/cliente/carrito', verificarAuth, carritoController.getCarrito);

/**
 * POST /api/cliente/carrito
 * Agregar producto al carrito
 */
router.post('/cliente/carrito', verificarAuth, carritoController.agregarAlCarrito);

/**
 * PUT /api/cliente/carrito/:id
 * Actualizar cantidad de un item
 */
router.put('/cliente/carrito/:id', verificarAuth, carritoController.actualizarItemCarrito);

/**
 * DELETE /api/cliente/carrito/:id
 * Eliminar un item del carrito
 */
router.delete('/cliente/carrito/:id', verificarAuth, carritoController.eliminarItemCarrito);

/**
 * DELETE /api/cliente/carrito
 * Vaciar todo el carrito
 */
router.delete('/cliente/carrito', verificarAuth, carritoController.vaciarCarrito);

// ============================================
// RUTAS DE PEDIDOS - CLIENTE
// ============================================
// Requieren autenticación (cliente o admin)

/**
 * POST /api/cliente/pedidos
 * Crear pedido desde el carrito (checkout)
 */
router.post('/cliente/pedidos', verificarAuth, pedidoController.crearPedido);

/**
 * GET /api/cliente/pedidos
 * Obtener pedidos del usuario autenticado
 */
router.get('/cliente/pedidos', verificarAuth, pedidoController.getMisPedidos);

/**
 * GET /api/cliente/pedidos/:id
 * Obtener un pedido específico
 */
router.get('/cliente/pedidos/:id', verificarAuth, pedidoController.getPedidoById);

/**
 * PUT /api/cliente/pedidos/:id/cancelar
 * Cancelar un pedido (solo si está pendiente)
 */
router.put('/cliente/pedidos/:id/cancelar', verificarAuth, pedidoController.cancelarPedido);

module.exports = router;
