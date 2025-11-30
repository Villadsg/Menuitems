/**
 * Client-side DatabaseService
 * Makes API calls to the server-side database API
 * Maintains the same interface as SupabaseService for easy migration
 */
import ApiConfig from './apiConfig';

export const DatabaseClient = {

  // Create a document in a specific table
  async createDocument(tableName: string, data: any) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'createDocument',
        params: { tableName, data }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Get a document by table and document ID
  async getDocument(tableName: string, documentId: string) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'getDocument',
        params: { tableName, documentId }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Get a user profile by user_id
  async getUserProfile(userId: string) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'getUserProfile',
        params: { userId }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Update a document in a specific table
  async updateDocument(tableName: string, documentId: string, data: any) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'updateDocument',
        params: { tableName, documentId, data }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Update a user profile by user_id
  async updateUserProfile(userId: string, data: any) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'updateUserProfile',
        params: { userId, data }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Upsert (insert or update) a user profile
  async upsertUserProfile(userId: string, data: any) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'upsertUserProfile',
        params: { userId, data }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Delete a document by table and document ID
  async deleteDocument(tableName: string, documentId: string) {
    const apiUrl = await ApiConfig.getApiUrl('/api/db');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'deleteDocument',
        params: { tableName, documentId }
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Upload a file to storage
  async uploadFile(file: File, bucket: string = 'photos') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    const apiUrl = await ApiConfig.getApiUrl('/api/files');
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Delete a file by its file path
  async deleteFile(filePath: string, bucket: string = 'photos') {
    const apiUrl = await ApiConfig.getApiUrl('/api/files');
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, bucket })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  // Query builder helper for complex queries
  queryBuilder(tableName: string) {
    const params: any = {
      tableName,
      where: []
    };

    return {
      select(columns: string = '*') {
        params.select = columns;
        return this;
      },

      eq(column: string, value: any) {
        params.where.push({ method: 'eq', column, value });
        return this;
      },

      not(column: string, operator: string, value: any) {
        params.where.push({ method: 'not', column, operator, value });
        return this;
      },

      or(condition: string) {
        params.where.push({ method: 'or', condition });
        return this;
      },

      isNull(column: string) {
        params.where.push({ method: 'isNull', column });
        return this;
      },

      isNotNull(column: string) {
        params.where.push({ method: 'isNotNull', column });
        return this;
      },

      count(options?: { exact?: boolean; head?: boolean }) {
        params.count = options;
        return this;
      },

      async execute() {
        const apiUrl = await ApiConfig.getApiUrl('/api/db');
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'query',
            params
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data;
      },

      async single() {
        params.single = true;
        return await this.execute();
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
