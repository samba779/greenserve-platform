require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/greenserve');
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // ✅ Remove unique indexes on mobile to allow multiple users per phone
    const db = conn.connection.db;
    
    // Check and drop mobile unique index from users collection
    try {
      const userCollection = db.collection('users');
      const userIndexes = await userCollection.indexes();
      
      // Drop mobile unique index
      const mobileUniqueIndex = userIndexes.find(idx => 
        idx.key && idx.key.mobile === 1 && idx.unique === true
      );
      if (mobileUniqueIndex) {
        await userCollection.dropIndex(mobileUniqueIndex.name);
        console.log('✅ Dropped unique index on mobile from users collection');
      }
      
      // Drop email unique index
      const emailUniqueIndex = userIndexes.find(idx => 
        idx.key && idx.key.email === 1 && idx.unique === true
      );
      if (emailUniqueIndex) {
        await userCollection.dropIndex(emailUniqueIndex.name);
        console.log('✅ Dropped unique index on email from users collection');
      }
    } catch (idxErr) {
      console.log('ℹ️ No unique indexes to drop in users (or already dropped)');
    }

    // Check and drop mobile and email unique index from workers collection  
    try {
      const workerCollection = db.collection('workers');
      const workerIndexes = await workerCollection.indexes();
      
      // Drop mobile unique index
      const workerMobileUniqueIndex = workerIndexes.find(idx =>
        idx.key && idx.key.mobile === 1 && idx.unique === true
      );
      if (workerMobileUniqueIndex) {
        await workerCollection.dropIndex(workerMobileUniqueIndex.name);
        console.log('✅ Dropped unique index on mobile from workers collection');
      }
      
      // Drop email unique index
      const workerEmailUniqueIndex = workerIndexes.find(idx =>
        idx.key && idx.key.email === 1 && idx.unique === true
      );
      if (workerEmailUniqueIndex) {
        await workerCollection.dropIndex(workerEmailUniqueIndex.name);
        console.log('✅ Dropped unique index on email from workers collection');
      }
    } catch (idxErr) {
      console.log('ℹ️ No unique indexes to drop in workers (or already dropped)');
    }

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

const testConnection = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/greenserve');
    console.log('Database connected successfully');
    await conn.disconnect();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
};

module.exports = { connectDB, testConnection, mongoose };
