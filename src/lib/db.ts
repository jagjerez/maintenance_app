import mongoose from 'mongoose';

const STORAGE_MONGODB_URI = process.env.STORAGE_MONGODB_URI || 'mongodb://localhost:27017/maintenance_app';

if (!STORAGE_MONGODB_URI) {
  throw new Error('Please define the STORAGE_MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(STORAGE_MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;
export { connectDB };

declare global {
  var mongoose: {
    conn: unknown | null;
    promise: Promise<unknown> | null;
  } | undefined;
}
