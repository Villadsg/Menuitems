import { account, databases, storage } from '$lib/appwrite';
import { ID, Permission, Role } from 'appwrite';

const databaseId = '6609473fbde756e5dc45'; 
const bucketId = '66efdb420000df196b64';

export const AppwriteService = {
  // Create a document in a specific collection
  async createDocument(collectionId, data) {
    return await databases.createDocument(databaseId, collectionId, ID.unique(), data);
  },

  // Get a document by collection and document ID
  async getDocument(collectionId, documentId) {
    return await databases.getDocument(databaseId, collectionId, documentId);
  },

  // Update a document in a specific collection
  async updateDocument(collectionId, documentId, data) {
    return await databases.updateDocument(databaseId, collectionId, documentId, data);
  },

  // Delete a document by collection and document ID
  async deleteDocument(collectionId, documentId) {
    return await databases.deleteDocument(databaseId, collectionId, documentId);
  },

  // Upload a file to a bucket
  async uploadFile(file) {
    return await storage.createFile(bucketId, ID.unique(), file, [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]);
  },

  // Delete a file by its file ID
  async deleteFile(fileId) {
    return await storage.deleteFile(bucketId, fileId);
  },

  // Get the current logged-in user's account
  async getAccount() {
    return await account.get();
  },

  // Log out the current user
  async logout() {
    return await account.deleteSession('current');
  }
};
