<script lang="ts">
  import { fly } from 'svelte/transition';
  import { supabase } from '$lib/supabase';
  import { SupabaseService } from '$lib/supabaseService';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let closebyDescription = "";
  let descriptionTranslations = {};
  let closebyDescriptionTranslations = {};
  let monument: string;
  let dateMod = Date();
  let isCorrect = false;
  let quizDescription = "";
  let currentPage = 0;
  let userNameChangable = "";
  let stillLoading = true;
  let isLoggedIn = false;
  let showModal = false;

  let selectedLanguage = "EN"; // Default language to display

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  const bucketId = '66efdb420000df196b64';
  const userCollectionId = '66fbb317002371bfdffc';
  let userId = ""; // to be populated with the current user’s ID

  onMount(async () => {
    try {
      const session = await account.get();
      if (session) {
        userId = session.$id;
        isLoggedIn = true;
      } else {
        isLoggedIn = false;
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      isLoggedIn = false;
    }

    const params = new URLSearchParams($page.url.search);
    const id = params.get('id');

    if (id) {
      try {
        const doc = await databases.getDocument(databaseId, collectionId, id);

        let photoUrl = null;
        if (doc.photoFileId) {
          photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
        }

        monument = {
          id: doc.$id,
          name: doc.Route_name,
          photoUrl,
          userId: doc.userId
        };

        descriptionTranslations = JSON.parse(doc.Description);
        closebyDescriptionTranslations = JSON.parse(doc.closebyDescription);

        quizDescription = descriptionTranslations[selectedLanguage] || "No description available";
        closebyDescription = closebyDescriptionTranslations[selectedLanguage] || "No description available";

        dateMod = doc.dateModified.slice(0, 16).replace('T', ' ');

        // Fetch user document if the user is logged in
        if (isLoggedIn) {
          const userDoc = await databases.getDocument(databaseId, userCollectionId, monument.userId);
          userNameChangable = userDoc.userNameChangable;
        }
      } catch (error) {
        console.error('Error loading monument or user data:', error);
        monument = null;
      }
    } else {
      monument = null;
    }
    stillLoading = false;
  });

  function selectLanguage(language: string) {
    selectedLanguage = language;
    quizDescription = descriptionTranslations[language] || "No description available";
    closebyDescription = closebyDescriptionTranslations[language] || "No description available";
  }

  function nextPage() {
    currentPage = (currentPage + 1) % 2;
  }

  function prevPage() {
    if (currentPage > 0) {
      currentPage = (currentPage - 1);
    }
  }

  async function submitQuiz() {
    if (!isLoggedIn) {
      alert("Please log in to submit your quiz.");
      goto('/login');
      return;
    }

    try {
      const userDoc = await databases.getDocument(databaseId, userCollectionId, userId);
      let locationsDone = userDoc.locationsDone || [];

      const completionDate = new Date().toISOString().slice(0, 10);
      const locationEntry = JSON.stringify({ id: monument.id, Route_name: monument.name, Date: completionDate });

      if (!locationsDone.includes(locationEntry)) {
        locationsDone.push(locationEntry);

        await databases.updateDocument(databaseId, userCollectionId, userId, {
          locationsDone: locationsDone,
        });
      }

      showModal = true; // Show modal after successful submission
    } catch (error) {
      console.error('Error updating locationsDone:', error);
    }
  }

  function goToHome() {
    goto('/');
  }

  function startNewQuiz() {
    goto('/find-quiz');
  }
</script>
<div class="pt-20">
  {#if stillLoading}
    <div class="flex items-center justify-center h-screen">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {/if}

  {#if monument}
    <div class="card max-w-4xl mx-auto p-6 bg-base-100 shadow-xl mt-8 relative text-center">
      <!-- Monument Header -->
      <h1 class="text-3xl font-bold mb-4">{monument.name}</h1>

          
      {#key currentPage}
        <!-- Monument Description -->
        {#if currentPage === 0}
          <div
            class="flex flex-col items-center animate-fade-in"
            in:fly={{ y: 100, duration: 500 }}
            out:fly={{ y: -100, duration: 500 }}
          >
            {#if monument.photoUrl}
              <figure class="my-4">
                <img src={monument.photoUrl} alt={monument.name} class="w-full max-w-lg mx-auto rounded-lg shadow" />
              </figure>
            {/if}
            <p class="text-lg font-medium text-gray-800 mb-4">{quizDescription}</p>
            
            <!-- Language Selection Buttons -->
      <div class="flex flex-wrap gap-2 mt-4">
        {#each Object.keys(descriptionTranslations) as language}
          <button
            class="btn btn-sm btn-primary"
            on:click={() => selectLanguage(language)}
          >
            {language}
          </button>
        {/each}
      </div>
  
            
            <p class="text-gray-700">Created by: {userNameChangable}</p>
            <p class="text-gray-700">{dateMod}</p>
          </div>
        {/if}

        <!-- Closeby Description -->
        {#if currentPage === 1}
          <div
            class="flex flex-col items-center animate-fade-in"
            in:fly={{ y: 100, duration: 500 }}
            out:fly={{ y: -100, duration: 500 }}
          >
            <div class="card w-full max-w-lg bg-base-200 shadow-xl p-4">
              <p class="text-lg font-medium text-gray-800">{closebyDescription}</p>
                
                <!-- Language Selection Buttons -->
      <div class="flex flex-wrap gap-2 mt-4">
        {#each Object.keys(descriptionTranslations) as language}
          <button
            class="btn btn-sm btn-primary"
            on:click={() => selectLanguage(language)}
          >
            {language}
          </button>
        {/each}
      </div>
  
            </div>
          </div>
        {/if}
      {/key}

      <!-- Navigation Buttons -->
      <div class="mt-6 flex justify-center space-x-4">
        {#if currentPage !== 0}
          <button class="btn btn-secondary" on:click={prevPage}>Back</button>
        {/if}
        {#if currentPage < 1}
          <button class="btn btn-secondary" on:click={nextPage}>Go to hidden text</button>
        {/if}
        {#if currentPage === 1}
          <button class="btn btn-primary" on:click={submitQuiz}>Done</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="alert alert-error text-center mt-8">
      <p>Monument not found.</p>
    </div>
  {/if}

  <!-- Modal for Success -->
  {#if showModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg p-6 max-w-md mx-auto text-center">
        <h3 class="text-xl font-bold mb-4">Place discovered!</h3>
        <p class="mb-6">You discovered {monument.name}! What would you like to do next?</p>
        <button class="btn btn-primary mb-4 w-full" on:click={goToHome}>Go to Home Page</button>
        <button class="btn btn-secondary w-full" on:click={startNewQuiz}>Discover</button>
      </div>
    </div>
  {/if}
</div>