/**
 * ============================================
 * CONTROLADOR DE CATEGORÍAS
 * ============================================
 * Maneja las operaciones CRUD de categorías
 * Solo accesible por administradores
 */

// Importar modelos
const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');
const Producto = require('../models/Producto');

/**
 * Obtener todas las categorías
 * 
 * GET /api/admin/categorias
 * Query params:
 * - activo: true/false (filtrar por estado)
 * - incluirSubcategorias: true/false (incluir subcategorías relacionadas)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getCategorias = async (req, res) => {
  try {
    const { activo, incluirSubcategorias } = req.query;
    
    // Opciones de consulta
    const opciones = {
      order: [['nombre', 'ASC']] // Ordenar alfabéticamente
    };
    
    // Filtrar por estado activo si se especifica
    if (activo !== undefined) {
      opciones.where = { activo: activo === 'true' };
    }
    
    // Incluir subcategorías si se solicita
    if (incluirSubcategorias === 'true') {
      opciones.include = [{
        model: Subcategoria,
        as: 'subcategorias',
        attributes: ['id', 'nombre', 'descripcion', 'activo']
      }];
    }
    
    // Obtener categorías
    const categorias = await Categoria.findAll(opciones);
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      count: categorias.length,
      data: {
        categorias
      }
    });
    
  } catch (error) {
    console.error('Error en getCategorias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
};

/**
 * Obtener una categoría por ID
 * 
 * GET /api/admin/categorias/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar categoría con subcategorías y contar productos
    const categoria = await Categoria.findByPk(id, {
      include: [
        {
          model: Subcategoria,
          as: 'subcategorias',
          attributes: ['id', 'nombre', 'descripcion', 'activo']
        },
        {
          model: Producto,
          as: 'productos',
          attributes: ['id']
        }
      ]
    });
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Agregar contador de productos
    const categoriaJSON = categoria.toJSON();
    categoriaJSON.totalProductos = categoriaJSON.productos.length;
    delete categoriaJSON.productos; // No enviar la lista completa, solo el contador
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        categoria: categoriaJSON
      }
    });
    
  } catch (error) {
    console.error('Error en getCategoriaById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categoría',
      error: error.message
    });
  }
};

/**
 * Crear nueva categoría
 * 
 * POST /api/admin/categorias
 * Body: { nombre, descripcion }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // VALIDACIÓN 1: Verificar campos requeridos
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }
    
    // VALIDACIÓN 2: Verificar que el nombre no exista
    const categoriaExistente = await Categoria.findOne({ 
      where: { nombre } 
    });
    
    if (categoriaExistente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una categoría con el nombre "${nombre}"`
      });
    }
    
    // CREAR CATEGORÍA
    const nuevaCategoria = await Categoria.create({
      nombre,
      descripcion: descripcion || null,
      activo: true
    });
    
    // RESPUESTA EXITOSA
    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: {
        categoria: nuevaCategoria
      }
    });
    
  } catch (error) {
    console.error('Error en crearCategoria:', error);
    
    // Error de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear categoría',
      error: error.message
    });
  }
};

/**
 * Actualizar categoría
 * 
 * PUT /api/admin/categorias/:id
 * Body: { nombre, descripcion }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;
    
    // Buscar categoría
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // VALIDACIÓN: Si se cambia el nombre, verificar que no exista
    if (nombre && nombre !== categoria.nombre) {
      const categoriaConMismoNombre = await Categoria.findOne({
        where: { nombre }
      });
      
      if (categoriaConMismoNombre) {
        return res.status(400).json({
          success: false,
          message: `Ya existe una categoría con el nombre "${nombre}"`
        });
      }
    }
    
    // ACTUALIZAR CAMPOS
    if (nombre !== undefined) categoria.nombre = nombre;
    if (descripcion !== undefined) categoria.descripcion = descripcion;
    if (activo !== undefined) categoria.activo = activo;
    
    // Guardar cambios
    await categoria.save();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: {
        categoria
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarCategoria:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar categoría',
      error: error.message
    });
  }
};

/**
 * Activar/Desactivar categoría
 * 
 * PATCH /api/admin/categorias/:id/toggle
 * 
 * IMPORTANTE: Al desactivar una categoría:
 * - Se desactivan todas sus subcategorías (hook afterUpdate)
 * - Se desactivan todos sus productos (hook afterUpdate de subcategoría)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const toggleCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar categoría
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Alter nar estado activo
    const nuevoEstado = !categoria.activo;
    categoria.activo = nuevoEstado;
    
    // Guardar cambios (el hook afterUpdate se encargará de la cascada)
    await categoria.save();
    
    // Contar cuántos registros se afectaron
    const subcategoriasAfectadas = await Subcategoria.count({
      where: { categoriaId: id }
    });
    
    const productosAfectados = await Producto.count({
      where: { categoriaId: id }
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: `Categoría ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      data: {
        categoria,
        afectados: {
          subcategorias: subcategoriasAfectadas,
          productos: productosAfectados
        }
      }
    });
    
  } catch (error) {
    console.error('Error en toggleCategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de la categoría',
      error: error.message
    });
  }
};

/**
 * Eliminar categoría
 * 
 * DELETE /api/admin/categorias/:id
 * 
 * IMPORTANTE: Solo se puede eliminar si no tiene subcategorías o productos
 * Si tiene registros relacionados, se debe desactivar en lugar de eliminar
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar categoría
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // VALIDACIÓN: Verificar que no tenga subcategorías
    const subcategorias = await Subcategoria.count({
      where: { categoriaId: id }
    });
    
    if (subcategorias > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${subcategorias} subcategoría(s) asociada(s)`,
        sugerencia: 'Usa PATCH /api/admin/categorias/:id/toggle para desactivarla en lugar de eliminarla'
      });
    }
    
    // VALIDACIÓN: Verificar que no tenga productos
    const productos = await Producto.count({
      where: { categoriaId: id }
    });
    
    if (productos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${productos} producto(s) asociado(s)`,
        sugerencia: 'Usa PATCH /api/admin/categorias/:id/toggle para desactivarla en lugar de eliminarla'
      });
    }
    
    // ELIMINAR CATEGORÍA
    await categoria.destroy();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('Error en eliminarCategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de una categoría
 * 
 * GET /api/admin/categorias/:id/stats
 * 
 * Retorna:
 * - Total de subcategorías (activas e inactivas)
 * - Total de productos (activos e inactivos)
 * - Valor total del inventario
 * - Stock total
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getEstadisticasCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la categoría existe
    const categoria = await Categoria.findByPk(id);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Contar subcategorías
    const totalSubcategorias = await Subcategoria.count({
      where: { categoriaId: id }
    });
    
    const subcategoriasActivas = await Subcategoria.count({
      where: { categoriaId: id, activo: true }
    });
    
    // Contar productos
    const totalProductos = await Producto.count({
      where: { categoriaId: id }
    });
    
    const productosActivos = await Producto.count({
      where: { categoriaId: id, activo: true }
    });
    
    // Obtener productos para calcular estadísticas
    const productos = await Producto.findAll({
      where: { categoriaId: id },
      attributes: ['precio', 'stock']
    });
    
    // Calcular estadísticas de inventario
    let valorTotalInventario = 0;
    let stockTotal = 0;
    
    productos.forEach(producto => {
      valorTotalInventario += parseFloat(producto.precio) * producto.stock;
      stockTotal += producto.stock;
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        categoria: {
          id: categoria.id,
          nombre: categoria.nombre,
          activo: categoria.activo
        },
        estadisticas: {
          subcategorias: {
            total: totalSubcategorias,
            activas: subcategoriasActivas,
            inactivas: totalSubcategorias - subcategoriasActivas
          },
          productos: {
            total: totalProductos,
            activos: productosActivos,
            inactivos: totalProductos - productosActivos
          },
          inventario: {
            stockTotal,
            valorTotal: valorTotalInventario.toFixed(2)
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getEstadisticasCategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Exportar todos los controladores
module.exports = {
  getCategorias,
  getCategoriaById,
  crearCategoria,
  actualizarCategoria,
  toggleCategoria,
  eliminarCategoria,
  getEstadisticasCategoria
};
