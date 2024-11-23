<script lang="ts">
  import { fly } from 'svelte/transition';
  import { databases, storage, account } from '$lib/appwrite';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let monument: string;
  let quizQuestion = "";
  let quizCorrectAnswer = "";
  let quizAnswers: string[] = [];
  let dateMod = Date();
  let selectedAnswer = "";
  let hasSubmitted = false;
  let isCorrect = false;
  let quizDescription = "";
  let currentPage = 0;
  let userNameChangable = "";
  let stillLoading = true;
  let isLoggedIn = false;
let showModal = false;

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  const bucketId = '66efdb420000df196b64';
  const userCollectionId = '66fbb317002371bfdffc';
  let userId = "";  // to be populated with the current user’s ID

  onMount(async () => {
    try {
    const session = await account.get();
    if (session) {
      userId = session.$id;
      console.log("User ID in play page:", userId); // Check if this logs correctly
      isLoggedIn = true;
    } else {
      console.log("User is not logged in");
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

        // Fetch user document if the user is logged in
        if (isLoggedIn) {
          const userDoc = await databases.getDocument(databaseId, userCollectionId, monument.userId);
          userNameChangable = userDoc.userNameChangable;
        }

        quizDescription = doc.Description;
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

  function nextPage() {
    currentPage = (currentPage + 1) % 2;
  }

  function prevPage() {
    if (currentPage > 0) {
      currentPage = (currentPage - 1);
    }
  }

  function selectAnswer(answer: string) {
    selectedAnswer = answer;
    hasSubmitted = false;
  }

async function submitQuiz() {
  if (!isLoggedIn) {
    alert("Please log in to submit your quiz.");
    goto('/login'); 
    return;
  }

  if (selectedAnswer) {
    hasSubmitted = true;
    isCorrect = selectedAnswer === quizCorrectAnswer;

    if (isCorrect) {
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
        
        showModal = true;  // Show modal after successful submission
      } catch (error) {
        console.error('Error updating locationsDone:', error);
      }
    }
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
    <div class="card max-w-4xl mx-auto p-6 bg-base-100 shadow-xl mt-8">
      {#key currentPage}
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

        {#if currentPage === 1}
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
        {#if currentPage !== 0}
          <button class="btn btn-secondary mb-4" on:click={prevPage}>Back</button>
        {/if}
        {#if currentPage < 1}
          <button class="btn btn-secondary mt-4" on:click={nextPage}>Next</button>
        {/if}
        {#if !hasSubmitted && currentPage === 1 && selectedAnswer}
          <button class="btn btn-primary mt-4" on:click={submitQuiz}>Submit</button>
        {/if}
      </div>
    </div>
  {:else}
    <div class="alert alert-error mt-8 text-center">
      <p>Monument not found.</p>
    </div>
  {/if}
</div>



{#if showModal}
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-auto">
      <h3 class="text-xl font-bold mb-4">Quiz Completed</h3>
      <p class="mb-6">You completed the quiz! What would you like to do next?</p>
      <button class="btn btn-primary mb-4 w-full" on:click={goToHome}>Go to Home Page</button>
      <button class="btn btn-secondary w-full" on:click={startNewQuiz}>Start Another Quiz</button>
    </div>
  </div>
{/if}