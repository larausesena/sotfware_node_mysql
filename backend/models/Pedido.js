/**
 * ============================================
 * MODELO PEDIDO
 * ============================================
 * Define la tabla 'Pedido' en la base de datos
 * Almacena información de los pedidos realizados por usuarios
 */

// Importar DataTypes de Sequelize
const { DataTypes } = require('sequelize');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo Pedido
 */
const Pedido = sequelize.define('Pedido', {
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
   * usuarioId - ID del usuario que realizó el pedido (FOREIGN KEY)
   */
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',           // No se puede eliminar un usuario con pedidos
    validate: {
      notNull: {
        msg: 'Debe especificar un usuario'
      }
    }
  },

  /**
   * total - Monto total del pedido
   */
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: {
        msg: 'El total debe ser un número decimal válido'
      },
      min: {
        args: [0],
        msg: 'El total no puede ser negativo'
      }
    }
  },

  /**
   * estado - Estado actual del pedido
   * Valores posibles:
   * - pendiente: Pedido creado, esperando pago
   * - pagado: Pedido pagado, en preparación
   * - enviado: Pedido enviado al cliente
   * - entregado: Pedido entregado al cliente
   * - cancelado: Pedido cancelado
   */
  estado: {
    type: DataTypes.ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'),
    allowNull: false,
    defaultValue: 'pendiente',
    validate: {
      isIn: {
        args: [['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado']],
        msg: 'Estado inválido'
      }
    }
  },

  /**
   * direccionEnvio - Dirección de envío del pedido
   */
  direccionEnvio: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La dirección de envío es obligatoria'
      }
    }
  },

  /**
   * telefono - Teléfono de contacto para el envío
   */
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El teléfono es obligatorio'
      }
    }
  },

  /**
   * notas - Notas adicionales del pedido (opcional)
   */
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  /**
   * fechaPago - Fecha en que se realizó el pago (opcional)
   */
  fechaPago: {
    type: DataTypes.DATE,
    allowNull: true
  },

  /**
   * fechaEnvio - Fecha en que se envió el pedido (opcional)
   */
  fechaEnvio: {
    type: DataTypes.DATE,
    allowNull: true
  },

  /**
   * fechaEntrega - Fecha en que se entregó el pedido (opcional)
   */
  fechaEntrega: {
    type: DataTypes.DATE,
    allowNull: true
  }

}, {
  // ==========================================
  // OPCIONES DEL MODELO
  // ==========================================
  
  tableName: 'pedidos',
  timestamps: true,
  
  /**
   * Índices para optimizar búsquedas
   */
  indexes: [
    {
      // Índice para buscar pedidos por usuario
      fields: ['usuarioId']
    },
    {
      // Índice para buscar pedidos por estado
      fields: ['estado']
    },
    {
      // Índice para buscar pedidos por fecha
      fields: ['createdAt']
    }
  ],
  
  /**
   * HOOKS - Acciones automáticas
   */
  hooks: {
    /**
     * afterUpdate - Se ejecuta DESPUÉS de actualizar un pedido
     * Actualiza las fechas según el estado
     */
    afterUpdate: async (pedido) => {
      // Si el estado cambió a 'pagado', guardar fecha de pago
      if (pedido.changed('estado') && pedido.estado === 'pagado' && !pedido.fechaPago) {
        pedido.fechaPago = new Date();
        await pedido.save({ hooks: false }); // Guardar sin ejecutar hooks
      }
      
      // Si el estado cambió a 'enviado', guardar fecha de envío
      if (pedido.changed('estado') && pedido.estado === 'enviado' && !pedido.fechaEnvio) {
        pedido.fechaEnvio = new Date();
        await pedido.save({ hooks: false });
      }
      
      // Si el estado cambió a 'entregado', guardar fecha de entrega
      if (pedido.changed('estado') && pedido.estado === 'entregado' && !pedido.fechaEntrega) {
        pedido.fechaEntrega = new Date();
        await pedido.save({ hooks: false });
      }
    },

    /**
     * beforeDestroy - Se ejecuta ANTES de eliminar un pedido
     * No se pueden eliminar pedidos, solo cancelar
     */
    beforeDestroy: async () => {
      throw new Error('No se pueden eliminar pedidos. Use el estado "cancelado" en su lugar.');
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para cambiar el estado del pedido
 * 
 * @param {string} nuevoEstado - Nuevo estado del pedido
 * @returns {Promise<Pedido>} - Pedido actualizado
 */
Pedido.prototype.cambiarEstado = async function(nuevoEstado) {
  const estadosValidos = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
  
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error('Estado inválido');
  }
  
  this.estado = nuevoEstado;
  return await this.save();
};

/**
 * Método para verificar si el pedido puede ser cancelado
 * Solo se puede cancelar si está en estado 'pendiente' o 'pagado'
 * 
 * @returns {boolean} - true si puede cancelarse, false si no
 */
Pedido.prototype.puedeSerCancelado = function() {
  return ['pendiente', 'pagado'].includes(this.estado);
};

/**
 * Método para cancelar el pedido
 * Devuelve el stock de los productos
 * 
 * @returns {Promise<Pedido>} - Pedido cancelado
 */
Pedido.prototype.cancelar = async function() {
  if (!this.puedeSerCancelado()) {
    throw new Error('Este pedido no puede ser cancelado');
  }
  
  // Importar modelos
  const DetallePedido = require('./DetallePedido');
  const Producto = require('./Producto');
  
  // Obtener detalles del pedido
  const detalles = await DetallePedido.findAll({
    where: { pedidoId: this.id }
  });
  
  // Devolver el stock de cada producto
  for (const detalle of detalles) {
    const producto = await Producto.findByPk(detalle.productoId);
    if (producto) {
      await producto.aumentarStock(detalle.cantidad);
      console.log(`  ↳ Stock devuelto: ${detalle.cantidad} x ${producto.nombre}`);
    }
  }
  
  // Cambiar estado a cancelado
  this.estado = 'cancelado';
  return await this.save();
};

/**
 * Método para obtener el detalle del pedido con productos
 * 
 * @returns {Promise<Array>} - Detalles del pedido
 */
Pedido.prototype.obtenerDetalle = async function() {
  const DetallePedido = require('./DetallePedido');
  const Producto = require('./Producto');
  
  return await DetallePedido.findAll({
    where: { pedidoId: this.id },
    include: [
      {
        model: Producto,
        as: 'producto'
      }
    ]
  });
};

// ==========================================
// MÉTODOS ESTÁTICOS (DE CLASE)
// ==========================================

/**
 * Método para obtener pedidos por estado
 * 
 * @param {string} estado - Estado a filtrar
 * @returns {Promise<Array>} - Pedidos filtrados
 */
Pedido.obtenerPorEstado = async function(estado) {
  const Usuario = require('./Usuario');
  
  return await this.findAll({
    where: { estado },
    include: [
      {
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombre', 'email', 'telefono']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

/**
 * Método para obtener historial de pedidos de un usuario
 * 
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} - Pedidos del usuario
 */
Pedido.obtenerHistorialUsuario = async function(usuarioId) {
  return await this.findAll({
    where: { usuarioId },
    order: [['createdAt', 'DESC']]
  });
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = Pedido;
