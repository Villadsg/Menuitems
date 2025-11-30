<script lang="ts">
	import '../app.css'; // Import Tailwind CSS
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import { toasts } from '$lib/stores/toastStore';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { fly } from 'svelte/transition';
	import { initializeMenuLearning } from '$lib/initMenuLearning';
	import ApiConfig from '$lib/apiConfig';

	onMount(async () => {
		// Initialize API config
		await ApiConfig.initialize();

		// Check if on mobile and server not configured
		if (ApiConfig.isMobile()) {
			const serverUrl = await ApiConfig.getServerUrl();
			const currentPath = $page.url.pathname;

			// Redirect to settings page if server not configured and not already on settings page
			if (!serverUrl && currentPath !== '/settings') {
				goto('/settings');
				return;
			}
		}

		// Initialize menu learning system
		try {
			await initializeMenuLearning();
			console.log('Menu learning system initialized');
		} catch (error: any) {
			console.error('Error initializing menu learning system:', error?.message || String(error));
		}
	});

	let isMenuOpen = false;
	const toggleMenu = () => (isMenuOpen = !isMenuOpen);
	const closeMenu = () => (isMenuOpen = false);
</script>

<!-- Add Google Fonts -->
<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&family=Poppins:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<!-- Font Awesome -->
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
	/>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col">
	<header
		class="bg-white/95 backdrop-blur-sm border-b border-gray-100/50 fixed top-0 left-0 right-0 z-30"
	>
		<div class="container mx-auto px-6">
			<div class="flex justify-between items-center h-18">
				<a href="/" class="flex items-center space-x-3" aria-label="MenuMap Home">
					<img src="/log35.png" class="h-8 w-8" alt="MenuMap Logo" />
					<span class="text-xl font-light text-gray-900 tracking-tight">MenuMap</span>
				</a>

				<!-- Navigation Links -->
				<div class="hidden md:flex items-center space-x-1">
					<a
						href="/add-menuitems"
						class="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
						class:bg-gray-50={$page.url.pathname === '/add-menuitems'}
						class:text-gray-900={$page.url.pathname === '/add-menuitems'}
					>
						Add Menu
					</a>
					<a
						href="/find-menuitems"
						class="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
						class:bg-gray-50={$page.url.pathname === '/find-menuitems'}
						class:text-gray-900={$page.url.pathname === '/find-menuitems'}
					>
						Find Items
					</a>
					<a
						href="/settings"
						class="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200"
						class:bg-gray-50={$page.url.pathname === '/settings'}
						class:text-gray-900={$page.url.pathname === '/settings'}
					>
						Settings
					</a>
				</div>

				<!-- Mobile Menu Button -->
				<div class="md:hidden flex items-center">
					<button
						on:click={() => (isMenuOpen = !isMenuOpen)}
						class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none transition-colors duration-200"
						aria-label="Toggle menu"
					>
						{#if isMenuOpen}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if isMenuOpen}
			<div
				transition:slide={{ duration: 200 }}
				class="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full z-50"
			>
				<div class="px-4 py-3 space-y-1">
					<a
						href="/add-menuitems"
						class="block px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
						on:click={() => (isMenuOpen = false)}
					>
						Add Menu
					</a>
					<a
						href="/find-menuitems"
						class="block px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
						on:click={() => (isMenuOpen = false)}
					>
						Find Items
					</a>
					<a
						href="/settings"
						class="block px-4 py-3 rounded-xl text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
						on:click={() => (isMenuOpen = false)}
					>
						Settings
					</a>
				</div>
			</div>
		{/if}
	</header>

	<main class="flex-grow pt-18">
		<slot />
	</main>

	<footer class="bg-gray-900 text-white py-12">
		<div class="container mx-auto px-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-12">
				<div>
					<h3 class="text-lg font-light mb-6 tracking-tight">MenuMap</h3>
					<p class="text-gray-400 font-light leading-relaxed text-sm">
						Discover local menus in one place. Browse and compare menu content from restaurants
						around you.
					</p>
				</div>
				<div>
					<h3 class="text-lg font-light mb-6 tracking-tight">Quick Links</h3>
					<ul class="space-y-3">
						<li>
							<a
								href="/"
								class="text-gray-400 hover:text-white transition-colors text-sm font-light">Home</a
							>
						</li>
						<li>
							<a
								href="/add-menuitems"
								class="text-gray-400 hover:text-white transition-colors text-sm font-light"
								>Add Menu</a
							>
						</li>
						<li>
							<a
								href="/find-menuitems"
								class="text-gray-400 hover:text-white transition-colors text-sm font-light"
								>Find Items</a
							>
						</li>
					</ul>
				</div>
				<div>
					<h3 class="text-lg font-light mb-6 tracking-tight">Connect With Us</h3>
					<div class="flex space-x-4">
						<a
							href="#"
							class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
						>
							<i class="fab fa-twitter text-sm"></i>
						</a>
						<a
							href="#"
							class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
						>
							<i class="fab fa-facebook text-sm"></i>
						</a>
						<a
							href="#"
							class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
						>
							<i class="fab fa-instagram text-sm"></i>
						</a>
					</div>
				</div>
			</div>
			<div class="border-t border-gray-800 mt-12 pt-8 text-center">
				<p class="text-gray-500 text-sm font-light">
					&copy; {new Date().getFullYear()} MenuMap. All rights reserved.
				</p>
			</div>
		</div>
	</footer>
</div>

<ToastContainer />

<style>
	:global(body) {
		font-family: 'Inter', 'Poppins', sans-serif;
		color: #111827;
		font-weight: 400;
	}

	:global(h1, h2, h3, h4, h5, h6) {
		font-family: 'Inter', 'Poppins', sans-serif;
		font-weight: 300;
		letter-spacing: -0.025em;
	}
</style>
