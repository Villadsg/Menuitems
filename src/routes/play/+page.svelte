<script lang="ts">
  import { fly } from 'svelte/transition';  // Import the fly transition
  import { databases, storage } from '$lib/appwrite'; // Import Appwrite services
  import { page } from '$app/stores'; // To access the query parameters
  import { onMount } from 'svelte';
  
  let monument = null;  // Object to store monument details
  let quizQuestion = "";
  let quizCorrectAnswer = "";   // Store the correct quiz answer
  let quizAnswers = [];   // Array to store the quiz answers
  let dateMod = Date();
  let selectedAnswer = "";  // Variable to store the user's selected answer
  let hasSubmitted = false;  // Variable to track if the user has submitted the quiz
  let isCorrect = false;
  let quizRoute = [];
  let quizDescription = "";
  let currentPage = 0;  // Variable to track the current page for the fly transition
  let userNameChangable = ""; // Variable to store the fetched userNameChangable attribute
  let stillLoading = true;

  onMount(async () => {
    const params = new URLSearchParams($page.url.search);
    const id = params.get('id');  // Get monument ID from query params
    const lang = params.get('lang');
    console.log(lang)
    if (id) {
      const databaseId = '6609473fbde756e5dc45';  // Your actual database ID for monuments
      const collectionId = '66eefaaf001c2777deb9';  // Your actual collection ID for monuments
      const bucketId = '66efdb420000df196b64';  // Your actual storage bucket ID
      const userCollectionId = '66fbb317002371bfdffc'; // Collection ID for users
      const translatedCollectionId = "66fe6ac90010d9e9602f";
      

      try {
        
        const currentCollectionId = lang === 'english' || lang === null ? collectionId : translatedCollectionId;
        // Fetch the monument document by ID
        const doc = await databases.getDocument(databaseId, currentCollectionId, id);

        

        let photoUrl = null;

        if (doc.photoFileId) {
          // Get the file preview URL from Appwrite storage
          photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
        }

        monument = {
          id: doc.$id,
          name: doc.Route_name,
          photoUrl,
          userId: doc.userId // Assuming userID is part of the monument data
        };

        // Fetch the user's document by their userID to get userNameChangable
        const userDoc = await databases.getDocument(databaseId, userCollectionId, monument.userId);
        userNameChangable = userDoc.userNameChangable;

        // Extract the quiz question and answers from the document
        quizDescription = doc.Description;
        quizRoute = doc.steps_in_route;
        dateMod = doc.dateModified.slice(0, 16).replace('T', ' ');
        quizQuestion = doc.quiz_question_answer[0]; 
        quizAnswers = doc.quiz_question_answer.slice(2);  
        quizCorrectAnswer = doc.quiz_question_answer[1];


      } catch (error) {
        console.error('Error loading monument or user data:', error);
        monument = null;
        
      }
    } else {
      monument = null;
     
    }
    stillLoading = false;
  });

  // Function to go to the next page with a fly transition
  function nextPage() {
    currentPage = (currentPage + 1) % 3;  // Move to the next page
  }
    // Function to go back to the previous page with a fly transition
    function prevPage() {
    if (currentPage > 0) {
      currentPage = (currentPage - 1);  // Move to the previous page
    }
  }

  // Function to handle answer selection
function selectAnswer(answer: string) {
  selectedAnswer = answer;
  hasSubmitted = false;  // Reset hasSubmitted to allow resubmission
}

  // Function to handle quiz submission
  function submitQuiz() {
    if (selectedAnswer) {
      hasSubmitted = true;
      isCorrect = selectedAnswer === quizCorrectAnswer;
    }
  }
</script>
<!-- HTML Layout for Fly Transition Pages -->
<div class="pt-20">

  
  {#if stillLoading}
  <div class="flex items-center justify-center h-screen">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
 {/if}

  {#if monument}
    <div class="card max-w-4xl mx-auto p-6 bg-base-100 shadow-xl mt-8">

      {#key currentPage}
        <!-- First Page: Photo, Route Name, and Description -->
        {#if currentPage === 0}
          <div in:fly={{ y: 100, duration: 500 }} out:fly={{ y: -100, duration: 500 }}>
            <h1 class="text-3xl font-bold">{monument.name}</h1>
            <p class="mt-2 text-gray-700">Created by: {userNameChangable}</p>
            <p class="mt-2 text-gray-700">{dateMod}</p>
            <p class="mt-4">{quizDescription}</p>
            {#if monument.photoUrl}
              <figure class="my-4">
                <img src={monument.photoUrl} alt={monument.name} class="w-full max-w-lg mx-auto rounded-lg shadow" />
              </figure>
            {/if}
          </div>
        {/if}

        <!-- Second Page: Quiz Route -->
        {#if currentPage === 1}
          <div in:fly={{ y: 100, duration: 500 }} out:fly={{ y: -100, duration: 500 }}>
            <h2 class="text-xl font-bold">Route to Find the Photo</h2>
            <ul class="list-disc pl-5 mt-4 space-y-2">
              {#each quizRoute as step}
                <li>{step}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Third Page: Quiz Section -->
        {#if currentPage === 2}
          <div in:fly={{ y: 100, duration: 500 }} out:fly={{ y: -100, duration: 500 }}>
            <h2 class="text-xl font-bold">Quiz</h2>
            {#if quizQuestion}
              <p class="mt-4 text-lg">{quizQuestion}</p>

              <ul class="mt-4 space-y-2">
                {#each quizAnswers as answer}
                  <button 
                    class="btn w-full text-left p-2 {selectedAnswer === answer ? 'btn-primary' : 'btn-ghost'}"
                    on:click={() => selectAnswer(answer)}
                    type="button"
                  >
                    {answer}
                  </button>
                {/each}
              </ul>

              


              <!-- Display result after submission -->
              {#if hasSubmitted}
                <div class="alert mt-4 {isCorrect ? 'alert-success' : 'alert-error'}">
                  <span>{isCorrect ? 'Correct answer!' : 'Wrong answer. Try again!'}</span>
                </div>
              {/if}
            {:else}
              <p class="text-error mt-4">No quiz available for this monument.</p>
            {/if}
          </div>
        {/if}
      {/key}

    
                  <div>
        <!-- Back Button -->
      {#if currentPage !== 0}
        <button class="btn btn-secondary mb-4" on:click={prevPage}>
          Back
        </button>
      {/if}
      <!-- Button to navigate between pages -->
      {#if currentPage < 2}
        <button class="btn btn-secondary mt-4" on:click={nextPage}>
          Next
        </button>
      {/if}
       <!-- Display submit button only if an answer is selected and quiz has not been submitted -->
       {#if !hasSubmitted && currentPage === 2}
       {#if selectedAnswer}
         <button class="btn btn-primary mt-4" on:click={submitQuiz}>
           Submit
         </button>
       {/if}
     {/if}
                  </div>
    </div>
  {:else}
    <div class="alert alert-error mt-8 text-center">
      <p>Monument not found.</p>
    </div>
  {/if}
</div>

