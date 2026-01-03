/**
 * Environment Variables Validation
 * ตรวจสอบว่า required environment variables มีครบหรือไม่
 */

/**
 * Required environment variables
 */
const requiredEnvVars = {
  // Database - either DATABASE_URL or individual DB_* vars are required (handled separately)
  DATABASE_URL: {
    required: false,
    description: 'PostgreSQL database connection string (alternative to DB_USER/DB_HOST/etc.)'
  },
  DB_USER: {
    required: false,
    description: 'PostgreSQL database user (required if not using DATABASE_URL)'
  },
  DB_HOST: {
    required: false,
    description: 'PostgreSQL database host (required if not using DATABASE_URL)'
  },
  DB_NAME: {
    required: false,
    description: 'PostgreSQL database name (required if not using DATABASE_URL)'
  },
  DB_PASSWORD: {
    required: false,
    description: 'PostgreSQL database password (required if not using DATABASE_URL)'
  },
  DB_PORT: {
    required: false,
    description: 'PostgreSQL database port (required if not using DATABASE_URL)'
  },
  
  // JWT
  JWT_SECRET: {
    required: true,
    description: 'Secret key for JWT token signing'
  },
  // Note: JWT_EXPIRES_IN and REFRESH_TOKEN_EXPIRES_IN are optional (have defaults)
  
  // Email (required if using email features)
  EMAIL_HOST: {
    required: false,
    description: 'SMTP server host for email sending'
  },
  EMAIL_USER: {
    required: false,
    description: 'SMTP username for email sending'
  },
  EMAIL_PASS: {
    required: false,
    description: 'SMTP password/app password for email sending'
  },
  
  // Cloudinary (required if using image upload)
  CLOUDINARY_CLOUD_NAME: {
    required: false,
    description: 'Cloudinary cloud name for image storage'
  },
  CLOUDINARY_API_KEY: {
    required: false,
    description: 'Cloudinary API key'
  },
  CLOUDINARY_API_SECRET: {
    required: false,
    description: 'Cloudinary API secret'
  }
};

/**
 * Validate required environment variables
 * @returns {Object} { isValid: boolean, missing: string[], warnings: string[] }
 */
export const validateEnvironmentVariables = () => {
  const missing = [];
  const warnings = [];
  
  // Check required variables
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    if (config.required && !process.env[key]) {
      missing.push({ key, description: config.description });
    }
  }
  
  // Special check: Database configuration must have either DATABASE_URL or all DB_* vars
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasIndividualDbVars = !!(process.env.DB_USER && process.env.DB_HOST && process.env.DB_NAME && process.env.DB_PASSWORD && process.env.DB_PORT);
  
  if (!hasDatabaseUrl && !hasIndividualDbVars) {
    missing.push({
      key: 'DATABASE_URL or (DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT)',
      description: 'Either DATABASE_URL connection string OR all individual database variables (DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT) are required'
    });
  }
  
  // Check email configuration completeness
  const emailVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
  const emailMissing = emailVars.filter(key => !process.env[key]);
  if (emailMissing.length > 0 && emailMissing.length < emailVars.length) {
    warnings.push({
      type: 'incomplete',
      message: 'Email configuration is incomplete. Email features may not work properly.',
      missing: emailMissing.map(key => requiredEnvVars[key]?.description || key)
    });
  }
  
  // Check Cloudinary configuration completeness
  const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const cloudinaryMissing = cloudinaryVars.filter(key => !process.env[key]);
  if (cloudinaryMissing.length > 0 && cloudinaryMissing.length < cloudinaryVars.length) {
    warnings.push({
      type: 'incomplete',
      message: 'Cloudinary configuration is incomplete. Image upload features may not work properly.',
      missing: cloudinaryMissing.map(key => requiredEnvVars[key]?.description || key)
    });
  }
  
  // Check JWT_SECRET strength (warning if too short)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push({
      type: 'security',
      message: 'JWT_SECRET is too short. For security, it should be at least 32 characters long.'
    });
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
};

/**
 * Print validation results
 */
export const printValidationResults = (results) => {
  if (!results.isValid) {
    console.error('\n❌ Missing required environment variables:');
    results.missing.forEach(({ key, description }) => {
      console.error(`   - ${key}: ${description}`);
    });
    console.error('\nPlease set these variables in your .env file.');
    console.error('💡 For database: Use either DATABASE_URL OR set DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT\n');
    return false;
  }
  
  if (results.warnings.length > 0) {
    console.warn('\n⚠️  Environment variable warnings:');
    results.warnings.forEach(warning => {
      console.warn(`   - ${warning.message}`);
      if (warning.missing) {
        warning.missing.forEach(desc => console.warn(`     Missing: ${desc}`));
      }
    });
    console.warn('');
  }
  
  return true;
};

/**
 * Validate and exit if invalid (for startup)
 * @param {boolean} exitOnMissing - ถ้า true จะ exit ถ้า missing required vars (default: true)
 */
export const validateAndExitIfInvalid = (exitOnMissing = true) => {
  const results = validateEnvironmentVariables();
  const isValid = printValidationResults(results);
  
  if (!isValid && exitOnMissing) {
    console.error('\n❌ Server cannot start without required environment variables.');
    console.error('Please set missing variables in your .env file.\n');
    process.exit(1);
  }
  
  return results;
};

