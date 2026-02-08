/**
 * ============================================
 * CONTROLADOR DE PEDIDOS
 * ============================================
 * Gestión de pedidos (checkout y consulta)
 * Requiere autenticación
 */

// Importar modelos
const Pedido = require('../models/Pedido');
const DetallePedido = require('../models/DetallePedido');
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');
const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');

/**
 * Crear pedido desde el carrito (checkout)
 * 
 * POST /api/cliente/pedidos
 * Body: { direccionEnvio, metodoPago, notasAdicionales }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const crearPedido = async (req, res) => {
  // Iniciar transacción
  const { sequelize } = require('../config/database');
  const t = await sequelize.transaction();
  
  try {
    const { direccionEnvio, telefono, metodoPago = 'efectivo', notasAdicionales } = req.body;
    
    // VALIDACIÓN 1: Dirección requerida
    if (!direccionEnvio || direccionEnvio.trim() === '') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'La dirección de envío es requerida'
      });
    }
    
    // VALIDACIÓN 1b: Teléfono requerido
    if (!telefono || telefono.trim() === '') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El teléfono es requerido'
      });
    }
    
    // VALIDACIÓN 2: Método de pago válido
    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
    if (!metodosValidos.includes(metodoPago)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Método de pago inválido. Opciones: ${metodosValidos.join(', ')}`
      });
    }
    
    // VALIDACIÓN 3: Obtener items del carrito
    const itemsCarrito = await Carrito.findAll({
      where: { usuarioId: req.usuario.id },
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['id', 'nombre', 'precio', 'stock', 'activo']
      }],
      transaction: t
    });
    
    if (itemsCarrito.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }
    
    // VALIDACIÓN 4: Verificar stock y productos activos
    const erroresValidacion = [];
    let totalPedido = 0;
    
    for (const item of itemsCarrito) {
      const producto = item.producto;
      
      // Verificar que el producto está activo
      if (!producto.activo) {
        erroresValidacion.push(`${producto.nombre} ya no está disponible`);
        continue;
      }
      
      // Verificar stock suficiente
      if (item.cantidad > producto.stock) {
        erroresValidacion.push(
          `${producto.nombre}: stock insuficiente (disponible: ${producto.stock}, solicitado: ${item.cantidad})`
        );
        continue;
      }
      
      // Calcular total
      totalPedido += parseFloat(item.precioUnitario) * item.cantidad;
    }
    
    // Si hay errores de validación, retornar
    if (erroresValidacion.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Error en validación del carrito',
        errores: erroresValidacion
      });
    }
    
    // CREAR PEDIDO
    const pedido = await Pedido.create({
      usuarioId: req.usuario.id,
      total: totalPedido,
      estado: 'pendiente',
      direccionEnvio,
      telefono,
      metodoPago,
      notasAdicionales
    }, { transaction: t });
    
    // CREAR DETALLES DEL PEDIDO Y ACTUALIZAR STOCK
    const detallesPedido = [];
    
    for (const item of itemsCarrito) {
      const producto = item.producto;
      
      // Crear detalle
      const detalle = await DetallePedido.create({
        pedidoId: pedido.id,
        productoId: producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: parseFloat(item.precioUnitario) * item.cantidad
      }, { transaction: t });
      
      detallesPedido.push(detalle);
      
      // Reducir stock del producto
      producto.stock -= item.cantidad;
      await producto.save({ transaction: t });
    }
    
    // VACIAR EL CARRITO
    await Carrito.destroy({
      where: { usuarioId: req.usuario.id },
      transaction: t
    });
    
    // CONFIRMAR TRANSACCIÓN
    await t.commit();
    
    // Recargar pedido con relaciones
    await pedido.reload({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'email']
        },
        {
          model: DetallePedido,
          as: 'detalles',
          include: [{
            model: Producto,
            as: 'producto',
            attributes: ['id', 'nombre', 'precio', 'imagen']
          }]
        }
      ]
    });
    
    // RESPUESTA EXITOSA
    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: {
        pedido
      }
    });
    
  } catch (error) {
    // Revertir transacción en caso de error
    await t.rollback();
    console.error('Error en crearPedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear pedido',
      error: error.message
    });
  }
};

/**
 * Obtener pedidos del usuario autenticado
 * 
 * GET /api/cliente/pedidos
 * Query: ?estado=pendiente&pagina=1&limite=10
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getMisPedidos = async (req, res) => {
  try {
    const { estado, pagina = 1, limite = 10 } = req.query;
    
    // Filtros
    const where = { usuarioId: req.usuario.id };
    if (estado) where.estado = estado;
    
    // Paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Consultar pedidos
    const { count, rows: pedidos } = await Pedido.findAndCountAll({
      where,
      include: [
        {
          model: DetallePedido,
          as: 'detalles',
          include: [{
            model: Producto,
            as: 'producto',
            attributes: ['id', 'nombre', 'imagen']
          }]
        }
      ],
      limit: parseInt(limite),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        pedidos,
        paginacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / parseInt(limite))
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getMisPedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos',
      error: error.message
    });
  }
};

/**
 * Obtener un pedido específico por ID
 * 
 * GET /api/cliente/pedidos/:id
 * 
 * Solo puede ver sus propios pedidos (o admin puede ver cualquiera)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Construir filtros (cliente solo ve sus pedidos, admin ve todos)
    const where = { id };
    if (req.usuario.rol !== 'administrador') {
      where.usuarioId = req.usuario.id;
    }
    
    // Buscar pedido
    const pedido = await Pedido.findOne({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'email']
        },
        {
          model: DetallePedido,
          as: 'detalles',
          include: [{
            model: Producto,
            as: 'producto',
            attributes: ['id', 'nombre', 'descripcion', 'precio', 'imagen'],
            include: [
              {
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
              },
              {
                model: Subcategoria,
                as: 'subcategoria',
                attributes: ['id', 'nombre']
              }
            ]
          }]
        }
      ]
    });
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        pedido
      }
    });
    
  } catch (error) {
    console.error('Error en getPedidoById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedido',
      error: error.message
    });
  }
};

/**
 * Cancelar un pedido
 * 
 * PUT /api/cliente/pedidos/:id/cancelar
 * 
 * Solo se puede cancelar si está en estado 'pendiente'
 * Devuelve el stock a los productos
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const cancelarPedido = async (req, res) => {
  const { sequelize } = require('../config/database');
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    // Buscar pedido (solo sus propios pedidos)
    const pedido = await Pedido.findOne({
      where: {
        id,
        usuarioId: req.usuario.id
      },
      include: [{
        model: DetallePedido,
        as: 'detalles',
        include: [{
          model: Producto,
          as: 'producto'
        }]
      }],
      transaction: t
    });
    
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }
    
    // Solo se puede cancelar si está pendiente
    if (pedido.estado !== 'pendiente') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar un pedido en estado '${pedido.estado}'`
      });
    }
    
    // Devolver stock a los productos
    for (const detalle of pedido.detalles) {
      const producto = detalle.producto;
      producto.stock += detalle.cantidad;
      await producto.save({ transaction: t });
    }
    
    // Actualizar estado del pedido
    pedido.estado = 'cancelado';
    await pedido.save({ transaction: t });
    
    await t.commit();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Pedido cancelado exitosamente',
      data: {
        pedido
      }
    });
    
  } catch (error) {
    await t.rollback();
    console.error('Error en cancelarPedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar pedido',
      error: error.message
    });
  }
};

/**
 * ADMIN: Obtener todos los pedidos
 * 
 * GET /api/admin/pedidos
 * Query: ?estado=pendiente&usuarioId=1&pagina=1&limite=20
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getAllPedidos = async (req, res) => {
  try {
    const { estado, usuarioId, pagina = 1, limite = 20 } = req.query;
    
    // Filtros
    const where = {};
    if (estado) where.estado = estado;
    if (usuarioId) where.usuarioId = usuarioId;
    
    // Paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Consultar pedidos
    const { count, rows: pedidos } = await Pedido.findAndCountAll({
      where,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'email']
        },
        {
          model: DetallePedido,
          as: 'detalles',
          include: [{
            model: Producto,
            as: 'producto',
            attributes: ['id', 'nombre', 'imagen']
          }]
        }
      ],
      limit: parseInt(limite),
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        pedidos,
        paginacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / parseInt(limite))
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getAllPedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos',
      error: error.message
    });
  }
};

/**
 * ADMIN: Actualizar estado de un pedido
 * 
 * PUT /api/admin/pedidos/:id/estado
 * Body: { estado }
 * 
 * Estados: 'pendiente' | 'en_proceso' | 'enviado' | 'entregado' | 'cancelado'
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Validar estado
    const estadosValidos = ['pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Opciones: ${estadosValidos.join(', ')}`
      });
    }
    
    // Buscar pedido
    const pedido = await Pedido.findByPk(id);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }
    
    // Actualizar estado
    pedido.estado = estado;
    await pedido.save();
    
    // Recargar con relaciones
    await pedido.reload({
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'email']
        }
      ]
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Estado del pedido actualizado',
      data: {
        pedido
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarEstadoPedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado del pedido',
      error: error.message
    });
  }
};

/**
 * ADMIN: Obtener estadísticas de pedidos
 * 
 * GET /api/admin/pedidos/estadisticas
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getEstadisticasPedidos = async (req, res) => {
  try {
    const { Op, fn, col } = require('sequelize');
    
    // Total de pedidos
    const totalPedidos = await Pedido.count();
    
    // Pedidos por estado
    const pedidosPorEstado = await Pedido.findAll({
      attributes: [
        'estado',
        [fn('COUNT', col('id')), 'cantidad'],
        [fn('SUM', col('total')), 'totalVentas']
      ],
      group: ['estado']
    });
    
    // Total de ventas
    const ventasTotales = await Pedido.sum('total');
    
    // Pedidos hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const pedidosHoy = await Pedido.count({
      where: {
        createdAt: { [Op.gte]: hoy }
      }
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        totalPedidos,
        pedidosHoy,
        ventasTotales: parseFloat(ventasTotales || 0).toFixed(2),
        pedidosPorEstado: pedidosPorEstado.map(p => ({
          estado: p.estado,
          cantidad: parseInt(p.getDataValue('cantidad')),
          totalVentas: parseFloat(p.getDataValue('totalVentas') || 0).toFixed(2)
        }))
      }
    });
    
  } catch (error) {
    console.error('Error en getEstadisticasPedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Exportar controladores
module.exports = {
  // Cliente
  crearPedido,
  getMisPedidos,
  getPedidoById,
  cancelarPedido,
  
  // Admin
  getAllPedidos,
  actualizarEstadoPedido,
  getEstadisticasPedidos
};
