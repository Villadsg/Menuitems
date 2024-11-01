<script lang="ts">
  import { fly } from 'svelte/transition';
  import { databases, storage } from '$lib/appwrite';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let monument: string;
  let quizQuestion = "";
  let quizCorrectAnswer = "";
  let quizAnswers: string[] = [];
  let dateMod = Date();
  let selectedAnswer = "";
  let hasSubmitted = false;
  let isCorrect = false;
  let quizRoute: string[] = [];
  let startingDescription = "";
  let quizDescription = "";
  let currentPage = 0;
  let userNameChangable = "";
  let stillLoading = true;

  onMount(async () => {
    const params = new URLSearchParams($page.url.search);
    const id = params.get('id');
    const lang = params.get('lang');

    if (id) {
      const databaseId = '6609473fbde756e5dc45';
      const collectionId = '66eefaaf001c2777deb9';
      const bucketId = '66efdb420000df196b64';
      const userCollectionId = '66fbb317002371bfdffc';
      const translatedCollectionId = "66fe6ac90010d9e9602f";

      try {
        const currentCollectionId = lang === 'english' || lang === null ? collectionId : translatedCollectionId;
        const doc = await databases.getDocument(databaseId, currentCollectionId, id);

        let photoUrl = null;
        let photoStartingPointUrl = null;

        if (doc.photoFileId) {
          photoUrl = storage.getFilePreview(bucketId, doc.photoFileId).href;
        }

        if (doc.startingPoint[0]) {
          photoStartingPointUrl = storage.getFilePreview(bucketId, doc.startingPoint[0]).href;
        }

        monument = {
          id: doc.$id,
          name: doc.Route_name,
          photoUrl,
          photoStartingPointUrl,
          userId: doc.userId
        };

        const userDoc = await databases.getDocument(databaseId, userCollectionId, monument.userId);
        userNameChangable = userDoc.userNameChangable;

        quizDescription = doc.Description;
        quizRoute = doc.steps_in_route;
        startingDescription = doc.startingPoint[1];
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

  function submitQuiz() {
    if (selectedAnswer) {
      hasSubmitted = true;
      isCorrect = selectedAnswer === quizCorrectAnswer;
    }
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
