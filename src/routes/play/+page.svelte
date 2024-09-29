<script lang="ts">
  import { databases, storage } from '$lib/appwrite'; // Import Appwrite services
  import { page } from '$app/stores'; // To access the query parameters
  import { onMount } from 'svelte';

  let monument = null;  // Object to store monument details
  let quizQuestion = "";
  let quizCorrectAnswer = "";   // Store the correct quiz answer
  let quizAnswers = [];   // Array to store the quiz answers
  let selectedAnswer = "";  // Variable to store the user's selected answer
  let hasSubmitted = false;  // Variable to track if the user has submitted the quiz
  let isCorrect = false;  // Variable to track if the user's answer is correct

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
          photoUrl,
        };

        // Extract the quiz question and answers from the document
        quizQuestion = doc.quiz_question_answer[0];  // Assuming the first element is the question
        quizAnswers = doc.quiz_question_answer.slice(2);  // The rest are the answers
        quizCorrectAnswer = doc.quiz_question_answer[1];
      } catch (error) {
        console.error('Error loading monument:', error);
        monument = null;
      }
    } else {
      monument = null;
    }
  });

  // Function to handle answer selection
  function selectAnswer(answer: string) {
    selectedAnswer = answer;
  }

  // Function to handle quiz submission
  function submitQuiz() {
    if (selectedAnswer) {
      hasSubmitted = true;
      isCorrect = selectedAnswer === quizCorrectAnswer;
    }
  }
</script>

<div class ="pt-20">
{#if monument}
<div class="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
  <!-- Directly Display Monument Details -->
  <h1 class="text-3xl font-bold">{monument.name}</h1>
  
  {#if monument.photoUrl}
    <img src={monument.photoUrl} alt={monument.name} class="my-4 w-full max-w-lg mx-auto rounded shadow" />
  {/if}


  <!-- Display Quiz Section -->
  <h2 class="mt-6 text-xl font-bold">Quiz</h2>
  {#if quizQuestion}
    <p class="mt-4 text-lg">{quizQuestion}</p>

    <ul class="mt-4 space-y-2">
      {#each quizAnswers as answer}
      <button 
      class="w-full text-left bg-gray-200 p-2 rounded {selectedAnswer === answer ? 'bg-blue-200' : ''}"
      on:click={() => selectAnswer(answer)}
      type="button"
    >
      {answer}
    </button>
      {/each}
    </ul>

    <!-- Display submit button only if an answer is selected and quiz has not been submitted -->
    {#if !hasSubmitted}
      {#if selectedAnswer}
        <button
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
          on:click={submitQuiz}
        >
          Submit
        </button>
      {/if}
    {/if}

    <!-- Display result after submission -->
    {#if hasSubmitted}
      <p class="mt-4 text-lg font-bold">
        {isCorrect ? 'Correct answer!' : 'Wrong answer. Try again!'}
      </p>
    {/if}

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
</div>