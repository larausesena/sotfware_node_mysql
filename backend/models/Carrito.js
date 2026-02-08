/**
 * ============================================
 * MODELO CARRITO
 * ============================================
 * Define la tabla 'Carrito' en la base de datos
 * Almacena los productos que cada usuario ha agregado a su carrito
 */

// Importar DataTypes de Sequelize
const { DataTypes } = require('sequelize');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo Carrito
 */
const Carrito = sequelize.define('Carrito', {
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
   * usuarioId - ID del usuario dueño del carrito (FOREIGN KEY)
   */
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',             // Si se elimina el usuario, eliminar su carrito
    validate: {
      notNull: {
        msg: 'Debe especificar un usuario'
      }
    }
  },

  /**
   * productoId - ID del producto en el carrito (FOREIGN KEY)
   */
  productoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',             // Si se elimina el producto, eliminar del carrito
    validate: {
      notNull: {
        msg: 'Debe especificar un producto'
      }
    }
  },

  /**
   * cantidad - Cantidad de este producto en el carrito
   */
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
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
   * precioUnitario - Precio del producto al momento de agregarlo al carrito
   * Se guarda para mantener el precio aunque el producto cambie de precio
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
  }

}, {
  // ==========================================
  // OPCIONES DEL MODELO
  // ==========================================
  
  tableName: 'carritos',
  timestamps: true,
  
  /**
   * Índices para optimizar búsquedas
   */
  indexes: [
    {
      // Índice para buscar carrito por usuario
      fields: ['usuarioId']
    },
    {
      // Índice compuesto: un usuario no puede tener el mismo producto duplicado
      unique: true,
      fields: ['usuarioId', 'productoId'],
      name: 'usuario_producto_unique'
    }
  ],
  
  /**
   * HOOKS - Acciones automáticas
   */
  hooks: {
    /**
     * beforeCreate - Se ejecuta ANTES de crear un item en el carrito
     * Valida que el producto esté activo y tenga stock
     */
    beforeCreate: async (itemCarrito) => {
      const Producto = require('./Producto');
      
      // Buscar el producto
      const producto = await Producto.findByPk(itemCarrito.productoId);
      
      if (!producto) {
        throw new Error('El producto no existe');
      }
      
      if (!producto.activo) {
        throw new Error('No se puede agregar un producto inactivo al carrito');
      }
      
      if (!producto.hayStock(itemCarrito.cantidad)) {
        throw new Error(`Stock insuficiente. Solo hay ${producto.stock} unidades disponibles`);
      }
      
      // Guardar el precio actual del producto
      itemCarrito.precioUnitario = producto.precio;
    },

    /**
     * beforeUpdate - Se ejecuta ANTES de actualizar un item del carrito
     * Valida que haya stock suficiente si se aumenta la cantidad
     */
    beforeUpdate: async (itemCarrito) => {
      if (itemCarrito.changed('cantidad')) {
        const Producto = require('./Producto');
        
        const producto = await Producto.findByPk(itemCarrito.productoId);
        
        if (!producto) {
          throw new Error('El producto no existe');
        }
        
        if (!producto.hayStock(itemCarrito.cantidad)) {
          throw new Error(`Stock insuficiente. Solo hay ${producto.stock} unidades disponibles`);
        }
      }
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para calcular el subtotal de este item
 * 
 * @returns {number} - Subtotal (precio * cantidad)
 */
Carrito.prototype.calcularSubtotal = function() {
  return parseFloat(this.precioUnitario) * this.cantidad;
};

/**
 * Método para actualizar la cantidad
 * 
 * @param {number} nuevaCantidad - Nueva cantidad
 * @returns {Promise<Carrito>} - Item actualizado
 */
Carrito.prototype.actualizarCantidad = async function(nuevaCantidad) {
  const Producto = require('./Producto');
  
  const producto = await Producto.findByPk(this.productoId);
  
  if (!producto.hayStock(nuevaCantidad)) {
    throw new Error(`Stock insuficiente. Solo hay ${producto.stock} unidades disponibles`);
  }
  
  this.cantidad = nuevaCantidad;
  return await this.save();
};

// ==========================================
// MÉTODOS ESTÁTICOS (DE CLASE)
// ==========================================

/**
 * Método para obtener el carrito completo de un usuario
 * Incluye información de los productos
 * 
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} - Items del carrito con productos
 */
Carrito.obtenerCarritoUsuario = async function(usuarioId) {
  const Producto = require('./Producto');
  
  return await this.findAll({
    where: { usuarioId },
    include: [
      {
        model: Producto,
        as: 'producto'
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Método para calcular el total del carrito de un usuario
 * 
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<number>} - Total del carrito
 */
Carrito.calcularTotalCarrito = async function(usuarioId) {
  const items = await this.findAll({
    where: { usuarioId }
  });
  
  let total = 0;
  for (const item of items) {
    total += item.calcularSubtotal();
  }
  
  return total;
};

/**
 * Método para vaciar el carrito de un usuario
 * Útil después de realizar un pedido
 * 
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<number>} - Número de items eliminados
 */
Carrito.vaciarCarrito = async function(usuarioId) {
  return await this.destroy({
    where: { usuarioId }
  });
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = Carrito;
