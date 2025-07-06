import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

export const user = writable(null);

// Function to check if a user is logged in
export const checkUser = async () => {
  try {
    const { data: { user: loggedInUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    user.set(loggedInUser);  // Update the store
    return loggedInUser;
  } catch (error) {
    user.set(null); // If not logged in, set to null
    return null;
  }
};

// Set up auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    user.set(session.user);
  } else {
    user.set(null);
  }
});

// Function to log in a user
export const loginUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    await checkUser();  // Refresh the user store
  } catch (error) {
    throw new Error('Login failed: ' + error.message);
  }
};

// Function to log out a user
export const logoutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.set(null); // Clear the store when logged out
  } catch (error) {
    throw new Error('Logout failed: ' + error.message);
  }
};
