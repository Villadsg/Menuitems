// src/lib/auth.ts
import { supabase } from './supabase';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

// Store to hold the current user
export const user = writable(null);

// Function to check if a user is logged in
export const checkUser = async () => {
  try {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.set(null); // Set user to null after logging out
    goto('/logout');
  } catch (error) {
    console.error('Logout failed:', error.message);
    alert('Logout failed: ' + error.message);
  }
};
