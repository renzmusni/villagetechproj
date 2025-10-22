// Centralized Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Supabase specific errors
  if (err.code?.startsWith('PGRST')) {
    handleSupabaseError(err);
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const response = {
    success: false,
    message,
    ...(isDevelopment && { stack: err.stack, details: error })
  };

  res.status(statusCode).json(response);
};

// Handle Supabase specific errors
const handleSupabaseError = (error) => {
  switch (error.code) {
    case 'PGRST116':
      error.message = 'Resource not found';
      error.statusCode = 404;
      break;
    case 'PGRST301':
      error.message = 'Unauthorized access';
      error.statusCode = 401;
      break;
    case 'PGRST302':
      error.message = 'Forbidden access';
      error.statusCode = 403;
      break;
    case '23505':
      error.message = 'Duplicate entry';
      error.statusCode = 409;
      break;
    case '23503':
      error.message = 'Foreign key constraint violation';
      error.statusCode = 400;
      break;
    case '23502':
      error.message = 'Required field missing';
      error.statusCode = 400;
      break;
    default:
      error.message = 'Database operation failed';
      error.statusCode = 500;
  }
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation schemas
const validationSchemas = {
  // User validation
  user: {
    register: {
      email: {
        type: 'string',
        required: true,
        format: 'email',
        maxLength: 255
      },
      password: {
        type: 'string',
        required: true,
        minLength: 6,
        maxLength: 128
      },
      firstName: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
      },
      lastName: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
      },
      role: {
        type: 'string',
        enum: ['superadmin', 'admin', 'staff', 'resident'],
        default: 'resident'
      }
    },
    login: {
      email: {
        type: 'string',
        required: true,
        format: 'email'
      },
      password: {
        type: 'string',
        required: true
      }
    }
  },

  // Household validation
  household: {
    create: {
      unit_number: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 50
      },
      address: {
        type: 'string',
        required: true,
        minLength: 5,
        maxLength: 500
      },
      type: {
        type: 'string',
        enum: ['apartment', 'house', 'condo', 'townhouse'],
        required: true
      },
      bedrooms: {
        type: 'number',
        min: 0,
        max: 20,
        required: true
      },
      bathrooms: {
        type: 'number',
        min: 0,
        max: 20,
        required: true
      },
      area_sqft: {
        type: 'number',
        min: 0,
        max: 10000
      },
      owner_name: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 200
      },
      owner_email: {
        type: 'string',
        format: 'email',
        maxLength: 255
      },
      owner_phone: {
        type: 'string',
        pattern: '^[+]?[0-9]{10,15}$',
        maxLength: 20
      }
    }
  },

  // Vehicle validation
  vehicle: {
    create: {
      make: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
      },
      model: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
      },
      year: {
        type: 'number',
        min: 1900,
        max: new Date().getFullYear() + 1,
        required: true
      },
      color: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 50
      },
      license_plate: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 20,
        pattern: '^[A-Z0-9- ]+$'
      },
      type: {
        type: 'string',
        enum: ['car', 'motorcycle', 'truck', 'suv', 'van', 'electric'],
        required: true
      },
      household_id: {
        type: 'string',
        required: true
      }
    }
  },

  // Delivery validation
  delivery: {
    create: {
      recipient_name: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 200
      },
      recipient_email: {
        type: 'string',
        format: 'email',
        maxLength: 255
      },
      recipient_phone: {
        type: 'string',
        pattern: '^[+]?[0-9]{10,15}$',
        maxLength: 20
      },
      courier_service: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
      },
      tracking_number: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      package_type: {
        type: 'string',
        enum: ['envelope', 'small_package', 'medium_package', 'large_package', 'document'],
        default: 'small_package'
      },
      household_id: {
        type: 'string'
      },
      special_instructions: {
        type: 'string',
        maxLength: 500
      }
    }
  },

  // Security incident validation
  securityIncident: {
    create: {
      title: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 200
      },
      description: {
        type: 'string',
        required: true,
        minLength: 10,
        maxLength: 2000
      },
      incident_type: {
        type: 'string',
        enum: ['theft', 'vandalism', 'assault', 'trespassing', 'suspicious_activity', 'noise_complaint', 'parking_violation', 'property_damage', 'cyber_security', 'access_control', 'other'],
        required: true
      },
      severity_level: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
      },
      location: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 200
      },
      household_id: {
        type: 'string'
      },
      occurred_at: {
        type: 'string',
        format: 'date-time'
      },
      suspected_individuals: {
        type: 'array',
        items: {
          type: 'string',
          maxLength: 100
        },
        maxItems: 10
      },
      witnesses: {
        type: 'array',
        items: {
          type: 'string',
          maxLength: 100
        },
        maxItems: 10
      },
      evidence: {
        type: 'array',
        items: {
          type: 'string',
          maxLength: 200
        },
        maxItems: 20
      },
      immediate_action_taken: {
        type: 'string',
        maxLength: 1000
      }
    }
  }
};

// Validation middleware
const validate = (schema, resource) => {
  return (req, res, next) => {
    const rules = validationSchemas[schema]?.[resource];
    if (!rules) {
      return next(new Error('Validation schema not found'));
    }

    const errors = validateRequest(req.body, rules);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};

// Validate request against schema rules
const validateRequest = (data, rules) => {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip further validation if field is not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    if (rule.type && typeof value !== rule.type) {
      errors.push(`${field} must be of type ${rule.type}`);
      continue;
    }

    // String validations
    if (rule.type === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field} must not exceed ${rule.maxLength} characters`);
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
        errors.push(`${field} format is invalid`);
      }
      if (rule.format === 'email' && !isValidEmail(value)) {
        errors.push(`${field} must be a valid email address`);
      }
    }

    // Number validations
    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must not exceed ${rule.max}`);
      }
    }

    // Array validations
    if (rule.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${field} must be an array`);
      } else {
        if (rule.maxItems && value.length > rule.maxItems) {
          errors.push(`${field} must not exceed ${rule.maxItems} items`);
        }
        if (rule.items) {
          for (let i = 0; i < value.length; i++) {
            if (rule.items.type && typeof value[i] !== rule.items.type) {
              errors.push(`${field}[${i}] must be of type ${rule.items.type}`);
            }
            if (rule.items.maxLength && value[i].length > rule.items.maxLength) {
              errors.push(`${field}[${i}] must not exceed ${rule.items.maxLength} characters`);
            }
          }
        }
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }
  }

  return errors;
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 400) {
      console.error(`❌ ${log}`);
    } else {
      console.log(`✅ ${log}`);
    }
  });

  next();
};

// Rate limiting middleware (simple implementation)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    // Check limit
    if (requests.get(key).length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }

    // Add current request
    requests.get(key).push(now);
    next();
  };
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  };

  const sanitizeObj = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObj(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObj(req.body);
  }

  if (req.query) {
    req.query = sanitizeObj(req.query);
  }

  if (req.params) {
    req.params = sanitizeObj(req.params);
  }

  next();
};

module.exports = {
  errorHandler,
  asyncHandler,
  validate,
  requestLogger,
  rateLimit,
  sanitizeInput,
  validationSchemas
};