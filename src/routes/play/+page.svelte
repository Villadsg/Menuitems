<script lang="ts">
  import { databases, storage } from '$lib/appwrite'; // Import Appwrite services
  import { page } from '$app/stores'; // To access the query parameters
  import { onMount } from 'svelte';

  let monument = null;  // Object to store monument details
  let quizQuestion = "";  // Store the quiz question
  let quizAnswers = [];   // Array to store the quiz answers

  onMount(async () => {
    const params = new URLSearchParams($page.url.search);
    const id = params.get('id');  // Get monument ID from query params

    if (id) {
      const databaseId = '6609473fbde756e5dc45';  // Your actual database ID
      const collectionId = '66eefaaf001c2777deb9';  // Your actual collection ID
      const bucketId = '66efdb420000df196b64';  // Your actual storage bucket ID

      try {
        // Fetch the monument document by ID
        const doc = await databases.getDocument(databaseId, collectionId, id);

        let photoUrl = null;

        if (doc.photoFileId) {
          // Get the file preview URL from Appwrite storage
          photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
        }

        monument = {
          id: doc.$id,
          name: doc.Route_name,
          lat: doc.lat,
          lng: doc.lng,
          photoUrl,
        };

        // Extract the quiz question and answers from the document
        quizQuestion = doc.quiz_question_answer[0];  // Assuming the first element is the question
        quizAnswers = doc.quiz_question_answer.slice(1);  // The rest are the answers
      } catch (error) {
        console.error('Error loading monument:', error);
        monument = null;
      }
    } else {
      monument = null;
    }
  });
</script>

{#if monument}
<div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
  <!-- Directly Display Monument Details -->
  <h1 class="text-3xl font-bold">{monument.name}</h1>
  
  {#if monument.photoUrl}
    <img src={monument.photoUrl} alt={monument.name} class="my-4 w-full max-w-lg mx-auto rounded shadow" />
  {/if}

  <p class="text-gray-700 mt-4">Latitude: {monument.lat}</p>
  <p class="text-gray-700 mt-2">Longitude: {monument.lng}</p>

  <!-- Display Quiz Section -->
  <h2 class="mt-6 text-xl font-bold">Quiz</h2>
  {#if quizQuestion}
    <p class="mt-4 text-lg">{quizQuestion}</p>

    <ul class="mt-4 space-y-2">
      {#each quizAnswers as answer}
        <li class="bg-gray-200 p-2 rounded">
          {answer}
        </li>
      {/each}
    </ul>
  {:else}
    <p>No quiz available for this monument.</p>
  {/if}

  <button
    class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 mt-4"
    on:click={() => history.back()}
  >
    Back
  </button>
</div>
{:else}
<p class="text-center text-red-500 mt-8">Monument not found.</p>
{/if}
