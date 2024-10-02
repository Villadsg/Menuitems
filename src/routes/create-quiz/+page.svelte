<script lang="ts">
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; // Import storage
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { get } from 'svelte/store';
  import { Button, Label } from 'flowbite-svelte';
  import { fly } from 'svelte/transition';

  let routeName = '';
  let Description = '';
  let lat = '';
  let lng = '';
  let route_description = ["", "", "", ""];
  let question = "";
  let answers = ["", "", "", ""]; // array to store up to 4 choices
  let correctAnswer = ""; // Field to store the correct answer
  let message = '';

  const addChoice = (index, event) => {
    answers[index] = event.target.value;
  };

  let currentPage = 'beginSection'; // Possible values: 'beginSection', 'routeSection', 'questionSection'
 // Make userId reactive
 $: userId = $user?.$id;

  const submitQuiz = async () => {
    try {
      
      let fileId = null;

      // Check if a file is selected
      if (files && files.length > 0) {
        const file = files[0];

        // Upload the file to Appwrite Storage
        const response = await storage.createFile(
          bucketId,
          ID.unique(),
          file,
          [
            Permission.read(Role.any()), // Public read access
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId))
          ]
        );
        fileId = response.$id;
      }

      // Store the quiz question, answers, and correct answer in quiz_question_answer attribute
      const documentData = {
        Route_name: routeName,
        Description: Description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        steps_in_route: route_description,
        quiz_question_answer: [
          question,
          correctAnswer,  // Include the correct answer
          ...answers.filter(answer => answer.trim() !== "") // Exclude empty answers
        ],
        userId: userId,
        ...(fileId && { photoFileId: fileId }) // Add photoFileId only if fileId exists
      };
      
      await databases.createDocument(databaseId, collectionId, ID.unique(), documentData);
      currentPage = 'confirmationPage'; // Switch to confirmation page

    // Redirect to the main page after 4 seconds
        setTimeout(() => {
        goto('/');
        }, 4000);
    } catch (error) {
      message = `Failed to create monument and quiz. Error: ${error.message}`;
    }
  };
  
  let loading = false;
  let files = null;  // New files variable for file input
  let bucketId = '66efdb420000df196b64'; // Your Appwrite bucket ID
  
  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      loading = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          lat = position.coords.latitude.toString();
          lng = position.coords.longitude.toString();
          loading = false;
        },
        (error) => {
          console.error('Error getting location:', error.message);
          message = 'Could not retrieve your location.';
          loading = false;
        }
      );
    } else {
      message = 'Geolocation is not supported by your browser.';
    }
  };

</script>

<!-- Wrapper div -->
<div class="pt-20">
  {#key currentPage}
    <div transition:fly={{ x: 200, duration: 300 }} class="space-y-4 max-w-md mx-auto">
      {#if currentPage === 'beginSection'}
        <!-- First Section (Monument Form) -->
        <h1 class="text-2xl font-bold mb-4">Create Tour Challenge</h1>
        <form on:submit|preventDefault={() => currentPage = 'routeSection'} class="space-y-4 max-w-md mx-auto">
          <div>
            <Label for="routeName">Monument Name (Route Name)</Label>
            <input id="routeName" type="text" bind:value={routeName} placeholder="Enter Monument Name" required class="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <Label for="Description">Description</Label>
            <input id="Description" type="text" bind:value={Description} placeholder="Enter Description" required class="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <Label for="lat">Latitude</Label>
            <input id="lat" type="number" step="any" bind:value={lat} placeholder="Enter Latitude" required class="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <Label for="lng">Longitude</Label>
            <input id="lng" type="number" step="any" bind:value={lng} placeholder="Enter Longitude" required class="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <Label for="photo">Upload or Take Photo</Label>
            <p>Make sure it's unique within the area</p>
            <input id="photo" type="file" bind:files={files} accept="image/*" capture="environment" required class="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <Button type="button" class="w-full bg-gray-500 text-white px-4 py-2 rounded-lg" on:click={getCurrentLocation} disabled={loading}>
            {#if loading}
              <svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            {:else}
              Use Current Location
            {/if}
          </Button>
          <Button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg">Next Page</Button>
        </form>
      {:else if currentPage === 'routeSection'}
        <!-- Second Section (Route Descriptions) -->
        <form on:submit|preventDefault={() => currentPage = 'questionSection'}  class="space-y-4 max-w-md mx-auto">
          <h2 class="text-xl font-bold">Add Route Descriptions</h2>
          <h3 class="text-lg">Describe up to 4 steps in your route:</h3>
          {#each route_description as description, i (i)}
            <div>
              <Label for="route{i}">Route Step {i + 1}</Label>
              <input id="route{i}" type="text" bind:value={route_description[i]} placeholder="Enter route description" class="w-full p-2 border border-gray-300 rounded-lg" />
            </div>
          {/each}
          <Button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg">Next: Add Quiz Question</Button>
        </form>
      {:else if currentPage === 'questionSection'}
        <!-- Third Section (Quiz Question Form) -->
        <h2 class="text-xl font-bold">Add Quiz Question</h2>
        <div>
          <Label for="question">Quiz Question</Label>
          <input id="question" type="text" bind:value={question} placeholder="Enter quiz question" class="w-full p-2 border border-gray-300 rounded-lg" required />
        </div>
        <h3 class="text-lg font-bold">Add up to 4 answer choices:</h3>
        {#each answers as answer, i (i)}
          <div>
            <Label for="answer{i}">Answer {i + 1}</Label>
            <input id="answer{i}" type="text" on:input={(e) => addChoice(i, e)} value={answer} class="w-full p-2 border border-gray-300 rounded-lg" placeholder="Enter choice" />
          </div>
        {/each}
        <div>
          <Label for="correctAnswer">Correct Answer</Label>
          <input id="correctAnswer" type="text" bind:value={correctAnswer} placeholder="Enter the correct answer" class="w-full p-2 border border-gray-300 rounded-lg" required />
        </div>
        <Button type="button" class="w-full bg-green-500 text-white px-4 py-2 rounded-lg" on:click={submitQuiz}>Submit Quiz</Button>
        {:else if currentPage === 'confirmationPage'}
        <!-- Confirmation Page -->
        <div transition:fly={{ x: 200, duration: 300 }} class="space-y-4 max-w-md mx-auto text-center">
          <h2 class="text-2xl font-bold">Success!</h2>
          <p>Your monument and quiz were submitted successfully.</p>
          <p>Redirecting you to the main page...</p>
        </div>
        {/if}
    </div>
  {/key}
</div>
