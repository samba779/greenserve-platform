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
      const mobileUniqueIndex = userIndexes.find(idx => 
        idx.key && idx.key.mobile === 1 && idx.unique === true
      );
      if (mobileUniqueIndex) {
        await userCollection.dropIndex(mobileUniqueIndex.name);
        console.log('✅ Dropped unique index on mobile from users collection');
      }
    } catch (idxErr) {
      console.log('ℹ️ No mobile unique index to drop in users (or already dropped)');
    }

    // Check and drop mobile unique index from workers collection  
    try {
      const workerCollection = db.collection('workers');
      const workerIndexes = await workerCollection.indexes();
      const workerMobileUniqueIndex = workerIndexes.find(idx =>
        idx.key && idx.key.mobile === 1 && idx.unique === true
      );
      if (workerMobileUniqueIndex) {
        await workerCollection.dropIndex(workerMobileUniqueIndex.name);
        console.log('✅ Dropped unique index on mobile from workers collection');
      }
    } catch (idxErr) {
      console.log('ℹ️ No mobile unique index to drop in workers (or already dropped)');
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
