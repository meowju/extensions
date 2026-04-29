/**
 * Database Migration: Create Users Collection
 * 
 * This migration creates the users collection with proper indexes
 * for optimal query performance.
 * 
 * Run with: npx ts-node src/database/migrations/001_create_users_collection.ts
 */

import mongoose from 'mongoose';

const MIGRATION_NAME = '001_create_users_collection';
const COLLECTION_NAME = 'users';

// Migration lock to prevent concurrent runs
const MIGRATION_LOCK_KEY = `migration_lock:${MIGRATION_NAME}`;

interface MigrationLock {
  locked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
}

async function acquireLock(): Promise<boolean> {
  const lockCollection = mongoose.connection.collection('migrations_locks');
  
  const existingLock = await lockCollection.findOne<MigrationLock>({
    _id: MIGRATION_LOCK_KEY,
  });

  if (existingLock?.locked) {
    console.log(`[${MIGRATION_NAME}] Migration already locked by ${existingLock.lockedBy}`);
    return false;
  }

  await lockCollection.updateOne(
    { _id: MIGRATION_LOCK_KEY },
    {
      $set: {
        locked: true,
        lockedAt: new Date(),
        lockedBy: process.pid.toString(),
      },
    },
    { upsert: true }
  );

  return true;
}

async function releaseLock(): Promise<void> {
  const lockCollection = mongoose.connection.collection('migrations_locks');
  await lockCollection.deleteOne({ _id: MIGRATION_LOCK_KEY });
}

async function migrationUp(): Promise<void> {
  const db = mongoose.connection.db!;
  
  console.log(`[${MIGRATION_NAME}] Starting migration...`);

  // Check if collection already exists
  const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
  
  if (collections.length > 0) {
    console.log(`[${MIGRATION_NAME}] Collection '${COLLECTION_NAME}' already exists`);
    
    // Still create indexes if they don't exist
    await createIndexes(db);
    
    console.log(`[${MIGRATION_NAME}] Migration complete (indexes updated)`);
    return;
  }

  // Create collection with validator
  await db.createCollection(COLLECTION_NAME, {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'password', 'isEmailVerified', 'isActive', 'loginAttempts', 'createdAt', 'updatedAt'],
        properties: {
          email: {
            bsonType: 'string',
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
            description: 'Must be a valid email address',
          },
          password: {
            bsonType: 'string',
            minLength: 8,
            description: 'Must be at least 8 characters (hashed)',
          },
          username: {
            bsonType: ['string', 'null'],
            minLength: 3,
            maxLength: 30,
            pattern: '^[a-zA-Z0-9_-]+$',
          },
          firstName: {
            bsonType: ['string', 'null'],
            maxLength: 50,
          },
          lastName: {
            bsonType: ['string', 'null'],
            maxLength: 50,
          },
          isEmailVerified: {
            bsonType: 'bool',
          },
          isActive: {
            bsonType: 'bool',
          },
          verificationToken: {
            bsonType: ['string', 'null'],
          },
          verificationTokenExpires: {
            bsonType: ['date', 'null'],
          },
          passwordResetToken: {
            bsonType: ['string', 'null'],
          },
          passwordResetTokenExpires: {
            bsonType: ['date', 'null'],
          },
          lastLoginAt: {
            bsonType: ['date', 'null'],
          },
          loginAttempts: {
            bsonType: 'int',
            minimum: 0,
          },
          lockUntil: {
            bsonType: ['date', 'null'],
          },
        },
        additionalProperties: true,
      },
    },
    validationLevel: 'moderate',
    validationAction: 'warn',
  });

  console.log(`[${MIGRATION_NAME}] Collection '${COLLECTION_NAME}' created`);

  // Create indexes
  await createIndexes(db);

  console.log(`[${MIGRATION_NAME}] Migration complete`);
}

async function createIndexes(db: mongoose.mongo.Db): Promise<void> {
  const collection = db.collection(COLLECTION_NAME);

  // Unique index on email
  await collection.createIndex(
    { email: 1 },
    { unique: true, background: true, name: 'idx_email_unique' }
  );

  // Unique index on username (sparse for null values)
  await collection.createIndex(
    { username: 1 },
    { unique: true, sparse: true, background: true, name: 'idx_username_unique' }
  );

  // Index for verification token lookups
  await collection.createIndex(
    { verificationToken: 1 },
    { background: true, name: 'idx_verification_token' }
  );

  // Index for password reset token lookups
  await collection.createIndex(
    { passwordResetToken: 1 },
    { background: true, name: 'idx_password_reset_token' }
  );

  // Index for sorting by creation date
  await collection.createIndex(
    { createdAt: -1 },
    { background: true, name: 'idx_created_at_desc' }
  );

  // Compound index for active users with unverified email
  await collection.createIndex(
    { isActive: 1, isEmailVerified: 1, createdAt: -1 },
    { background: true, name: 'idx_active_unverified' }
  );

  console.log(`[${MIGRATION_NAME}] Indexes created successfully`);
}

async function migrationDown(): Promise<void> {
  const db = mongoose.connection.db!;
  
  console.log(`[${MIGRATION_NAME}] Rolling back migration...`);

  const collections = await db.listCollections({ name: COLLECTION_NAME }).toArray();
  
  if (collections.length === 0) {
    console.log(`[${MIGRATION_NAME}] Collection '${COLLECTION_NAME}' does not exist`);
    return;
  }

  await db.dropCollection(COLLECTION_NAME);
  console.log(`[${MIGRATION_NAME}] Collection '${COLLECTION_NAME}' dropped`);
}

// Run migration
async function run(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/user-auth-service';
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Connect to database
    await mongoose.connect(mongoUri, options);
    console.log('Connected to MongoDB');

    // Acquire lock
    const hasLock = await acquireLock();
    if (!hasLock) {
      process.exit(1);
    }

    // Parse command line arguments
    const action = process.argv[2] || 'up';

    if (action === 'down') {
      await migrationDown();
    } else {
      await migrationUp();
    }

  } catch (error) {
    console.error(`[${MIGRATION_NAME}] Migration failed:`, error);
    process.exit(1);
  } finally {
    await releaseLock();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  run();
}

export { migrationUp, migrationDown, MIGRATION_NAME };
