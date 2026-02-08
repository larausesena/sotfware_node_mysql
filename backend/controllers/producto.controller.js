/**
 * ============================================
 * CONTROLADOR DE PRODUCTOS
 * ============================================
 * Maneja las operaciones CRUD de productos
 * Incluye subida de imágenes con Multer
 * Solo accesible por administradores
 */

// Importar modelos
const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');
const Subcategoria = require('../models/Subcategoria');

// Importar path y fs para manejo de archivos
const path = require('path');
const fs = require('fs').promises;

/**
 * Obtener todos los productos (Admin)
 * 
 * GET /api/admin/productos
 * Query params:
 * - categoriaId: Filtrar por categoría
 * - subcategoriaId: Filtrar por subcategoría
 * - activo: true/false
 * - conStock: true (solo productos con stock > 0)
 * - buscar: texto para buscar en nombre o descripción
 * - pagina: número de página (default 1)
 * - limite: registros por página (default 10)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getProductos = async (req, res) => {
  try {
    const { 
      categoriaId, 
      subcategoriaId, 
      activo, 
      conStock,
      buscar,
      pagina = 1,
      limite = 10
    } = req.query;
    
    // Construir filtros
    const where = {};
    if (categoriaId) where.categoriaId = categoriaId;
    if (subcategoriaId) where.subcategoriaId = subcategoriaId;
    if (activo !== undefined) where.activo = activo === 'true';
    if (conStock === 'true') where.stock = { [require('sequelize').Op.gt]: 0 };
    
    // Búsqueda por texto
    if (buscar) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { nombre: { [Op.like]: `%${buscar}%` } },
        { descripcion: { [Op.like]: `%${buscar}%` } }
      ];
    }
    
    // Paginación
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
    // Opciones de consulta
    const opciones = {
      where,
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre']
        },
        {
          model: Subcategoria,
          as: 'subcategoria',
          attributes: ['id', 'nombre']
        }
      ],
      limit: parseInt(limite),
      offset,
      order: [['nombre', 'ASC']]
    };
    
    // Obtener productos y total
    const { count, rows: productos } = await Producto.findAndCountAll(opciones);
    
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
 * Obtener un producto por ID
 * 
 * GET /api/admin/productos/:id
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar producto con relaciones
    const producto = await Producto.findByPk(id, {
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre', 'activo']
        },
        {
          model: Subcategoria,
          as: 'subcategoria',
          attributes: ['id', 'nombre', 'activo']
        }
      ]
    });
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
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
 * Crear nuevo producto
 * 
 * POST /api/admin/productos
 * Body (multipart/form-data):
 * - nombre (requerido)
 * - descripcion
 * - precio (requerido)
 * - stock (requerido)
 * - categoriaId (requerido)
 * - subcategoriaId (requerido)
 * - imagen (archivo - opcional)
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoriaId, subcategoriaId } = req.body;
    
    // VALIDACIÓN 1: Campos requeridos
    if (!nombre || !precio || !categoriaId || !subcategoriaId) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: nombre, precio, categoriaId y subcategoriaId'
      });
    }
    
    // VALIDACIÓN 2: Verificar que la categoría existe y está activa
    const categoria = await Categoria.findByPk(categoriaId);
    if (!categoria) {
      return res.status(404).json({
        success: false,
        message: `No existe una categoría con ID ${categoriaId}`
      });
    }
    if (!categoria.activo) {
      return res.status(400).json({
        success: false,
        message: `La categoría "${categoria.nombre}" está inactiva`
      });
    }
    
    // VALIDACIÓN 3: Verificar que la subcategoría existe, está activa y pertenece a la categoría
    const subcategoria = await Subcategoria.findByPk(subcategoriaId);
    if (!subcategoria) {
      return res.status(404).json({
        success: false,
        message: `No existe una subcategoría con ID ${subcategoriaId}`
      });
    }
    if (!subcategoria.activo) {
      return res.status(400).json({
        success: false,
        message: `La subcategoría "${subcategoria.nombre}" está inactiva`
      });
    }
    if (subcategoria.categoriaId !== parseInt(categoriaId)) {
      return res.status(400).json({
        success: false,
        message: `La subcategoría "${subcategoria.nombre}" no pertenece a la categoría seleccionada`
      });
    }
    
    // VALIDACIÓN 4: Precio y stock válidos
    if (parseFloat(precio) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor a 0'
      });
    }
    if (parseInt(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: 'El stock no puede ser negativo'
      });
    }
    
    // Obtener nombre de archivo de imagen si se subió
    const imagen = req.file ? req.file.filename : null;
    
    // CREAR PRODUCTO
    const nuevoProducto = await Producto.create({
      nombre,
      descripcion: descripcion || null,
      precio: parseFloat(precio),
      stock: parseInt(stock) || 0,
      categoriaId: parseInt(categoriaId),
      subcategoriaId: parseInt(subcategoriaId),
      imagen,
      activo: true
    });
    
    // Recargar con relaciones
    await nuevoProducto.reload({
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Subcategoria, as: 'subcategoria', attributes: ['id', 'nombre'] }
      ]
    });
    
    // RESPUESTA EXITOSA
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: {
        producto: nuevoProducto
      }
    });
    
  } catch (error) {
    console.error('Error en crearProducto:', error);
    
    // Si hubo un error, eliminar la imagen subida
    if (req.file) {
      const rutaImagen = path.join(__dirname, '../uploads', req.file.filename);
      try {
        await fs.unlink(rutaImagen);
      } catch (err) {
        console.error('Error al eliminar imagen:', err);
      }
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
};

/**
 * Actualizar producto
 * 
 * PUT /api/admin/productos/:id
 * Body (multipart/form-data):
 * - nombre, descripcion, precio, stock, categoriaId, subcategoriaId, imagen
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, categoriaId, subcategoriaId, activo } = req.body;
    
    // Buscar producto
    const producto = await Producto.findByPk(id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // VALIDACIONES si se cambian categoría o subcategoría
    if (categoriaId && categoriaId !== producto.categoriaId) {
      const categoria = await Categoria.findByPk(categoriaId);
      if (!categoria || !categoria.activo) {
        return res.status(400).json({
          success: false,
          message: 'Categoría inválida o inactiva'
        });
      }
    }
    
    if (subcategoriaId && subcategoriaId !== producto.subcategoriaId) {
      const subcategoria = await Subcategoria.findByPk(subcategoriaId);
      if (!subcategoria || !subcategoria.activo) {
        return res.status(400).json({
          success: false,
          message: 'Subcategoría inválida o inactiva'
        });
      }
      
      const catId = categoriaId || producto.categoriaId;
      if (subcategoria.categoriaId !== parseInt(catId)) {
        return res.status(400).json({
          success: false,
          message: 'La subcategoría no pertenece a la categoría seleccionada'
        });
      }
    }
    
    // Validar precio y stock
    if (precio && parseFloat(precio) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio debe ser mayor a 0'
      });
    }
    if (stock && parseInt(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: 'El stock no puede ser negativo'
      });
    }
    
    // Manejar imagen nueva
    if (req.file) {
      // Eliminar imagen anterior si existe
      if (producto.imagen) {
        const rutaImagenAnterior = path.join(__dirname, '../uploads', producto.imagen);
        try {
          await fs.unlink(rutaImagenAnterior);
        } catch (err) {
          console.error('Error al eliminar imagen anterior:', err);
        }
      }
      producto.imagen = req.file.filename;
    }
    
    // ACTUALIZAR CAMPOS
    if (nombre !== undefined) producto.nombre = nombre;
    if (descripcion !== undefined) producto.descripcion = descripcion;
    if (precio !== undefined) producto.precio = parseFloat(precio);
    if (stock !== undefined) producto.stock = parseInt(stock);
    if (categoriaId !== undefined) producto.categoriaId = parseInt(categoriaId);
    if (subcategoriaId !== undefined) producto.subcategoriaId = parseInt(subcategoriaId);
    if (activo !== undefined) producto.activo = activo;
    
    // Guardar cambios
    await producto.save();
    
    // Recargar con relaciones
    await producto.reload({
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Subcategoria, as: 'subcategoria', attributes: ['id', 'nombre'] }
      ]
    });
    
    // RESPUESTA EXITOSA
    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: {
        producto
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarProducto:', error);
    
    // Si hubo error, eliminar la nueva imagen subida
    if (req.file) {
      const rutaImagen = path.join(__dirname, '../uploads', req.file.filename);
      try {
        await fs.unlink(rutaImagen);
      } catch (err) {
        console.error('Error al eliminar imagen:', err);
      }
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: error.errors.map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
};

/**
 * Activar/Desactivar producto
 * 
 * PATCH /api/admin/productos/:id/toggle
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const toggleProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const producto = await Producto.findByPk(id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    producto.activo = !producto.activo;
    await producto.save();
    
    res.json({
      success: true,
      message: `Producto ${producto.activo ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        producto
      }
    });
    
  } catch (error) {
    console.error('Error en toggleProducto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del producto',
      error: error.message
    });
  }
};

/**
 * Eliminar producto
 * 
 * DELETE /api/admin/productos/:id
 * Elimina el producto y su imagen
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const producto = await Producto.findByPk(id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // El hook beforeDestroy se encargará de eliminar la imagen
    await producto.destroy();
    
    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error en eliminarProducto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
};

/**
 * Actualizar stock de un producto
 * 
 * PATCH /api/admin/productos/:id/stock
 * Body: { cantidad, operacion: 'aumentar' | 'reducir' | 'establecer' }
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 */
const actualizarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, operacion } = req.body;
    
    if (!cantidad || !operacion) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere cantidad y operación'
      });
    }
    
    const cantidadNum = parseInt(cantidad);
    if (cantidadNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad no puede ser negativa'
      });
    }
    
    const producto = await Producto.findByPk(id);
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    let nuevoStock;
    
    switch (operacion) {
      case 'aumentar':
        nuevoStock = producto.aumentarStock(cantidadNum);
        break;
      case 'reducir':
        if (cantidadNum > producto.stock) {
          return res.status(400).json({
            success: false,
            message: `No hay suficiente stock. Stock actual: ${producto.stock}`
          });
        }
        nuevoStock = producto.reducirStock(cantidadNum);
        break;
      case 'establecer':
        nuevoStock = cantidadNum;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Operación inválida. Usa: aumentar, reducir o establecer'
        });
    }
    
    producto.stock = nuevoStock;
    await producto.save();
    
    res.json({
      success: true,
      message: `Stock ${operacion === 'aumentar' ? 'aumentado' : operacion === 'reducir' ? 'reducido' : 'establecido'} exitosamente`,
      data: {
        productoId: producto.id,
        nombre: producto.nombre,
        stockAnterior: operacion === 'establecer' ? null : (operacion === 'aumentar' ? producto.stock - cantidadNum : producto.stock + cantidadNum),
        stockNuevo: producto.stock
      }
    });
    
  } catch (error) {
    console.error('Error en actualizarStock:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar stock',
      error: error.message
    });
  }
};

// Exportar todos los controladores
module.exports = {
  getProductos,
  getProductoById,
  crearProducto,
  actualizarProducto,
  toggleProducto,
  eliminarProducto,
  actualizarStock
};
