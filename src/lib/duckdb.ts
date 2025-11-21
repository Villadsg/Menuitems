import Database from 'duckdb';
import { promises as fs } from 'fs';
import path from 'path';

// Database file path
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'langtours.duckdb');

let dbInstance: Database.Database | null = null;
let connectionInstance: Database.Connection | null = null;

/**
 * Initialize DuckDB connection
 */
export async function initializeDatabase(): Promise<Database.Connection> {
  if (connectionInstance) {
    return connectionInstance;
  }

  // Ensure data directory exists
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }

  return new Promise((resolve, reject) => {
    dbInstance = new Database.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      connectionInstance = dbInstance!.connect();

      // Initialize schema
      initializeSchema(connectionInstance)
        .then(() => resolve(connectionInstance!))
        .catch(reject);
    });
  });
}

/**
 * Get existing database connection or create new one
 */
export async function getConnection(): Promise<Database.Connection> {
  if (!connectionInstance) {
    return await initializeDatabase();
  }
  return connectionInstance;
}

/**
 * Initialize database schema
 */
async function initializeSchema(conn: Database.Connection): Promise<void> {
  const schema = `
    -- Restaurants table (main menu documents)
    CREATE TABLE IF NOT EXISTS restaurants (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR,
      route_name VARCHAR,
      lat DOUBLE,
      lng DOUBLE,
      date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      photo_file_id VARCHAR,
      ocrdata TEXT,
      ocr_raw_text TEXT,
      ocr_processed BOOLEAN DEFAULT FALSE,
      ocr_enhanced_structure TEXT,
      location_data TEXT,
      location_search_status VARCHAR,
      location_updated_at TIMESTAMP
    );

    -- User profiles table
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id VARCHAR PRIMARY KEY,
      usernamechangable VARCHAR,
      locationsDone TEXT
    );

    -- Menu items table
    CREATE TABLE IF NOT EXISTS menu_items (
      id VARCHAR PRIMARY KEY,
      menu_id VARCHAR,
      name VARCHAR,
      description TEXT,
      price VARCHAR,
      category VARCHAR,
      FOREIGN KEY (menu_id) REFERENCES restaurants(id)
    );

    -- Menu OCR feedback table (for ML training)
    CREATE TABLE IF NOT EXISTS menu_ocr_feedback (
      id VARCHAR PRIMARY KEY,
      original_items TEXT,
      corrected_items TEXT,
      raw_text TEXT,
      restaurant_name VARCHAR,
      image_id VARCHAR,
      user_id VARCHAR,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      menu_structure TEXT
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);
    CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_image_id ON menu_ocr_feedback(image_id);
  `;

  return new Promise((resolve, reject) => {
    conn.exec(schema, (err) => {
      if (err) {
        console.error('Failed to initialize schema:', err);
        reject(err);
      } else {
        console.log('Database schema initialized successfully');
        resolve();
      }
    });
  });
}

/**
 * Run a SQL query
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.all(sql, ...params, (err: Error | null, rows: T[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Run a SQL query that doesn't return results
 */
export async function exec(sql: string, params: any[] = []): Promise<void> {
  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.run(sql, ...params, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connectionInstance) {
      connectionInstance.close((err) => {
        if (err) {
          reject(err);
        } else {
          connectionInstance = null;
          if (dbInstance) {
            dbInstance.close(() => {
              dbInstance = null;
              resolve();
            });
          } else {
            resolve();
          }
        }
      });
    } else {
      resolve();
    }
  });
}
