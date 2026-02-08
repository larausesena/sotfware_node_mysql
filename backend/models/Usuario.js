/**
 * ============================================
 * MODELO USUARIO
 * ============================================
 * Define la tabla 'Usuario' en la base de datos
 * Almacena información de usuarios (clientes y administradores)
 */

// Importar DataTypes de Sequelize para definir tipos de datos
const { DataTypes } = require('sequelize');

// Importar bcrypt para encriptar contraseñas
const bcrypt = require('bcryptjs');

// Importar instancia de sequelize
const { sequelize } = require('../config/database');

/**
 * Definir el modelo Usuario
 * sequelize.define(nombreModelo, atributos, opciones)
 */
const Usuario = sequelize.define('Usuario', {
  // ==========================================
  // CAMPOS DE LA TABLA
  // ==========================================
  
  /**
   * id - Identificador único (PRIMARY KEY)
   * Se crea automáticamente por Sequelize
   */
  id: {
    type: DataTypes.INTEGER,      // Tipo: Número entero
    primaryKey: true,              // Es la clave primaria
    autoIncrement: true,           // Se incrementa automáticamente
    allowNull: false               // No puede ser null
  },

  /**
   * nombre - Nombre completo del usuario
   */
  nombre: {
    type: DataTypes.STRING(100),   // Cadena de máximo 100 caracteres
    allowNull: false,              // Campo obligatorio
    validate: {
      notEmpty: {
        msg: 'El nombre no puede estar vacío'
      },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      }
    }
  },

  /**
   * email - Correo electrónico (único)
   */
  email: {
    type: DataTypes.STRING(100),   // Cadena de máximo 100 caracteres
    allowNull: false,              // Campo obligatorio
    unique: {
      msg: 'Este email ya está registrado'
    },
    validate: {
      isEmail: {
        msg: 'Debe ser un email válido'
      },
      notEmpty: {
        msg: 'El email no puede estar vacío'
      }
    }
  },

  /**
   * password - Contraseña encriptada
   */
  password: {
    type: DataTypes.STRING(255),   // Cadena larga para el hash
    allowNull: false,              // Campo obligatorio
    validate: {
      notEmpty: {
        msg: 'La contraseña no puede estar vacía'
      },
      len: {
        args: [6, 255],
        msg: 'La contraseña debe tener al menos 6 caracteres'
      }
    }
  },

  /**
   * rol - Rol del usuario (cliente, auxiliar o administrador)
   */
  rol: {
    type: DataTypes.ENUM('cliente', 'auxiliar', 'administrador'),  // Tres roles disponibles
    allowNull: false,
    defaultValue: 'cliente',       // Por defecto es cliente
    validate: {
      isIn: {
        args: [['cliente', 'auxiliar', 'administrador']],
        msg: 'El rol debe ser cliente, auxiliar o administrador'
      }
    }
  },

  /**
   * telefono - Teléfono del usuario (opcional)
   */
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,               // Opcional
    validate: {
      is: {
        args: /^[0-9+\-\s()]*$/,   // Solo números y caracteres telefónicos
        msg: 'El teléfono solo puede contener números y caracteres válidos'
      }
    }
  },

  /**
   * direccion - Dirección del usuario (opcional)
   */
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true                // Opcional
  },

  /**
   * activo - Estado del usuario (activo/inactivo)
   */
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true             // Por defecto activo
  }

}, {
  // ==========================================
  // OPCIONES DEL MODELO
  // ==========================================
  
  tableName: 'usuarios',           // Nombre de la tabla en la BD
  timestamps: true,                // Crea createdAt y updatedAt automáticamente
  
  /**
   * SCOPES - Consultas predefinidas
   */
  defaultScope: {
    // Por defecto, excluir el password de todas las consultas
    attributes: { exclude: ['password'] }
  },
  scopes: {
    // Scope para incluir el password cuando sea necesario (ej: login)
    withPassword: {
      attributes: {}  // Incluir todos los atributos
    }
  },
  
  /**
   * HOOKS - Funciones que se ejecutan en momentos específicos
   */
  hooks: {
    /**
     * beforeCreate - Se ejecuta ANTES de crear un usuario
     * Encripta la contraseña antes de guardarla en la BD
     */
    beforeCreate: async (usuario) => {
      if (usuario.password) {
        // Generar salt (semilla aleatoria) con factor de costo 10
        const salt = await bcrypt.genSalt(10);
        
        // Encriptar la contraseña con el salt
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    },

    /**
     * beforeUpdate - Se ejecuta ANTES de actualizar un usuario
     * Encripta la contraseña si fue modificada
     */
    beforeUpdate: async (usuario) => {
      // Verificar si la contraseña fue modificada
      if (usuario.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    }
  }
});

// ==========================================
// MÉTODOS DE INSTANCIA
// ==========================================

/**
 * Método para comparar contraseñas
 * Compara una contraseña en texto plano con el hash guardado
 * 
 * @param {string} passwordIngresado - Contraseña en texto plano
 * @returns {Promise<boolean>} - true si coinciden, false si no
 * 
 * Ejemplo de uso:
 * const coincide = await usuario.compararPassword('miPassword123');
 */
Usuario.prototype.compararPassword = async function(passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

/**
 * Método para obtener datos públicos del usuario (sin contraseña)
 * Útil para enviar al frontend sin exponer datos sensibles
 * 
 * @returns {Object} - Objeto con datos públicos del usuario
 * 
 * Ejemplo de uso:
 * const datosPublicos = usuario.toJSON();
 */
Usuario.prototype.toJSON = function() {
  const valores = Object.assign({}, this.get());
  
  // Eliminar la contraseña del objeto
  delete valores.password;
  
  return valores;
};

// ==========================================
// EXPORTAR MODELO
// ==========================================
module.exports = Usuario;
