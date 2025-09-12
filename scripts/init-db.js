const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models using dynamic import for TypeScript files
let Company, User;

async function loadModels() {
  const companyModule = await import('../src/models/Company.ts');
  const userModule = await import('../src/models/User.ts');
  Company = companyModule.default;
  User = userModule.default;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/admin';

async function initDatabase() {
  try {
    // Load models first
    await loadModels();
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if companies already exist
    const existingCompanies = await Company.find();
    if (existingCompanies.length > 0) {
      console.log('Database already initialized');
      return;
    }

    // Create default company
    const company = new Company({
      name: 'Empresa Demo',
      appName: 'Sistema de Mantenimiento',
      primaryColor: '#3b82f6',
      theme: 'system',
      branding: {
        appName: 'Sistema de Mantenimiento',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
        accentColor: '#60a5fa',
      },
      settings: {
        allowUserRegistration: true,
        requireEmailVerification: false,
        defaultUserRole: 'user',
      },
    });

    await company.save();
    console.log('Company created:', company.name);

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = new User({
      name: 'Administrador',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      companyId: company._id,
      isActive: true,
      preferences: {
        theme: 'system',
        language: 'es',
        notifications: {
          email: true,
          push: true,
        },
      },
    });

    await adminUser.save();
    console.log('Admin user created:', adminUser.email);

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 12);
    const regularUser = new User({
      name: 'Usuario Demo',
      email: 'user@demo.com',
      password: userPassword,
      role: 'user',
      companyId: company._id,
      isActive: true,
      preferences: {
        theme: 'system',
        language: 'es',
        notifications: {
          email: true,
          push: true,
        },
      },
    });

    await regularUser.save();
    console.log('Regular user created:', regularUser.email);

    console.log('\n=== Database Initialized Successfully ===');
    console.log('Admin credentials:');
    console.log('Email: admin@demo.com');
    console.log('Password: admin123');
    console.log('\nUser credentials:');
    console.log('Email: user@demo.com');
    console.log('Password: user123');

  } catch (error) {
    console.error('Error initializing database:', error);
    
    if (error.message && error.message.includes('authentication')) {
      console.log('\n=== MongoDB Authentication Required ===');
      console.log('Your MongoDB instance requires authentication.');
      console.log('Please set up MongoDB with one of these options:');
      console.log('1. Use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
      console.log('2. Install MongoDB locally without authentication');
      console.log('3. Set MONGODB_URI with credentials: mongodb://username:password@localhost:27017/maintenance_app');
      console.log('\nFor local development, you can install MongoDB Community Edition');
      console.log('and run it without authentication for testing.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

initDatabase();
