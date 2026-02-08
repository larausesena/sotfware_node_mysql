/**
 * ============================================
 * MODELO CATEGORIA
 * ============================================
 * Define la tabla 'Categoria' en la base de datos
 * Almacena las categorías principales de productos
 */

// Importar DataTypes de Sequelize
const { DataTypes } = require('sequelize');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo Categoria
 */
const Categoria = sequelize.define('Categoria', {
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
   * nombre - Nombre de la categoría
   * Ejemplo: "Electrónica", "Ropa", "Alimentos"
   */
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Ya existe una categoría con este nombre'
    },
    validate: {
      notEmpty: {
        msg: 'El nombre de la categoría no puede estar vacío'
      },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      }
    }
  },

  /**
   * descripcion - Descripción de la categoría (opcional)
   */
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  /**
   * activo - Estado de la categoría
   * Si es false, la categoría y todas sus subcategorías y productos se ocultan
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
  
  tableName: 'categorias',
  timestamps: true,
  
  /**
   * HOOKS - Acciones automáticas
   */
  hooks: {
    /**
     * afterUpdate - Se ejecuta DESPUÉS de actualizar una categoría
     * Si se desactiva una categoría, desactiva todas sus subcategorías y productos
     */
    afterUpdate: async (categoria, options) => {
      // Verificar si el campo 'activo' cambió
      if (categoria.changed('activo') && !categoria.activo) {
        console.log(`⚠️ Desactivando categoría: ${categoria.nombre}`);
        
        // Importar modelos (aquí para evitar dependencias circulares)
        const Subcategoria = require('./Subcategoria');
        const Producto = require('./Producto');
        
        try {
          // PASO 1: Desactivar todas las subcategorías de esta categoría
          const subcategorias = await Subcategoria.findAll({
            where: { categoriaId: categoria.id }
          });
          
          for (const subcategoria of subcategorias) {
            await subcategoria.update({ activo: false }, { transaction: options.transaction });
            console.log(`  ↳ Subcategoría desactivada: ${subcategoria.nombre}`);
          }
          
          // PASO 2: Desactivar todos los productos de esta categoría
          const productos = await Producto.findAll({
            where: { categoriaId: categoria.id }
          });
          
          for (const producto of productos) {
            await producto.update({ activo: false }, { transaction: options.transaction });
            console.log(`  ↳ Producto desactivado: ${producto.nombre}`);
          }
          
          console.log(`✅ Categoría y elementos relacionados desactivados correctamente`);
        } catch (error) {
          console.error('❌ Error al desactivar elementos relacionados:', error.message);
          throw error;
        }
      }
      
      // Si se ACTIVA una categoría, NO se activan automáticamente subcategorías/productos
      // El administrador debe activarlos manualmente si lo desea
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para contar subcategorías de esta categoría
 * 
 * @returns {Promise<number>} - Número de subcategorías
 */
Categoria.prototype.contarSubcategorias = async function() {
  const Subcategoria = require('./Subcategoria');
  return await Subcategoria.count({
    where: { categoriaId: this.id }
  });
};

/**
 * Método para contar productos de esta categoría
 * 
 * @returns {Promise<number>} - Número de productos
 */
Categoria.prototype.contarProductos = async function() {
  const Producto = require('./Producto');
  return await Producto.count({
    where: { categoriaId: this.id }
  });
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = Categoria;
