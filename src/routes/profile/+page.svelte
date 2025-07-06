<script lang="ts">
    import { SupabaseService } from '$lib/supabaseService';
    import { supabase } from '$lib/supabase';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';
    import { fly, fade } from 'svelte/transition';
    import Card from '$lib/components/Card.svelte';
    import Loading from '$lib/components/Loading.svelte';

    let userId = '';
    let username = '';
    let usernamechange = '';
    let uploadedMenus = [];
    let completedRoutes = [];
    let loading = true;
    let activeTab = 'uploaded';

    // Table names for Supabase
    const profileTableName = 'user_profiles';
    const menuTableName = 'restaurants';

    onMount(async () => {
        try {
            loading = true;
            
            // Check if user is authenticated
            const userInfo = await SupabaseService.getAccount();
            if (!userInfo) {
                // User is not logged in, redirect to login page
                goto('/login');
                return;
            }
            
            userId = userInfo.id;
            username = userInfo.email || 'Guest';

            // Fetch user document
            if (userId) {
                try {
                    const userDocument = await SupabaseService.getUserProfile(userId);
                    if (userDocument) {
                        usernamechange = userDocument.usernamechangable || username;
                        
                        // Get completed routes
                        if (userDocument.locationsDone && userDocument.locationsDone.length > 0) {
                            completedRoutes = userDocument.locationsDone
                                .map(item => JSON.parse(item))
                                .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
                        }
                    }
                } catch (error) {
                    console.log('No existing profile document found.');
                }
                
                // Fetch uploaded menus using Supabase
                try {
                    const { data: restaurants, error } = await supabase
                        .from(menuTableName)
                        .select('*')
                        .eq('user_id', userId);
                    
                    if (error) {
                        console.error('Error fetching menus:', error);
                    } else {
                        uploadedMenus = restaurants || [];
                    }
                } catch (error) {
                    console.error('Error loading uploaded menus:', error);
                }
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        } finally {
            loading = false;
        }
    });

    function navigateToEditProfile() {
        goto('/edit-profile');
    }
    
    function navigateToEditTours() {
        goto('/edit-tours');
    }
    
    function navigateToCreateQuiz() {
        goto('/create-quiz');
    }
    
    function navigateToMenu(menuId) {
        goto(`/menu/${menuId}`);
    }
    
    function getFilePreviewUrl(filePath) {
        if (!filePath) return '/placeholder-menu.jpg';
        const { data } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath);
        return data.publicUrl;
    }
    
    function setActiveTab(tab) {
        activeTab = tab;
    }
</script>

<div class="container mx-auto px-4 py-8 pt-20">
    <div in:fly={{ y: 20, duration: 300 }}>
        <Card padding="p-6">
            <div class="flex flex-col md:flex-row items-start gap-6">
                <!-- Profile sidebar -->
                <div class="w-full md:w-1/4 bg-gray-50 rounded-lg p-6 shadow-sm">
                    <div class="flex flex-col items-center text-center mb-6">
                        <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-user text-blue-500 text-3xl"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800">Hello, {usernamechange}!</h2>
                        <p class="text-gray-500 mt-1">Member since {new Date().getFullYear()}</p>
                    </div>
                    
                    <div class="space-y-3">
                        <button 
                            class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            on:click={navigateToCreateQuiz}>
                            <i class="fas fa-plus mr-2"></i> Upload New Menu
                        </button>
                        
                        <button 
                            class="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                            on:click={navigateToEditProfile}>
                            <i class="fas fa-user-edit mr-2"></i> Edit Profile
                        </button>
                        
                        <button 
                            class="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                            on:click={navigateToEditTours}>
                            <i class="fas fa-edit mr-2"></i> Edit My Menus
                        </button>
                    </div>
                </div>
                
                <!-- Main content area -->
                <div class="w-full md:w-3/4">
                    {#if loading}
                        <div class="flex justify-center items-center h-64">
                            <Loading />
                        </div>
                    {:else}
                        <!-- Tab navigation -->
                        <div class="border-b border-gray-200 mb-6">
                            <nav class="flex space-x-8">
                                <button 
                                    class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'uploaded' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                                    on:click={() => setActiveTab('uploaded')}>
                                    Uploaded Menus
                                </button>
                                <button 
                                    class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                                    on:click={() => setActiveTab('completed')}>
                                    Things You Tried
                                </button>
                            </nav>
                        </div>
                        
                        <!-- Uploaded Menus Tab -->
                        {#if activeTab === 'uploaded'}
                            <div in:fade={{ duration: 200 }}>
                                <h3 class="text-xl font-semibold text-gray-800 mb-4">Your Uploaded Menus</h3>
                                
                                {#if uploadedMenus.length > 0}
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {#each uploadedMenus as menu}
                                            <div class="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
                                                <div class="h-48 overflow-hidden">
                                                    <img 
                                                        src={getFilePreviewUrl(menu.photo_file_id)} 
                                                        alt={menu.route_name} 
                                                        class="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div class="p-4">
                                                    <h4 class="text-lg font-semibold">{menu.route_name}</h4>
                                                    <p class="text-gray-600 text-sm mt-1 line-clamp-2">
                                                        {typeof menu.Description === 'string' && menu.Description.startsWith('{') 
                                                            ? JSON.parse(menu.Description)?.EN || 'No description available'
                                                            : menu.Description || 'No description available'}
                                                    </p>
                                                    <p class="text-gray-500 text-xs mt-2">
                                                        Uploaded: {new Date(menu.date_modified).toLocaleDateString()}
                                                    </p>
                                                    <div class="mt-4 flex justify-end">
                                                        <button 
                                                            class="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                                                            on:click={() => navigateToMenu(menu.id)}>
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <div class="bg-gray-50 rounded-lg p-8 text-center">
                                        <div class="text-gray-400 mb-4">
                                            <i class="fas fa-utensils text-5xl"></i>
                                        </div>
                                        <h4 class="text-lg font-medium text-gray-800 mb-2">No Menus Uploaded Yet</h4>
                                        <p class="text-gray-600 mb-4">Share your restaurant menu with the world!</p>
                                        <button 
                                            class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            on:click={navigateToCreateQuiz}>
                                            Upload Your First Menu
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                        
                        <!-- Completed Routes Tab -->
                        {#if activeTab === 'completed'}
                            <div in:fade={{ duration: 200 }}>
                                <h3 class="text-xl font-semibold text-gray-800 mb-4">Things You Tried</h3>
                                
                                {#if completedRoutes.length > 0}
                                    <div class="space-y-4">
                                        {#each completedRoutes as route}
                                            <div class="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <h4 class="text-lg font-semibold">{route.route_name}</h4>
                                                        <p class="text-gray-500 text-sm mt-1">
                                                            Visited on {new Date(route.Date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        class="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                                                        on:click={() => goto(`/play?id=${route.id}`)}>
                                                        View Again
                                                    </button>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <div class="bg-gray-50 rounded-lg p-8 text-center">
                                        <div class="text-gray-400 mb-4">
                                            <i class="fas fa-route text-5xl"></i>
                                        </div>
                                        <h4 class="text-lg font-medium text-gray-800 mb-2">No Routes Completed Yet</h4>
                                        <p class="text-gray-600 mb-4">Explore nearby restaurants to start your journey!</p>
                                        <button 
                                            class="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                            on:click={() => goto('/')}>
                                            Explore Nearby
                                        </button>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
        </Card>
    </div>
</div>

<style>
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
