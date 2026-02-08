/**
 * ============================================
 * CONTROLADOR DE SUBCATEGORÍAS
 * ============================================
 * Maneja las operaciones CRUD de subcategorías
 * Solo accesible por administradores
 */

// Importar modelos
const Subcategoria = require('../models/Subcategoria');
const Categoria = require('../models/Categoria');
const Producto = require('../models/Producto');

/**
 * Obtener todas las subcategorías
 * 
 * GET /api/admin/subcategorias
 * Query params:
 * - categoriaId: ID de la categoría (filtrar por categoría)
 * - activo: true/false (filtrar por estado)
 * - incluirCategoria: true/false (incluir datos de la categoría)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getSubcategorias = async (req, res) => {
  try {
    const { categoriaId, activo, incluirCategoria } = req.query;
    
    // Opciones de consulta
    const opciones = {
      order: [['nombre', 'ASC']]
    };
    
    // Filtros opcionales
    const where = {};
    if (categoriaId) where.categoriaId = categoriaId;
    if (activo !== undefined) where.activo = activo === 'true';
    
    if (Object.keys(where).length > 0) {
      opciones.where = where;
    }
    
    // Incluir categoría si se solicita
    if (incluirCategoria === 'true') {
      opciones.include = [{
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre', 'activo']
      }];
    }
    
    // Obtener subcategorías
    const subcategorias = await Subcategoria.findAll(opciones);
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      count: subcategorias.length,
      data: {
        subcategorias
      }
    });
    
  } catch (error) {
    console.error('Error en getSubcategorias:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener subcategorías',
      error: error.message
    });
  }
};

/**
 * Obtener una subcategoría por ID
 * 
 * GET /api/admin/subcategorias/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getSubcategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar subcategoría con categoría y contar productos
    const subcategoria = await Subcategoria.findByPk(id, {
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre', 'activo']
        },
        {
          model: Producto,
          as: 'productos',
          attributes: ['id']
        }
      ]
    });
    
    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // Agregar contador de productos
    const subcategoriaJSON = subcategoria.toJSON();
    subcategoriaJSON.totalProductos = subcategoriaJSON.productos.length;
    delete subcategoriaJSON.productos;
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        subcategoria: subcategoriaJSON
      }
    });
    
  } catch (error) {
    console.error('Error en getSubcategoriaById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener subcategoría',
      error: error.message
    });
  }
};

/**
 * Crear nueva subcategoría
 * 
 * POST /api/admin/subcategorias
 * Body: { nombre, descripcion, categoriaId }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const crearSubcategoria = async (req, res) => {
  try {
    const { nombre, descripcion, categoriaId } = req.body;
    
    // VALIDACIÓN 1: Verificar campos requeridos
    if (!nombre || !categoriaId) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y categoriaId son requeridos'
      });
    }
    
    // VALIDACIÓN 2: Verificar que la categoría existe
    const categoria = await Categoria.findByPk(categoriaId);
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: `No existe una categoría con ID ${categoriaId}`
      });
    }
    
    // VALIDACIÓN 3: Verificar que la categoría está activa
    // (El hook beforeCreate también hace esta validación)
    if (!categoria.activo) {
      return res.status(400).json({
        success: false,
        message: `La categoría "${categoria.nombre}" está inactiva. Actívala primero`
      });
    }
    
    // VALIDACIÓN 4: Verificar que no exista subcategoría con el mismo nombre en esta categoría
    const subcategoriaExistente = await Subcategoria.findOne({
      where: { nombre, categoriaId }
    });
    
    if (subcategoriaExistente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una subcategoría con el nombre "${nombre}" en esta categoría`
      });
    }
    
    // CREAR SUBCATEGORÍA
    const nuevaSubcategoria = await Subcategoria.create({
      nombre,
      descripcion: descripcion || null,
      categoriaId,
      activo: true
    });
    
    // Obtener subcategoría con datos de la categoría
    const subcategoriaConCategoria = await Subcategoria.findByPk(nuevaSubcategoria.id, {
      include: [{
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre']
      }]
    });
    
    // RESPUESTA EXITOSA
    res.status(201).json({
      success: true,
      message: 'Subcategoría creada exitosamente',
      data: {
        subcategoria: subcategoriaConCategoria
      }
    });
    
  } catch (error) {
    console.error('Error en crearSubcategoria:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear subcategoría',
      error: error.message
    });
  }
};

/**
 * Actualizar subcategoría
 * 
 * PUT /api/admin/subcategorias/:id
 * Body: { nombre, descripcion, categoriaId }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoriaId, activo } = req.body;
    
    // Buscar subcategoría
    const subcategoria = await Subcategoria.findByPk(id);
    
    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // VALIDACIÓN: Si se cambia la categoría, verificar que existe y está activa
    if (categoriaId && categoriaId !== subcategoria.categoriaId) {
      const nuevaCategoria = await Categoria.findByPk(categoriaId);
      
      if (!nuevaCategoria) {
        return res.status(404).json({
          success: false,
          message: `No existe una categoría con ID ${categoriaId}`
        });
      }
      
      if (!nuevaCategoria.activo) {
        return res.status(400).json({
          success: false,
          message: `La categoría "${nuevaCategoria.nombre}" está inactiva`
        });
      }
    }
    
    // VALIDACIÓN: Si se cambia el nombre, verificar que no exista en la categoría
    if (nombre && nombre !== subcategoria.nombre) {
      const categoriaFinal = categoriaId || subcategoria.categoriaId;
      
      const subcategoriaConMismoNombre = await Subcategoria.findOne({
        where: { 
          nombre,
          categoriaId: categoriaFinal
        }
      });
      
      if (subcategoriaConMismoNombre) {
        return res.status(400).json({
          success: false,
          message: `Ya existe una subcategoría con el nombre "${nombre}" en esta categoría`
        });
      }
    }
    
    // ACTUALIZAR CAMPOS
    if (nombre !== undefined) subcategoria.nombre = nombre;
    if (descripcion !== undefined) subcategoria.descripcion = descripcion;
    if (categoriaId !== undefined) subcategoria.categoriaId = categoriaId;
    if (activo !== undefined) subcategoria.activo = activo;
    
    // Guardar cambios
    await subcategoria.save();
    
    // Recargar con datos de la categoría
    await subcategoria.reload({
      include: [{
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre']
      }]
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Subcategoría actualizada exitosamente',
      data: {
        subcategoria
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarSubcategoria:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar subcategoría',
      error: error.message
    });
  }
};

/**
 * Activar/Desactivar subcategoría
 * 
 * PATCH /api/admin/subcategorias/:id/toggle
 * 
 * IMPORTANTE: Al desactivar una subcategoría:
 * - Se desactivan todos sus productos (hook afterUpdate)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const toggleSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar subcategoría
    const subcategoria = await Subcategoria.findByPk(id);
    
    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // Alternar estado activo
    const nuevoEstado = !subcategoria.activo;
    subcategoria.activo = nuevoEstado;
    
    // Guardar cambios (el hook afterUpdate se encargará de la cascada)
    await subcategoria.save();
    
    // Contar productos afectados
    const productosAfectados = await Producto.count({
      where: { subcategoriaId: id }
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: `Subcategoría ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      data: {
        subcategoria,
        productosAfectados
      }
    });
    
  } catch (error) {
    console.error('Error en toggleSubcategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado de la subcategoría',
      error: error.message
    });
  }
};

/**
 * Eliminar subcategoría
 * 
 * DELETE /api/admin/subcategorias/:id
 * 
 * IMPORTANTE: Solo se puede eliminar si no tiene productos
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const eliminarSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar subcategoría
    const subcategoria = await Subcategoria.findByPk(id);
    
    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // VALIDACIÓN: Verificar que no tenga productos
    const productos = await Producto.count({
      where: { subcategoriaId: id }
    });
    
    if (productos > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la subcategoría porque tiene ${productos} producto(s) asociado(s)`,
        sugerencia: 'Usa PATCH /api/admin/subcategorias/:id/toggle para desactivarla'
      });
    }
    
    // ELIMINAR SUBCATEGORÍA
    await subcategoria.destroy();
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Subcategoría eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('Error en eliminarSubcategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar subcategoría',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de una subcategoría
 * 
 * GET /api/admin/subcategorias/:id/stats
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getEstadisticasSubcategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la subcategoría existe
    const subcategoria = await Subcategoria.findByPk(id, {
      include: [{
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre']
      }]
    });
    
    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: 'Subcategoría no encontrada'
      });
    }
    
    // Contar productos
    const totalProductos = await Producto.count({
      where: { subcategoriaId: id }
    });
    
    const productosActivos = await Producto.count({
      where: { subcategoriaId: id, activo: true }
    });
    
    // Obtener productos para calcular estadísticas
    const productos = await Producto.findAll({
      where: { subcategoriaId: id },
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
        subcategoria: {
          id: subcategoria.id,
          nombre: subcategoria.nombre,
          activo: subcategoria.activo,
          categoria: subcategoria.categoria
        },
        estadisticas: {
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
    console.error('Error en getEstadisticasSubcategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Exportar todos los controladores
module.exports = {
  getSubcategorias,
  getSubcategoriaById,
  crearSubcategoria,
  actualizarSubcategoria,
  toggleSubcategoria,
  eliminarSubcategoria,
  getEstadisticasSubcategoria
};
