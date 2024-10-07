<script lang="ts">
    import { account, databases } from '$lib/appwrite';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { user } from '$lib/userStore';

    // Make userId reactive
    $: userId = $user?.$id;

    let username = '';
    let langLearning = ''; // To store selected language for learning
    let langSpeaking = ''; // To store selected language for speaking
    let usernamechange = ''; // This will now be changeable via the UI

    // Profile info database collection
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66fbb317002371bfdffc';

    // Mapping between language full names and abbreviations
    const languageMap = {
        'English': 'EN',
        'Italian': 'IT',
        'Spanish': 'ES',
        'Japanese': 'JA',
        'Danish': 'DA'
    };

    const mostSpokenLanguages = Object.keys(languageMap);
    
    // Fetch user details from the Appwrite account
    onMount(async () => {
        try {
            const userInfo = await account.get();
            username = userInfo.name || 'Guest';

            // Fetch existing user document, if it exists, and pre-fill the fields
            try {
                const userDocument = await databases.getDocument(
                    databaseId,
                    collectionId,
                    userId
                );
                if (userDocument) {
                    // If the document exists, pre-fill the form with existing data
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

    // Function to save selected languages to the user's profile
    async function saveUserInfo() {
        if (!userId) {
            console.error('User ID is not available');
            return;
        }

        try {
            // Check if the user's document exists
            let userDocument;
            try {
                userDocument = await databases.getDocument(
                    databaseId,
                    collectionId,
                    userId
                );
            } catch (error) {
                // If the document doesn't exist, catch the error and proceed to create one
                console.log('Document not found, creating a new one.');
            }

            if (userDocument) {
                // If document exists, update it
                const response = await databases.updateDocument(
                    databaseId,
                    collectionId,
                    userId,  // Use the userId as the document ID
                    {
                        langLearn: languageMap[langLearning],  // Store abbreviation
                        langSpeak: languageMap[langSpeaking],
                        userNameChangable: usernamechange
                    }
                );
                console.log('Languages and username updated successfully:', response);
                goto("/profile");
            } else {
                // If document doesn't exist, create it
                const response = await databases.createDocument(
                    databaseId,
                    collectionId,
                    userId,  // Use the userId as the document ID
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

<!-- HTML Template -->
<div class="flex justify-center items-center min-h-screen">
    <div class="text-center">

        <!-- Username Changeable Text Field -->
        <div class="mt-4">
            <label for="usernameChange" class="block">Change Your Username:</label>
            <input
                id="usernameChange"
                type="text"
                bind:value={usernamechange} 
                class="mt-2 p-2 border rounded"
                placeholder="Enter new username" />
        </div>

        <!-- Language for Learning -->
        <div class="mt-4">
            <label for="langLearn" class="block">Select the language you are learning:</label>
            <select id="langLearn" bind:value={langLearning} class="mt-2">
                <option value="" disabled>Select a language</option>
                {#each mostSpokenLanguages as language}
                    <option value={language} selected={langLearning === language}>{language}</option>
                {/each}
            </select>
        </div>

        <!-- Language for Speaking -->
        <div class="mt-4">
            <label for="langSpeak" class="block">Select the language you are speaking:</label>
            <select id="langSpeak" bind:value={langSpeaking} class="mt-2">
                <option value="" disabled>Select a language</option>
                {#each mostSpokenLanguages as language}
                    <option value={language} selected={langSpeaking === language}>{language}</option>
                {/each}
            </select>
        </div>

        <!-- Save Button -->
        <button 
            class="btn btn-primary mt-4" 
            on:click={saveUserInfo}>
            Save Changes
        </button>

    </div>
</div>
