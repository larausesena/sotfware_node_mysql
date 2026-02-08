/**
 * ============================================
 * ASOCIACIONES ENTRE MODELOS
 * ============================================
 * Este archivo define todas las relaciones entre los modelos de Sequelize
 * Debe ejecutarse DESPUÉS de importar todos los modelos
 */

/**
 * Importar todos los modelos
 */
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Subcategoria = require('./Subcategoria');
const Producto = require('./Producto');
const Carrito = require('./Carrito');
const Pedido = require('./Pedido');
const DetallePedido = require('./DetallePedido');

/**
 * ============================================
 * DEFINIR ASOCIACIONES
 * ============================================
 * 
 * Tipos de relaciones en Sequelize:
 * - hasOne: Tiene uno (1:1)
 * - belongsTo: Pertenece a (1:1)
 * - hasMany: Tiene muchos (1:N)
 * - belongsToMany: Pertenece a muchos (N:M)
 */

// ==========================================
// 1. CATEGORIA ↔ SUBCATEGORIA
// ==========================================
// Una categoría tiene muchas subcategorías
// Una subcategoría pertenece a una categoría

Categoria.hasMany(Subcategoria, {
  foreignKey: 'categoriaId',       // Campo que conecta las tablas
  as: 'subcategorias',             // Alias para la relación
  onDelete: 'CASCADE',             // Si se elimina categoría, eliminar subcategorías
  onUpdate: 'CASCADE'
});

