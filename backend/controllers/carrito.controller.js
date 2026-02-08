/**
 * ============================================
 * CONTROLADOR DE CARRITO DE COMPRAS
 * ============================================
 * Gestión del carrito de compras del cliente
 * Requiere autenticación
 */

// Importar modelos
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');

/**
 * Obtener carrito del usuario autenticado
 * 
 * GET /api/cliente/carrito
 * 
 * @param {Object} req - Request de Express (con req.usuario del middleware)
 * @param {Object} res - Response de Express
 */
const getCarrito = async (req, res) => {
  try {
    // Obtener items del carrito con productos relacionados
    const itemsCarrito = await Carrito.findAll({
      where: { usuarioId: req.usuario.id },
      include: [
        {
          model: Producto,
          as: 'producto',
          attributes: ['id', 'nombre', 'descripcion', 'precio', 'stock', 'imagen', 'activo'],
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
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    // Calcular total del carrito
    let total = 0;
    itemsCarrito.forEach(item => {
      total += parseFloat(item.precioUnitario) * item.cantidad;
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        items: itemsCarrito,
        resumen: {
          totalItems: itemsCarrito.length,
          cantidadTotal: itemsCarrito.reduce((sum, item) => sum + item.cantidad, 0),
          total: total.toFixed(2)
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getCarrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carrito',
      error: error.message
    });
  }
};

/**
 * Agregar producto al carrito
 * 
 * POST /api/cliente/carrito
 * Body: { productoId, cantidad }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const agregarAlCarrito = async (req, res) => {
  try {
    const { productoId, cantidad = 1 } = req.body;
    
    // VALIDACIÓN 1: Campos requeridos
    if (!productoId) {
      return res.status(400).json({
        success: false,
        message: 'El productoId es requerido'
      });
    }
    
    // VALIDACIÓN 2: Cantidad válida
    const cantidadNum = parseInt(cantidad);
    if (cantidadNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser al menos 1'
      });
    }
    
    // VALIDACIÓN 3: Producto existe y está activo
    const producto = await Producto.findByPk(productoId);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    if (!producto.activo) {
      return res.status(400).json({
        success: false,
        message: 'El producto no está disponible'
      });
    }
    
    // VALIDACIÓN 4: Verificar si ya existe en el carrito
    const itemExistente = await Carrito.findOne({
      where: {
        usuarioId: req.usuario.id,
        productoId
      }
    });
    
    if (itemExistente) {
      // Actualizar cantidad
      const nuevaCantidad = itemExistente.cantidad + cantidadNum;
      
      // Validar stock disponible
      if (nuevaCantidad > producto.stock) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Disponible: ${producto.stock}, En carrito: ${itemExistente.cantidad}`
        });
      }
      
      itemExistente.cantidad = nuevaCantidad;
      await itemExistente.save();
      
      // Recargar con producto
      await itemExistente.reload({
        include: [{
          model: Producto,
          as: 'producto',
          attributes: ['id', 'nombre', 'precio', 'stock', 'imagen']
        }]
      });
      
      return res.json({
        success: true,
        message: 'Cantidad actualizada en el carrito',
        data: {
          item: itemExistente
        }
      });
    }
    
    // VALIDACIÓN 5: Stock disponible
    if (cantidadNum > producto.stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${producto.stock}`
      });
    }
    
    // CREAR NUEVO ITEM EN EL CARRITO
    const nuevoItem = await Carrito.create({
      usuarioId: req.usuario.id,
      productoId,
      cantidad: cantidadNum,
      precioUnitario: producto.precio
    });
    
    // Recargar con producto
    await nuevoItem.reload({
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['id', 'nombre', 'precio', 'stock', 'imagen']
      }]
    });
    
    // RESPUESTA EXITOSA
    res.status(201).json({
      success: true,
      message: 'Producto agregado al carrito',
      data: {
        item: nuevoItem
      }
    });
    
  } catch (error) {
    console.error('Error en agregarAlCarrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar producto al carrito',
      error: error.message
    });
  }
};

/**
 * Actualizar cantidad de un item del carrito
 * 
 * PUT /api/cliente/carrito/:id
 * Body: { cantidad }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarItemCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;
    
    // Validar cantidad
    const cantidadNum = parseInt(cantidad);
    if (cantidadNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser al menos 1'
      });
    }
    
    // Buscar item del carrito
    const item = await Carrito.findOne({
      where: {
        id,
        usuarioId: req.usuario.id // Solo puede modificar su propio carrito
      },
      include: [{
        model: Producto,
        as: 'producto',
        attributes: ['id', 'nombre', 'precio', 'stock']
      }]
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }
    
    // Validar stock disponible
    if (cantidadNum > item.producto.stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${item.producto.stock}`
      });
    }
    
    // Actualizar cantidad
    item.cantidad = cantidadNum;
    await item.save();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Cantidad actualizada',
      data: {
        item
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarItemCarrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar item del carrito',
      error: error.message
    });
  }
};

/**
 * Eliminar un item del carrito
 * 
 * DELETE /api/cliente/carrito/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const eliminarItemCarrito = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar item
    const item = await Carrito.findOne({
      where: {
        id,
        usuarioId: req.usuario.id
      }
    });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }
    
    // Eliminar
    await item.destroy();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Producto eliminado del carrito'
    });
    
  } catch (error) {
    console.error('Error en eliminarItemCarrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar item del carrito',
      error: error.message
    });
  }
};

/**
 * Vaciar todo el carrito
 * 
 * DELETE /api/cliente/carrito
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const vaciarCarrito = async (req, res) => {
  try {
    // Eliminar todos los items del usuario
    const itemsEliminados = await Carrito.destroy({
      where: { usuarioId: req.usuario.id }
    });
    
    res.json({
      success: true,
      message: 'Carrito vaciado',
      data: {
        itemsEliminados
      }
    });
    
  } catch (error) {
    console.error('Error en vaciarCarrito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vaciar carrito',
      error: error.message
    });
  }
};

// Exportar controladores
module.exports = {
  getCarrito,
  agregarAlCarrito,
  actualizarItemCarrito,
  eliminarItemCarrito,
  vaciarCarrito
};
