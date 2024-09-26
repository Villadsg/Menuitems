<script lang="ts">
  import { onMount } from 'svelte'; 
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; // Import storage
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { get } from 'svelte/store';
  import { Label, Button } from 'flowbite-svelte';
  import { fly } from 'svelte/transition';

  let routeName = '';
  let lat = '';
  let lng = '';
  let question = "";
  let answers = ["", "", "", ""]; // array to store up to 4 choices
  let message = '';

  let showQuestionSection = false;

  const addChoice = (index, event) => {
      answers[index] = event.target.value;
  };

  const nextPage = () => {
      showQuestionSection = true; // show next form page
  };

  const submitQuiz = async () => {
    try {
      const userId = get(user)?.$id;
      
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

      // Create the monument document (include photoFileId only if a file was uploaded)
      const documentData = {
        Route_name: routeName,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        quiz_question_answer: [
                question,
                ...answers.filter(answer => answer.trim() !== "") // Exclude empty answers
            ],
        userId: userId,
        ...(fileId && { photoFileId: fileId }) // Add photoFileId only if fileId exists
      };
      
      await databases.createDocument(databaseId, collectionId, ID.unique(), documentData);
      message = 'Monument created successfully!';
      goto('/');
    } catch (error) {
      message = `Failed to create monument. Error: ${error.message}`;
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

<!-- First Section (Monument Form) -->
{#if !showQuestionSection}
<div transition:fly={{x: 200, duration: 300}} class="space-y-4 max-w-md mx-auto">
  <h1 class="text-2xl font-bold mb-4 space-y-4 max-w-md mx-auto">Create Tour Challenge</h1>
  <form on:submit|preventDefault={nextPage} class="space-y-4 max-w-md mx-auto">
    <div>
      <Label for="routeName">Monument Name (Route Name)</Label>
      <input id="routeName" type="text" bind:value={routeName} placeholder="Enter Monument Name" required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
    <div>
      <Label for="lat">Latitude</Label>
      <input id="lat" type="number" step="any" bind:value={lat} placeholder="Enter Latitude" required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
    <div>
      <Label for="lng">Longitude</Label>
      <input id="lng" type="number" step="any" bind:value={lng} placeholder="Enter Longitude" required class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
  
    <!-- New file input for photo -->
    <div>
      <Label for="photo">Upload or Take Photo</Label>
      <p>Make sure it's unique within the area</p>
      <input id="photo" type="file" bind:files={files} accept="image/*" class="w-full p-2 border border-gray-300 rounded-lg" />
    </div>
  
    <!-- Button to fill coordinates with current location -->
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
  
    {#if message}
      <p class="text-green-500 mt-4">{message}</p>
    {/if}
  </form>
</div>
{/if}

<!-- Second Section (Quiz Question Form) -->
{#if showQuestionSection}
<div transition:fly={{x: 200, duration: 300}} class="space-y-4 max-w-md mx-auto">
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

  <Button type="button" class="w-full bg-green-500 text-white px-4 py-2 rounded-lg" on:click={submitQuiz}>Submit Quiz</Button>
</div>
{/if}

</div>
