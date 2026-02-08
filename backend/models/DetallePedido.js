/**
 * ============================================
 * MODELO DETALLE PEDIDO
 * ============================================
 * Define la tabla 'DetallePedido' en la base de datos
 * Almacena los productos incluidos en cada pedido
 * Relación muchos-a-muchos entre Pedido y Producto
 */

// Importar DataTypes de Sequelize
const { DataTypes } = require('sequelize');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo DetallePedido
 */
const DetallePedido = sequelize.define('DetallePedido', {
  // ==========================================
  // CAMPOS DE LA TABLA
  // ==========================================
  
  /**
   * id - Identificador único (PRIMARY KEY)
   */
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },

  /**
   * pedidoId - ID del pedido al que pertenece este detalle (FOREIGN KEY)
   */
  pedidoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'pedidos',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',             // Si se elimina el pedido, eliminar detalles
    validate: {
      notNull: {
        msg: 'Debe especificar un pedido'
      }
    }
  },

  /**
   * productoId - ID del producto incluido en el pedido (FOREIGN KEY)
   */
  productoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',           // No se puede eliminar producto con pedidos
    validate: {
      notNull: {
        msg: 'Debe especificar un producto'
      }
    }
  },

  /**
   * cantidad - Cantidad de este producto en el pedido
   */
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: {
        msg: 'La cantidad debe ser un número entero'
      },
      min: {
        args: [1],
        msg: 'La cantidad debe ser al menos 1'
      }
    }
  },

  /**
   * precioUnitario - Precio del producto al momento del pedido
   * Se guarda para mantener el historial aunque el producto cambie de precio
   */
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: {
        msg: 'El precio debe ser un número decimal válido'
      },
      min: {
        args: [0],
        msg: 'El precio no puede ser negativo'
      }
    }
  },

  /**
   * subtotal - Total de este item (precio * cantidad)
   * Se calcula automáticamente antes de guardar
   */
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: {
        msg: 'El subtotal debe ser un número decimal válido'
      },
      min: {
        args: [0],
        msg: 'El subtotal no puede ser negativo'
      }
    }
  }

}, {
  // ==========================================
  // OPCIONES DEL MODELO
  // ==========================================
  
  tableName: 'detalle_pedidos',
  timestamps: false,                 // No necesita createdAt/updatedAt
  
  /**
   * Índices para optimizar búsquedas
   */
  indexes: [
    {
      // Índice para buscar detalles por pedido
      fields: ['pedidoId']
    },
    {
      // Índice para buscar detalles por producto
      fields: ['productoId']
    }
  ],
  
  /**
   * HOOKS - Acciones automáticas
   */
  hooks: {
    /**
     * beforeCreate - Se ejecuta ANTES de crear un detalle de pedido
     * Calcula el subtotal automáticamente
     */
    beforeCreate: (detalle) => {
      // Calcular subtotal: precio * cantidad
      detalle.subtotal = parseFloat(detalle.precioUnitario) * detalle.cantidad;
    },

    /**
     * beforeUpdate - Se ejecuta ANTES de actualizar un detalle de pedido
     * Recalcula el subtotal si cambió precio o cantidad
     */
    beforeUpdate: (detalle) => {
      if (detalle.changed('precioUnitario') || detalle.changed('cantidad')) {
        detalle.subtotal = parseFloat(detalle.precioUnitario) * detalle.cantidad;
      }
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para calcular el subtotal manualmente
 * Útil antes de guardar
 * 
 * @returns {number} - Subtotal calculado
 */
DetallePedido.prototype.calcularSubtotal = function() {
  return parseFloat(this.precioUnitario) * this.cantidad;
};

/**
 * Método para obtener información completa del producto
 * 
 * @returns {Promise<Producto>} - Producto relacionado
 */
DetallePedido.prototype.obtenerProducto = async function() {
  const Producto = require('./Producto');
  return await Producto.findByPk(this.productoId);
};

// ==========================================
// MÉTODOS ESTÁTICOS (DE CLASE)
// ==========================================

/**
 * Método para crear detalles de pedido desde el carrito
 * Convierte los items del carrito en detalles de pedido
 * 
 * @param {number} pedidoId - ID del pedido
 * @param {Array} itemsCarrito - Items del carrito
 * @returns {Promise<Array>} - Detalles de pedido creados
 */
DetallePedido.crearDesdeCarrito = async function(pedidoId, itemsCarrito) {
  const detalles = [];
  
  for (const item of itemsCarrito) {
    const detalle = await this.create({
      pedidoId: pedidoId,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario
    });
    
    detalles.push(detalle);
  }
  
  return detalles;
};

/**
 * Método para calcular el total de un pedido desde sus detalles
 * 
 * @param {number} pedidoId - ID del pedido
 * @returns {Promise<number>} - Total calculado
 */
DetallePedido.calcularTotalPedido = async function(pedidoId) {
  const detalles = await this.findAll({
    where: { pedidoId }
  });
  
  let total = 0;
  for (const detalle of detalles) {
    total += parseFloat(detalle.subtotal);
  }
  
  return total;
};

/**
 * Método para obtener resumen de productos más vendidos
 * 
 * @param {number} limite - Número de productos a retornar
 * @returns {Promise<Array>} - Productos más vendidos
 */
DetallePedido.obtenerMasVendidos = async function(limite = 10) {
  const { sequelize } = require('../config/database');
  
  return await this.findAll({
    attributes: [
      'productoId',
      [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalVendido']
    ],
    group: ['productoId'],
    order: [[sequelize.fn('SUM', sequelize.col('cantidad')), 'DESC']],
    limit: limite
  });
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = DetallePedido;
