<script lang="ts">
    import { account, databases } from '$lib/appwrite';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';

    $: userId = $user?.$id;

    let username = '';
    let langLearning = ''; 
    let langSpeaking = ''; 
    let usernamechange = ''; 

    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66fbb317002371bfdffc';

    const languageMap = {
        'English': 'EN',
        'Italian': 'IT',
        'Spanish': 'ES',
        'Japanese': 'JA',
        'Danish': 'DA'
    };
    const mostSpokenLanguages = Object.keys(languageMap);

    onMount(async () => {
        try {
            const userInfo = await account.get();
            username = userInfo.name || 'Guest';

            try {
                const userDocument = await databases.getDocument(
                    databaseId,
                    collectionId,
                    userId
                );
                if (userDocument) {
                    langLearning = Object.keys(languageMap).find(
                        key => languageMap[key] === userDocument.langLearn
                    ) || '';
                    langSpeaking = Object.keys(languageMap).find(
                        key => languageMap[key] === userDocument.langSpeak
                    ) || '';
                    usernamechange = userDocument.userNameChangable || username;
                }
            } catch (error) {
                console.log('No existing document, filling form with default values.');
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    });

    async function saveUserInfo() {
        if (!userId) {
            console.error('User ID is not available');
            return;
        }

        try {
            let userDocument;
            try {
                userDocument = await databases.getDocument(
                    databaseId,
                    collectionId,
                    userId
                );
            } catch (error) {
                console.log('Document not found, creating a new one.');
            }

            if (userDocument) {
                const response = await databases.updateDocument(
                    databaseId,
                    collectionId,
                    userId,
                    {
                        langLearn: languageMap[langLearning],
                        langSpeak: languageMap[langSpeaking],
                        userNameChangable: usernamechange
                    }
                );
                console.log('Languages and username updated successfully:', response);
                goto("/profile");
            } else {
                const response = await databases.createDocument(
                    databaseId,
                    collectionId,
                    userId,
                    {
                        langLearn: languageMap[langLearning],
                        langSpeak: languageMap[langSpeaking],
                        userNameChangable: usernamechange
                    }
                );
                console.log('New document created successfully:', response);
                goto("/profile");
            }
        } catch (error) {
            console.error('Failed to update or create document:', error);
        }
    }
</script>

<!-- HTML Template with Side-by-Side Layout -->
<div class="flex justify-center items-start min-h-screen p-8">
    <div class="flex flex-col md:flex-row bg-gray-100 shadow-lg rounded-lg overflow-hidden max-w-5xl w-full">
        
        <!-- Edit Profile Section -->
        <div class="p-6 md:w-2/3 bg-white border-r flex flex-col">
            <h2 class="text-2xl font-semibold mb-4">Edit Profile</h2>

            <!-- Username Field -->
            <div class="form-group mt-4">
                <label for="usernameChange" class="block text-gray-700 font-semibold">Change Your Username:</label>
                <input
                    id="usernameChange"
                    type="text"
                    bind:value={usernamechange} 
                    class="mt-2 p-2 border rounded w-full"
                    placeholder="Enter new username" />
            </div>

            <!-- Language for Learning -->
            <div class="form-group mt-4">
                <label for="langLearn" class="block text-gray-700 font-semibold">Select the language you are learning:</label>
                <select id="langLearn" bind:value={langLearning} class="mt-2 p-2 border rounded w-full">
                    <option value="" disabled>Select a language</option>
                    {#each mostSpokenLanguages as language}
                        <option value={language} selected={langLearning === language}>{language}</option>
                    {/each}
                </select>
            </div>

            <!-- Language for Speaking -->
            <div class="form-group mt-4">
                <label for="langSpeak" class="block text-gray-700 font-semibold">Select the language you are speaking:</label>
                <select id="langSpeak" bind:value={langSpeaking} class="mt-2 p-2 border rounded w-full">
                    <option value="" disabled>Select a language</option>
                    {#each mostSpokenLanguages as language}
                        <option value={language} selected={langSpeaking === language}>{language}</option>
                    {/each}
                </select>
            </div>

            <!-- Save Button -->
            <button 
                class="btn btn-primary mt-6 w-full" 
                on:click={saveUserInfo}>
                Save Changes
            </button>
        </div>

        <!-- Information Section -->
        <div class="p-6 md:w-1/3 bg-gray-50 flex flex-col justify-center">
            <h2 class="text-xl font-semibold mb-4">Profile Information</h2>
            <p class="mb-6 text-gray-600">
                Here you can update your profile details, including your preferred learning and speaking languages.
            </p>
            <p class="text-gray-600">
                Ensure to select the languages accurately, as they impact your learning preferences.
            </p>
        </div>
    </div>
</div>
