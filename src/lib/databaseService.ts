import { query, exec } from '$lib/duckdb';
import { v4 as uuidv4 } from 'uuid';

/**
 * DatabaseService - Replaces SupabaseService with local DuckDB operations
 * Maintains the same interface for easy migration
 */
export const DatabaseService = {

  // Create a document in a specific table
  async createDocument(tableName: string, data: any) {
    const id = data.id || uuidv4();
    const columns = ['id', ...Object.keys(data).filter(k => k !== 'id')];
    const values = [id, ...Object.keys(data).filter(k => k !== 'id').map(k => data[k])];
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    await exec(sql, values);

    // Return the inserted document
    return this.getDocument(tableName, id);
  },

  // Get a document by table and document ID
  async getDocument(tableName: string, documentId: string) {
    const sql = `SELECT * FROM ${tableName} WHERE id = ?`;
    const results = await query(sql, [documentId]);

    if (results.length === 0) {
      throw new Error(`Document not found: ${documentId}`);
    }

    return results[0];
  },

  // Get a user profile by user_id
  async getUserProfile(userId: string) {
    const sql = `SELECT * FROM user_profiles WHERE user_id = ?`;
    const results = await query(sql, [userId]);

    if (results.length === 0) {
      return null; // Match Supabase behavior
    }

    return results[0];
  },

  // Update a document in a specific table
  async updateDocument(tableName: string, documentId: string, data: any) {
    const updates = Object.keys(data)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`)
      .join(', ');
    const values = Object.keys(data).filter(k => k !== 'id').map(k => data[k]);

    const sql = `UPDATE ${tableName} SET ${updates} WHERE id = ?`;

    await exec(sql, [...values, documentId]);

    // Return the updated document
    return this.getDocument(tableName, documentId);
  },

  // Update a user profile by user_id
  async updateUserProfile(userId: string, data: any) {
    const updates = Object.keys(data)
      .filter(k => k !== 'user_id')
      .map(k => `${k} = ?`)
      .join(', ');
    const values = Object.keys(data).filter(k => k !== 'user_id').map(k => data[k]);

    const sql = `UPDATE user_profiles SET ${updates} WHERE user_id = ?`;

    await exec(sql, [...values, userId]);

    // Return the updated profile
    return this.getUserProfile(userId);
  },

  // Upsert (insert or update) a user profile
  async upsertUserProfile(userId: string, data: any) {
    const existing = await this.getUserProfile(userId);

    if (existing) {
      return this.updateUserProfile(userId, data);
    } else {
      const profileData = { ...data, user_id: userId };
      const columns = Object.keys(profileData);
      const values = Object.values(profileData);
      const placeholders = columns.map(() => '?').join(', ');

      const sql = `INSERT INTO user_profiles (${columns.join(', ')}) VALUES (${placeholders})`;

      await exec(sql, values);

      return this.getUserProfile(userId);
    }
  },

  // Delete a document by table and document ID
  async deleteDocument(tableName: string, documentId: string) {
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;

    await exec(sql, [documentId]);

    return { success: true };
  },

  // Query builder helper for complex queries
  queryBuilder(tableName: string) {
    let whereClauses: string[] = [];
    let params: any[] = [];
    let selectColumns = '*';
    let countOnly = false;

    return {
      select(columns: string = '*') {
        selectColumns = columns;
        return this;
      },

      eq(column: string, value: any) {
        whereClauses.push(`${column} = ?`);
        params.push(value);
        return this;
      },

      not(column: string, operator: string, value: any) {
        if (operator === 'is' && value === null) {
          whereClauses.push(`${column} IS NOT NULL`);
        } else {
          whereClauses.push(`NOT (${column} = ?)`);
          params.push(value);
        }
        return this;
      },

      or(condition: string) {
        // Parse condition like 'lat.is.null,lng.is.null'
        const conditions = condition.split(',').map(c => {
          const parts = c.split('.');
          if (parts[1] === 'is' && parts[2] === 'null') {
            return `${parts[0]} IS NULL`;
          }
          return c;
        });
        whereClauses.push(`(${conditions.join(' OR ')})`);
        return this;
      },

      isNull(column: string) {
        whereClauses.push(`${column} IS NULL`);
        return this;
      },

      isNotNull(column: string) {
        whereClauses.push(`${column} IS NOT NULL`);
        return this;
      },

      count(options?: { exact?: boolean; head?: boolean }) {
        if (options?.head) {
          countOnly = true;
          selectColumns = 'COUNT(*) as count';
        }
        return this;
      },

      async execute() {
        let sql = `SELECT ${selectColumns} FROM ${tableName}`;

        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        const results = await query(sql, params);

        if (countOnly && results.length > 0) {
          return { count: results[0].count };
        }

        return results;
      },

      async single() {
        const results = await this.execute();
        if (Array.isArray(results) && results.length === 0) {
          throw new Error('No results found');
        }
        return Array.isArray(results) ? results[0] : results;
      }
    };
  },

  // Compatibility method for Supabase-style queries
  from(tableName: string) {
    return this.queryBuilder(tableName);
  },

  // Auth-related methods (simplified for single-user mode)
  async getAccount() {
    // In single-user mode, return a default user
    return {
      id: 'local-user',
      email: 'local@user.com'
    };
  },

  async logout() {
    // No-op in single-user mode
    return { success: true };
  },

  async signUp(email: string, password: string) {
    // No-op in single-user mode
    return {
      user: { id: 'local-user', email },
      session: null
    };
  },

  async signIn(email: string, password: string) {
    // No-op in single-user mode
    return {
      user: { id: 'local-user', email },
      session: null
    };
  }
};
