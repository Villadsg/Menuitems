
import { account } from '$lib/appwrite';
import { redirect } from '@sveltejs/kit';

export const load = async () => {
  try {
    await account.get(); // Check if the user is logged in
  } catch {
    throw redirect(302, '/'); // Redirect to the front page (login) if not authenticated
  }
};
