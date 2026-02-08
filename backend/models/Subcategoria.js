/**
 * ============================================
 * MODELO SUBCATEGORIA
 * ============================================
 * Define la tabla 'Subcategoria' en la base de datos
 * Almacena las subcategorías que pertenecen a una categoría
 */

// Importar DataTypes de Sequelize
const { DataTypes } = require('sequelize');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo Subcategoria
 */
const Subcategoria = sequelize.define('Subcategoria', {
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
   * nombre - Nombre de la subcategoría
   * Ejemplo: "Laptops", "Teléfonos", "Tablets" (para categoría Electrónica)
   */
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre de la subcategoría no puede estar vacío'
      },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      }
    }
  },

  /**
   * descripcion - Descripción de la subcategoría (opcional)
   */
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  /**
   * categoriaId - ID de la categoría a la que pertenece (FOREIGN KEY)
   * Esta es la relación con la tabla Categoria
   */
  categoriaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'categorias',         // Nombre de la tabla relacionada
      key: 'id'                    // Campo de la tabla relacionada
    },
    onUpdate: 'CASCADE',           // Si se actualiza el id, actualizar aquí también
    onDelete: 'CASCADE',           // Si se elimina la categoría, eliminar subcategorías
    validate: {
      notNull: {
        msg: 'Debe seleccionar una categoría'
      }
    }
  },

  /**
   * activo - Estado de la subcategoría
   * Si es false, todos los productos de esta subcategoría se ocultan
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
  
  tableName: 'subcategorias',
  timestamps: true,
  
  /**
   * Índices compuestos para optimizar búsquedas
   */
  indexes: [
    {
      // Índice para buscar subcategorías por categoría
      fields: ['categoriaId']
    },
    {
      // Índice compuesto: nombre único por categoría
      // Permite que dos categorías diferentes tengan subcategorías con el mismo nombre
      unique: true,
      fields: ['nombre', 'categoriaId'],
      name: 'nombre_categoria_unique'
    }
  ],
  
  /**
   * HOOKS - Acciones automáticas
   */
  hooks: {
    /**
     * beforeCreate - Se ejecuta ANTES de crear una subcategoría
     * Verifica que la categoría padre esté activa
     */
    beforeCreate: async (subcategoria) => {
      const Categoria = require('./Categoria');
      
      // Buscar la categoría padre
      const categoria = await Categoria.findByPk(subcategoria.categoriaId);
      
      if (!categoria) {
        throw new Error('La categoría seleccionada no existe');
      }
      
      if (!categoria.activo) {
        throw new Error('No se puede crear una subcategoría en una categoría inactiva');
      }
    },

    /**
     * afterUpdate - Se ejecuta DESPUÉS de actualizar una subcategoría
     * Si se desactiva una subcategoría, desactiva todos sus productos
     */
    afterUpdate: async (subcategoria, options) => {
      // Verificar si el campo 'activo' cambió a false
      if (subcategoria.changed('activo') && !subcategoria.activo) {
        console.log(`⚠️ Desactivando subcategoría: ${subcategoria.nombre}`);
        
        // Importar modelo Producto
        const Producto = require('./Producto');
        
        try {
          // Desactivar todos los productos de esta subcategoría
          const productos = await Producto.findAll({
            where: { subcategoriaId: subcategoria.id }
          });
          
          for (const producto of productos) {
            await producto.update({ activo: false }, { transaction: options.transaction });
            console.log(`  ↳ Producto desactivado: ${producto.nombre}`);
          }
          
          console.log(`✅ Subcategoría y productos relacionados desactivados correctamente`);
        } catch (error) {
          console.error('❌ Error al desactivar productos relacionados:', error.message);
          throw error;
        }
      }
      
      // Si se ACTIVA una subcategoría, NO se activan automáticamente los productos
      // El administrador debe activarlos manualmente si lo desea
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para contar productos de esta subcategoría
 * 
 * @returns {Promise<number>} - Número de productos
 */
Subcategoria.prototype.contarProductos = async function() {
  const Producto = require('./Producto');
  return await Producto.count({
    where: { subcategoriaId: this.id }
  });
};

/**
 * Método para obtener la categoría padre
 * 
 * @returns {Promise<Categoria>} - Categoría padre
 */
Subcategoria.prototype.obtenerCategoria = async function() {
  const Categoria = require('./Categoria');
  return await Categoria.findByPk(this.categoriaId);
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = Subcategoria;
