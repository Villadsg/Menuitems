import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DatabaseService } from '$lib/databaseService';

/**
 * Universal database API endpoint
 * Handles all database operations from the client
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { operation, params } = await request.json();

    switch (operation) {
      case 'createDocument':
        const created = await DatabaseService.createDocument(params.tableName, params.data);
        return json({ success: true, data: created });

      case 'getDocument':
        const doc = await DatabaseService.getDocument(params.tableName, params.documentId);
        return json({ success: true, data: doc });

      case 'getUserProfile':
        const profile = await DatabaseService.getUserProfile(params.userId);
        return json({ success: true, data: profile });

      case 'updateDocument':
        const updated = await DatabaseService.updateDocument(
          params.tableName,
          params.documentId,
          params.data
        );
        return json({ success: true, data: updated });

      case 'updateUserProfile':
        const updatedProfile = await DatabaseService.updateUserProfile(params.userId, params.data);
        return json({ success: true, data: updatedProfile });

      case 'upsertUserProfile':
        const upserted = await DatabaseService.upsertUserProfile(params.userId, params.data);
        return json({ success: true, data: upserted });

      case 'deleteDocument':
        const deleted = await DatabaseService.deleteDocument(params.tableName, params.documentId);
        return json({ success: true, data: deleted });

      case 'query':
        // For complex queries using the query builder
        const queryBuilder = DatabaseService.from(params.tableName);

        // Apply query methods
        if (params.select) {
          queryBuilder.select(params.select);
        }

        if (params.where) {
          for (const condition of params.where) {
            switch (condition.method) {
              case 'eq':
                queryBuilder.eq(condition.column, condition.value);
                break;
              case 'not':
                queryBuilder.not(condition.column, condition.operator, condition.value);
                break;
              case 'or':
                queryBuilder.or(condition.condition);
                break;
              case 'isNull':
                queryBuilder.isNull(condition.column);
                break;
              case 'isNotNull':
                queryBuilder.isNotNull(condition.column);
                break;
            }
          }
        }

        if (params.count) {
          queryBuilder.count(params.count);
        }

        const results = params.single ? await queryBuilder.single() : await queryBuilder.execute();

        return json({ success: true, data: results });

      default:
        return json({ success: false, error: 'Unknown operation' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Database operation error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
