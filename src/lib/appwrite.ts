
import { Client, Account, Databases, Storage, ID, Permission, Role, Functions, Query } from 'appwrite';
// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint('https://cloud.appwrite.io/v1') // Your Appwrite Cloud endpoint
  .setProject('6609304dced645ab3eaf'); // Replace with your Appwrite Project ID

// Export account instance for authentication
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);
export {account, databases, storage, ID, Permission, Role, functions, Query };