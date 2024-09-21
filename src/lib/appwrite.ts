
import { Client, Account, Databases } from 'appwrite';

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint('https://cloud.appwrite.io/v1') // Your Appwrite Cloud endpoint
  .setProject('6609304dced645ab3eaf'); // Replace with your Appwrite Project ID

// Export account instance for authentication
export const account = new Account(client);
export const databases = new Databases(client);
