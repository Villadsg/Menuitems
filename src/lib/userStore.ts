import { writable } from 'svelte/store';
import { DatabaseService } from '$lib/database';

// Single-user mode: always return a local user
const LOCAL_USER = {
  id: 'local-user',
  email: 'local@user.com',
  $id: 'local-user' // For compatibility with old code
};

export const user = writable(LOCAL_USER);

// Function to check if a user is logged in
// In single-user mode, always return the local user
export const checkUser = async () => {
  user.set(LOCAL_USER);
  return LOCAL_USER;
};

// Function to log in a user
// In single-user mode, this is a no-op
export const loginUser = async (email: string, password: string) => {
  user.set(LOCAL_USER);
  return LOCAL_USER;
};

// Function to log out a user
// In single-user mode, this is a no-op but maintains the user
export const logoutUser = async () => {
  // Keep user logged in (single-user mode)
  user.set(LOCAL_USER);
};
