const mongoose = require('mongoose');

// Use the same configuration as the project
const STORAGE_MONGODB_URI = process.env.STORAGE_MONGODB_URI || 'mongodb://root:example@localhost:27017/admin';

async function optimizeIndexes() {
  try {
    console.log('Connecting to database...');
    console.log('MONGODB_URI:', STORAGE_MONGODB_URI);
    await mongoose.connect(STORAGE_MONGODB_URI);
    console.log('Connected to database');

    console.log('Creating optimized indexes for locations...');
    
    // Create compound indexes for better query performance
    await mongoose.connection.db.collection('locations').createIndex(
      { companyId: 1, parentId: 1, name: 1 },
      { name: 'company_parent_name_idx' }
    );
    
    await mongoose.connection.db.collection('locations').createIndex(
      { companyId: 1, parentId: 1 },
      { name: 'company_parent_idx' }
    );
    
    await mongoose.connection.db.collection('locations').createIndex(
      { companyId: 1, name: 1 },
      { name: 'company_name_idx' }
    );
    
    await mongoose.connection.db.collection('locations').createIndex(
      { internalCode: 1, companyId: 1 },
      { name: 'internal_code_company_idx', unique: true }
    );

    console.log('Creating optimized indexes for machines...');
    
    await mongoose.connection.db.collection('machines').createIndex(
      { companyId: 1, locationId: 1 },
      { name: 'company_location_idx' }
    );
    
    await mongoose.connection.db.collection('machines').createIndex(
      { companyId: 1, model: 1, locationId: 1 },
      { name: 'company_model_location_idx' }
    );

    console.log('Indexes created successfully!');
    
    // Show current indexes using listIndexes
    console.log('\nCurrent Location indexes:');
    try {
      const locationIndexes = await mongoose.connection.db.collection('locations').listIndexes().toArray();
      console.log(locationIndexes);
    } catch (error) {
      console.log('Could not list location indexes:', error.message);
    }
    
    console.log('\nCurrent Machine indexes:');
    try {
      const machineIndexes = await mongoose.connection.db.collection('machines').listIndexes().toArray();
      console.log(machineIndexes);
    } catch (error) {
      console.log('Could not list machine indexes:', error.message);
    }
    
  } catch (error) {
    console.error('Error optimizing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

optimizeIndexes();