Subcategoria.belongsTo(Categoria, {
  foreignKey: 'categoriaId',
  as: 'categoria',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ==========================================
// 2. CATEGORIA ↔ PRODUCTO
// ==========================================
// Una categoría tiene muchos productos
// Un producto pertenece a una categoría

Categoria.hasMany(Producto, {
  foreignKey: 'categoriaId',
  as: 'productos',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Producto.belongsTo(Categoria, {
  foreignKey: 'categoriaId',
  as: 'categoria',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ==========================================
// 3. SUBCATEGORIA ↔ PRODUCTO
// ==========================================
// Una subcategoría tiene muchos productos
// Un producto pertenece a una subcategoría

Subcategoria.hasMany(Producto, {
  foreignKey: 'subcategoriaId',
  as: 'productos',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Producto.belongsTo(Subcategoria, {
  foreignKey: 'subcategoriaId',
  as: 'subcategoria',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ==========================================
// 4. USUARIO ↔ CARRITO
// ==========================================
// Un usuario tiene muchos items en su carrito
// Un item del carrito pertenece a un usuario

Usuario.hasMany(Carrito, {
  foreignKey: 'usuarioId',
  as: 'carrito',
  onDelete: 'CASCADE',             // Si se elimina usuario, eliminar su carrito
  onUpdate: 'CASCADE'
});

Carrito.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ==========================================
// 5. PRODUCTO ↔ CARRITO
// ==========================================
// Un producto puede estar en muchos carritos
// Un item del carrito tiene un producto

Producto.hasMany(Carrito, {
  foreignKey: 'productoId',
  as: 'carrito',
  onDelete: 'CASCADE',             // Si se elimina producto, eliminar del carrito
  onUpdate: 'CASCADE'
});

Carrito.belongsTo(Producto, {
  foreignKey: 'productoId',
  as: 'producto',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ==========================================
// 6. USUARIO ↔ PEDIDO
// ==========================================
// Un usuario tiene muchos pedidos
// Un pedido pertenece a un usuario

Usuario.hasMany(Pedido, {
  foreignKey: 'usuarioId',
  as: 'pedidos',
  onDelete: 'RESTRICT',            // No se puede eliminar usuario con pedidos
  onUpdate: 'CASCADE'
});

Pedido.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

// ==========================================
// 7. PEDIDO ↔ DETALLE PEDIDO
// ==========================================
// Un pedido tiene muchos detalles (productos)
// Un detalle pertenece a un pedido

Pedido.hasMany(DetallePedido, {
  foreignKey: 'pedidoId',
  as: 'detalles',
  onDelete: 'CASCADE',             // Si se elimina pedido, eliminar detalles
  onUpdate: 'CASCADE'
});

DetallePedido.belongsTo(Pedido, {
  foreignKey: 'pedidoId',
  as: 'pedido',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// ==========================================
// 8. PRODUCTO ↔ DETALLE PEDIDO
// ==========================================
// Un producto puede estar en muchos detalles de pedidos
// Un detalle tiene un producto

Producto.hasMany(DetallePedido, {
  foreignKey: 'productoId',
  as: 'detallePedidos',
  onDelete: 'RESTRICT',            // No se puede eliminar producto con pedidos
  onUpdate: 'CASCADE'
});

DetallePedido.belongsTo(Producto, {
  foreignKey: 'productoId',
  as: 'producto',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

// ==========================================
// RELACIÓN MUCHOS A MUCHOS (Opcional)
// ==========================================
// Pedido y Producto tienen una relación muchos-a-muchos a través de DetallePedido

Pedido.belongsToMany(Producto, {
  through: DetallePedido,          // Tabla intermedia
  foreignKey: 'pedidoId',
  otherKey: 'productoId',
  as: 'productos'
});

Producto.belongsToMany(Pedido, {
  through: DetallePedido,
  foreignKey: 'productoId',
  otherKey: 'pedidoId',
  as: 'pedidos'
});

/**
 * ============================================
 * EXPORTAR FUNCIÓN DE INICIALIZACIÓN
 * ============================================
 */

/**
 * Función para inicializar todas las asociaciones
 * Se llama desde server.js después de cargar los modelos
 */
const initAssociations = () => {
  console.log('🔗 Asociaciones entre modelos establecidas correctamente');
};

// Exportar modelos y función de inicialización
module.exports = {
  Usuario,
  Categoria,
  Subcategoria,
  Producto,
  Carrito,
  Pedido,
  DetallePedido,
  initAssociations
};

/**
 * ============================================
 * DIAGRAMA DE RELACIONES
 * ============================================
 * 
 * Usuario (1) ─────< Carrito (N)
 *    │                   │
 *    │                   │
 *    │                   ▼
 *    │              Producto (1)
 *    │                   │
 *    │                   │
 *    │                   ├─────> Subcategoria (1)
 *    │                   │              │
 *    │                   │              │
 *    │                   │              ▼
 *    │                   │         Categoria (1)
 *    │                   │
 *    ▼                   │
 * Pedido (N)             │
 *    │                   │
 *    │                   │
 *    ▼                   ▼
 * DetallePedido (N) ────< Producto (1)
 * 
 * Leyenda:
 * (1) = Uno (relación uno a muchos)
 * (N) = Muchos
 * ─── = Relación
 * 
 * ============================================
 * REGLAS DE NEGOCIO EN LAS RELACIONES
 * ============================================
 * 
 * 1. CASCADE en Carrito:
 *    - Si se elimina un usuario → se elimina su carrito
 *    - Si se elimina un producto → se elimina del carrito
 * 
 * 2. CASCADE en Categorías:
 *    - Si se desactiva una categoría → se desactivan subcategorías y productos
 *    - Si se desactiva una subcategoría → se desactivan sus productos
 * 
 * 3. RESTRICT en Pedidos:
 *    - NO se puede eliminar un usuario con pedidos
 *    - NO se puede eliminar un producto con pedidos
 *    - Los pedidos son históricos y deben conservarse
 * 
 * 4. Validaciones:
 *    - Un producto debe tener subcategoría Y categoría
 *    - La subcategoría debe pertenecer a la categoría indicada
 *    - No se puede crear producto en categoría/subcategoría inactiva
 *    - El carrito valida stock disponible antes de agregar
 * 
 */
