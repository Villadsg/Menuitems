import { goto } from '$app/navigation';

export const redirectToLogin = () => goto('/login');
export const redirectToSignup = () => goto('/signup');
