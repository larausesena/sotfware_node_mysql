/**
 * ============================================
 * CONTROLADOR DE CATÁLOGO PÚBLICO
 * ============================================
 * Endpoints públicos para ver productos
 * No requieren autenticación
 */

// Importar modelos
const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');

/**
 * Obtener catálogo de productos (público)
 * 
 * GET /api/catalogo/productos
 * Query params:
 * - categoriaId: Filtrar por categoría
 * - subcategoriaId: Filtrar por subcategoría
 * - buscar: Texto para buscar
 * - precioMin, precioMax: Rango de precios
 * - orden: 'precio_asc' | 'precio_desc' | 'nombre' | 'reciente'
 * - pagina, limite: Paginación
 * 
 * Solo muestra productos activos con stock
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getProductos = async (req, res) => {
  try {
    const {
      categoriaId,
      subcategoriaId,
      buscar,
      precioMin,
      precioMax,
      orden = 'reciente',
      pagina = 1,
      limite = 100
    } = req.query;

    const { Op } = require('sequelize');
    
    // Filtros base: solo productos activos con stock
    const where = {
      activo: true,
      stock: { [Op.gt]: 0 }
    };
    
    // Filtros opcionales
    if (categoriaId) where.categoriaId = categoriaId;
    if (subcategoriaId) where.subcategoriaId = subcategoriaId;
    
    // Búsqueda por texto
    if (buscar) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${buscar}%` } },
        { descripcion: { [Op.like]: `%${buscar}%` } }
      ];
    }
    
    // Filtro por rango de precios
    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) where.precio[Op.gte] = parseFloat(precioMin);
      if (precioMax) where.precio[Op.lte] = parseFloat(precioMax);
    }
    
    // Ordenamiento
    let order;
    switch (orden) {
      case 'precio_asc':
        order = [['precio', 'ASC']];
        break;
      case 'precio_desc':
        order = [['precio', 'DESC']];
        break;
      case 'nombre':
        order = [['nombre', 'ASC']];
        break;
      case 'reciente':
      default:
        order = [['createdAt', 'DESC']];
        break;
    }
    
    // Paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Consultar productos
    const { count, rows: productos } = await Producto.findAndCountAll({
      where,
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
          where: { activo: true }
        },
        {
          model: Subcategoria,
          as: 'subcategoria',
          attributes: ['id', 'nombre'],
          where: { activo: true }
        }
      ],
      limit: parseInt(limite),
      offset,
      order
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        productos,
        paginacion: {
          total: count,
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          totalPaginas: Math.ceil(count / parseInt(limite))
        }
      }
    });
    
  } catch (error) {
    console.error('Error en getProductos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
};

/**
 * Obtener un producto por ID (público)
 * 
 * GET /api/catalogo/productos/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar producto activo con stock
    const producto = await Producto.findOne({
      where: { 
        id, 
        activo: true
      },
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
          where: { activo: true }
        },
        {
          model: Subcategoria,
          as: 'subcategoria',
          attributes: ['id', 'nombre'],
          where: { activo: true }
        }
      ]
    });
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado o no disponible'
      });
    }
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        producto
      }
    });
    
  } catch (error) {
    console.error('Error en getProductoById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
};

/**
 * Obtener todas las categorías (público)
 * 
 * GET /api/catalogo/categorias
 * Solo categorías activas con contador de productos
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getCategorias = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    // Obtener categorías activas
    const categorias = await Categoria.findAll({
      where: { activo: true },
      attributes: ['id', 'nombre', 'descripcion'],
      order: [['nombre', 'ASC']]
    });
    
    // Para cada categoría, contar productos activos con stock
    const categoriasConContador = await Promise.all(
      categorias.map(async (categoria) => {
        const totalProductos = await Producto.count({
          where: {
            categoriaId: categoria.id,
            activo: true,
            stock: { [Op.gt]: 0 }
          }
        });
        
        return {
          ...categoria.toJSON(),
          totalProductos
        };
      })
    );
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        categorias: categoriasConContador
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
 * Obtener subcategorías de una categoría (público)
 * 
 * GET /api/catalogo/categorias/:id/subcategorias
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getSubcategoriasPorCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { Op } = require('sequelize');
    
    // Verificar que la categoría existe y está activa
    const categoria = await Categoria.findOne({
      where: { id, activo: true }
    });
    
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Obtener subcategorías activas
    const subcategorias = await Subcategoria.findAll({
      where: {
        categoriaId: id,
        activo: true
      },
      attributes: ['id', 'nombre', 'descripcion'],
      order: [['nombre', 'ASC']]
    });
    
    // Contar productos por subcategoría
    const subcategoriasConContador = await Promise.all(
      subcategorias.map(async (subcategoria) => {
        const totalProductos = await Producto.count({
          where: {
            subcategoriaId: subcategoria.id,
            activo: true,
            stock: { [Op.gt]: 0 }
          }
        });
        
        return {
          ...subcategoria.toJSON(),
          totalProductos
        };
      })
    );
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      data: {
        categoria: {
          id: categoria.id,
          nombre: categoria.nombre
        },
        subcategorias: subcategoriasConContador
      }
    });
    
  } catch (error) {
    console.error('Error en getSubcategoriasPorCategoria:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener subcategorías',
      error: error.message
    });
  }
};

/**
 * Obtener productos destacados/recientes (público)
 * 
 * GET /api/catalogo/destacados
 * Query: ?limite=8
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getProductosDestacados = async (req, res) => {
  try {
    const { limite = 8 } = req.query;
    const { Op } = require('sequelize');
    
    // Obtener productos más recientes
    const productos = await Producto.findAll({
      where: {
        activo: true,
        stock: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre'],
          where: { activo: true }
        },
        {
          model: Subcategoria,
          as: 'subcategoria',
          attributes: ['id', 'nombre'],
          where: { activo: true }
        }
      ],
      limit: parseInt(limite),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: {
        productos
      }
    });
    
  } catch (error) {
    console.error('Error en getProductosDestacados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos destacados',
      error: error.message
    });
  }
};

// Exportar controladores
module.exports = {
  getProductos,
  getProductoById,
  getCategorias,
  getSubcategoriasPorCategoria,
  getProductosDestacados
};
