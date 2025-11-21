/**
 * Unified database interface
 * Automatically uses DatabaseClient for all operations (API-based)
 * This simplifies the architecture - all database operations go through the API
 */

import { DatabaseClient } from '$lib/databaseClient';

// Export as 'db' for convenience
export const db = DatabaseClient;

// Also export with the same name for compatibility
export const DatabaseService = DatabaseClient;

export default db;
