/**
 * ============================================
 * MODELO PRODUCTO
 * ============================================
 * Define la tabla 'Producto' en la base de datos
 * Almacena información de productos con imagen, precio, stock, etc.
 */

// Importar DataTypes de Sequelize
const { DataTypes } = require('sequelize');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo Producto
 */
const Producto = sequelize.define('Producto', {
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
   * nombre - Nombre del producto
   */
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre del producto no puede estar vacío'
      },
      len: {
        args: [3, 200],
        msg: 'El nombre debe tener entre 3 y 200 caracteres'
      }
    }
  },

  /**
   * descripcion - Descripción detallada del producto
   */
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  /**
   * precio - Precio del producto en pesos colombianos (o la moneda configurada)
   */
  precio: {
    type: DataTypes.DECIMAL(10, 2),  // Hasta 99,999,999.99
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
   * stock - Cantidad disponible en inventario
   */
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: {
        msg: 'El stock debe ser un número entero'
      },
      min: {
        args: [0],
        msg: 'El stock no puede ser negativo'
      }
    }
  },

  /**
   * imagen - Nombre del archivo de imagen
   * Se guarda solo el nombre (ej: "1709578800000-producto.jpg")
   * La ruta completa será: uploads/1709578800000-producto.jpg
   */
  imagen: {
    type: DataTypes.STRING(255),
    allowNull: true,                // Es opcional, puede no tener imagen
    validate: {
      is: {
        args: /\.(jpg|jpeg|png|gif)$/i,
        msg: 'La imagen debe ser un archivo JPG, PNG o GIF'
      }
    }
  },

  /**
   * subcategoriaId - ID de la subcategoría a la que pertenece (FOREIGN KEY)
   */
  subcategoriaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subcategorias',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    validate: {
      notNull: {
        msg: 'Debe seleccionar una subcategoría'
      }
    }
  },

  /**
   * categoriaId - ID de la categoría (FOREIGN KEY)
   * Se guarda también para facilitar búsquedas y validaciones
   * Debe coincidir con la categoría de la subcategoría
   */
  categoriaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'categorias',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    validate: {
      notNull: {
        msg: 'Debe seleccionar una categoría'
      }
    }
  },

  /**
   * activo - Estado del producto
   */
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }

}, {
  // ==========================================
  // OPCIONES DEL MODELO
  // ==========================================
  
  tableName: 'productos',
  timestamps: true,
  
  /**
   * Índices para optimizar búsquedas
   */
  indexes: [
    {
      // Índice para buscar productos por subcategoría
      fields: ['subcategoriaId']
    },
    {
      // Índice para buscar productos por categoría
      fields: ['categoriaId']
    },
    {
      // Índice para buscar productos activos
      fields: ['activo']
    },
    {
      // Índice para buscar por nombre (búsquedas)
      fields: ['nombre']
    }
  ],
  
  /**
   * HOOKS - Acciones automáticas
   */
  hooks: {
    /**
     * beforeCreate - Se ejecuta ANTES de crear un producto
     * Valida que subcategoría y categoría estén activas y sean consistentes
     */
    beforeCreate: async (producto) => {
      const Categoria = require('./Categoria');
      const Subcategoria = require('./Subcategoria');
      
      // Buscar la subcategoría
      const subcategoria = await Subcategoria.findByPk(producto.subcategoriaId);
      
      if (!subcategoria) {
        throw new Error('La subcategoría seleccionada no existe');
      }
      
      if (!subcategoria.activo) {
        throw new Error('No se puede crear un producto en una subcategoría inactiva');
      }
      
      // Buscar la categoría
      const categoria = await Categoria.findByPk(producto.categoriaId);
      
      if (!categoria) {
        throw new Error('La categoría seleccionada no existe');
      }
      
      if (!categoria.activo) {
        throw new Error('No se puede crear un producto en una categoría inactiva');
      }
      
      // Validar que la subcategoría pertenezca a la categoría
      if (subcategoria.categoriaId !== producto.categoriaId) {
        throw new Error('La subcategoría no pertenece a la categoría seleccionada');
      }
    },

    /**
     * beforeUpdate - Se ejecuta ANTES de actualizar un producto
     * Valida consistencia si se cambia subcategoría o categoría
     */
    beforeUpdate: async (producto) => {
      // Si se cambió la subcategoría o categoría, validar consistencia
      if (producto.changed('subcategoriaId') || producto.changed('categoriaId')) {
        const Subcategoria = require('./Subcategoria');
        
        const subcategoria = await Subcategoria.findByPk(producto.subcategoriaId);
        
        if (!subcategoria) {
          throw new Error('La subcategoría seleccionada no existe');
        }
        
        if (subcategoria.categoriaId !== producto.categoriaId) {
          throw new Error('La subcategoría no pertenece a la categoría seleccionada');
        }
      }
    },

    /**
     * beforeDestroy - Se ejecuta ANTES de eliminar un producto
     * Elimina la imagen del servidor si existe
     */
    beforeDestroy: async (producto) => {
      if (producto.imagen) {
        const { deleteFile } = require('../config/multer');
        
        // Intentar eliminar la imagen del servidor
        const eliminado = deleteFile(producto.imagen);
        
        if (eliminado) {
          console.log(`🗑️ Imagen eliminada: ${producto.imagen}`);
        }
      }
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para obtener la URL completa de la imagen
 * 
 * @returns {string|null} - URL de la imagen o null si no tiene
 * 
 * Ejemplo: http://localhost:5000/uploads/1709578800000-producto.jpg
 */
Producto.prototype.obtenerUrlImagen = function() {
  if (!this.imagen) {
    return null;
  }
  
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${this.imagen}`;
};

/**
 * Método para verificar si hay stock disponible
 * 
 * @param {number} cantidad - Cantidad deseada
 * @returns {boolean} - true si hay stock, false si no
 */
Producto.prototype.hayStock = function(cantidad = 1) {
  return this.stock >= cantidad;
};

/**
 * Método para reducir el stock
 * Útil al realizar una venta
 * 
 * @param {number} cantidad - Cantidad a reducir
 * @returns {Promise<Producto>} - Producto actualizado
 */
Producto.prototype.reducirStock = async function(cantidad) {
  if (!this.hayStock(cantidad)) {
    throw new Error('Stock insuficiente');
  }
  
  this.stock -= cantidad;
  return await this.save();
};

/**
 * Método para aumentar el stock
 * Útil al cancelar una venta o recibir inventario
 * 
 * @param {number} cantidad - Cantidad a aumentar
 * @returns {Promise<Producto>} - Producto actualizado
 */
Producto.prototype.aumentarStock = async function(cantidad) {
  this.stock += cantidad;
  return await this.save();
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = Producto;
