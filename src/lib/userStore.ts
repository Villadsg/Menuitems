import { writable } from 'svelte/store';
import { account } from '$lib/appwrite';

export const user = writable(null);

// Function to check if a user is logged in
export const checkUser = async () => {
  try {
    const loggedInUser = await account.get();
    user.set(loggedInUser);  // Update the store
  } catch (error) {
    user.set(null); // If not logged in, set to null
  }
};

// Function to log in a user
export const loginUser = async (email: string, password: string) => {
  try {
    await account.createEmailPasswordSession(email, password);
    await checkUser();  // Refresh the user store
  } catch (error) {
    throw new Error('Login failed: ' + error.message);
  }
};

// Function to log out a user
export const logoutUser = async () => {
  try {
    await account.deleteSession('current');
    user.set(null); // Clear the store when logged out
  } catch (error) {
    throw new Error('Logout failed: ' + error.message);
  }
};
