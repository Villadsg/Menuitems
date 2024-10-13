// src/lib/auth.ts
import { account } from './appwrite';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

// Store to hold the current user
export const user = writable(null);

// Function to check if a user is logged in
export const checkUser = async () => {
  try {
    const currentUser = await account.get();
    user.set(currentUser);
    return currentUser; // Return user object if logged in
  } catch (error) {
    user.set(null); // Set user to null if not logged in
    return null; // Return null if no user is logged in
  }
};

// Function to log the user out
export const logout = async () => {
  try {
    await account.deleteSession('current');
    user.set(null); // Set user to null after logging out
    goto('/logout');
  } catch (error) {
    console.error('Logout failed:', error.message);
    alert('Logout failed: ' + error.message);
  }
};
