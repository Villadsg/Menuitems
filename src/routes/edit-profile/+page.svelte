<script lang="ts">
    import { SupabaseService } from '$lib/supabaseService';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';
    import { fly, fade } from 'svelte/transition';
    import Card from '$lib/components/Card.svelte';

    $: userId = $user?.id;

    let username = '';
    let preferredLanguage = ''; 
    let usernamechange = ''; 
    let loading = false;
    let successMessage = '';

    const tableName = 'user_profiles';

    const languageMap = {
        'English': 'EN',
        'Italian': 'IT',
        'Spanish': 'ES',
        'Japanese': 'JA',
        'Danish': 'DA'
    };
    const availableLanguages = Object.keys(languageMap);

    onMount(async () => {
        try {
            loading = true;
            const userInfo = await SupabaseService.getAccount();
            username = userInfo.email || 'Guest';

            try {
                const userDocument = await SupabaseService.getUserProfile(userId);
                if (userDocument) {
                    // Use langSpeak as the preferred language
                    preferredLanguage = Object.keys(languageMap).find(
                        key => languageMap[key] === userDocument.langspeak
                    ) || 'English'; // Default to English if not found
                    usernamechange = userDocument.usernamechangable || username;
                }
            } catch (error) {
                console.log('No existing document, filling form with default values.');
                preferredLanguage = 'English'; // Default to English
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        } finally {
            loading = false;
        }
    });

    async function saveUserInfo() {
        if (!userId) {
            console.error('User ID is not available');
            return;
        }

        try {
            loading = true;
            
            const profileData = {
                email: username, // Use the current username/email
                langspeak: languageMap[preferredLanguage],
                usernamechangable: usernamechange
            };

            // Use upsert to insert or update the profile
            const response = await SupabaseService.upsertUserProfile(userId, profileData);
            console.log('Profile saved successfully:', response);
            successMessage = 'Profile saved successfully!';
            setTimeout(() => {
                goto("/profile");
            }, 1500);
        } catch (error) {
            console.error('Failed to update or create profile:', error);
        } finally {
            loading = false;
        }
    }
</script>

<div class="container mx-auto px-4 py-8 pt-20">
    <div in:fly={{ y: 20, duration: 300 }}>
        <Card padding="p-6">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-800">Edit Profile</h1>
                <button 
                    class="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    on:click={() => goto('/profile')}
                >
                    <i class="fas fa-arrow-left mr-2"></i> Back to Profile
                </button>
            </div>

            {#if loading}
                <div class="flex justify-center items-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            {:else}
                <div class="bg-white rounded-lg shadow-md p-6">
                    {#if successMessage}
                        <div in:fade={{ duration: 200 }} class="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
                            <p>{successMessage}</p>
                        </div>
                    {/if}

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Profile Form -->
                        <div class="space-y-6">
                            <!-- Username Field -->
                            <div>
                                <label for="usernameChange" class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                <input
                                    id="usernameChange"
                                    type="text"
                                    bind:value={usernamechange} 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter your display name" />
                            </div>

                            <!-- Preferred Language -->
                            <div>
                                <label for="preferredLanguage" class="block text-sm font-medium text-gray-700 mb-1">
                                    Preferred Menu Language
                                </label>
                                <select 
                                    id="preferredLanguage" 
                                    bind:value={preferredLanguage} 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="" disabled>Select a language</option>
                                    {#each availableLanguages as language}
                                        <option value={language}>{language}</option>
                                    {/each}
                                </select>
                                <p class="mt-1 text-sm text-gray-500">
                                    This language will be used to display menu items when available.
                                </p>
                            </div>

                            <!-- Save Button -->
                            <button 
                                class="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                on:click={saveUserInfo}
                                disabled={loading}
                            >
                                {#if loading}
                                    <span class="inline-block animate-spin mr-2">⟳</span> Saving...
                                {:else}
                                    Save Changes
                                {/if}
                            </button>
                        </div>

                        <!-- Information Section -->
                        <div class="bg-gray-50 p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Profile Settings</h3>
                            
                            <div class="mb-6">
                                <div class="flex items-center mb-2">
                                    <i class="fas fa-user text-blue-500 mr-3 text-xl"></i>
                                    <h4 class="font-medium">Display Name</h4>
                                </div>
                                <p class="text-gray-600 text-sm ml-8">
                                    Your display name will be shown to other users when you share menus.
                                </p>
                            </div>
                            
                            <div>
                                <div class="flex items-center mb-2">
                                    <i class="fas fa-language text-blue-500 mr-3 text-xl"></i>
                                    <h4 class="font-medium">Preferred Language</h4>
                                </div>
                                <p class="text-gray-600 text-sm ml-8">
                                    Select your preferred language for viewing restaurant menus. 
                                    When available, menu items will be displayed in this language.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </Card>
    </div>
</div>
