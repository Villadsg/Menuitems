<script lang="ts">
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; 
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { fly } from 'svelte/transition';

  let routeName = '';
  let Description = '';
  let lat = '';
  let lng = '';
  let route_description = ["", "", "", ""];
  let question = "";
  let answers = ["", "", "", ""];
  let correctAnswer = "";
  let message = '';
  const currentDate = new Date().toISOString();

  const addChoice = (index, event) => {
    answers[index] = event.target.value;
  };

  let currentPage = 'beginSection';
  $: userId = $user?.$id;

  const submitQuiz = async () => {
    try {
      let fileId = null;

      if (files && files.length > 0) {
        const file = files[0];
        const response = await storage.createFile(
          bucketId,
          ID.unique(),
          file,
          [
            Permission.read(Role.any()),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId))
          ]
        );
        fileId = response.$id;
      }

      const documentData = {
        dateModified: currentDate,
        Route_name: routeName,
        Description: Description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        steps_in_route: route_description,
        quiz_question_answer: [
          question,
          correctAnswer,
          ...answers.filter(answer => answer.trim() !== "")
        ],
        userId: userId,
        ...(fileId && { photoFileId: fileId })
      };

      await databases.createDocument(databaseId, collectionId, ID.unique(), documentData);
      currentPage = 'confirmationPage';
      setTimeout(() => {
        goto('/');
      }, 4000);
    } catch (error) {
      message = `Failed to create monument and quiz. Error: ${error.message}`;
    }
  };

  let loading = false;
  let files = null;
  let bucketId = '66efdb420000df196b64';
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
            <label for="routeName" class="label">Tour Name</label>
            <input id="routeName" type="text" bind:value={routeName} placeholder="Enter Monument Name" required class="input input-bordered w-full" />
          </div>
          <div>
            <label for="Description" class="label">Description</label>
            <textarea id="Description" bind:value={Description} placeholder="Enter Description" required class="textarea textarea-bordered w-full h-24"></textarea>
          </div>
          <div>
            <label for="lat" class="label">Latitude</label>
            <input id="lat" type="number" step="any" bind:value={lat} placeholder="Enter Latitude" required class="input input-bordered w-full" />
          </div>
          <div>
            <label for="lng" class="label">Longitude</label>
            <input id="lng" type="number" step="any" bind:value={lng} placeholder="Enter Longitude" required class="input input-bordered w-full" />
          </div>
          <div>
            <label for="photo" class="label">Upload or Take Photo</label>
            <p>Make sure it's unique within the area</p>
            <input id="photo" type="file" bind:files={files} accept="image/*" capture="environment" required class="input input-bordered w-full" />
          </div>
          <button type="button" class="btn btn-outline w-full" on:click={getCurrentLocation} disabled={loading}>
            {#if loading}
              <span class="loading loading-spinner"></span> Loading...
            {:else}
              Use Current Location
            {/if}
          </button>
          <button type="submit" class="btn btn-primary w-full">Next Page</button>
        </form>
      {:else if currentPage === 'routeSection'}
        <!-- Second Section (Route Descriptions) -->
        <form on:submit|preventDefault={() => currentPage = 'questionSection'}  class="space-y-4 max-w-md mx-auto">
          <h2 class="text-xl font-bold">Add Route Descriptions</h2>
          <h3 class="text-lg">Describe up to 4 steps in your route:</h3>
          {#each route_description as description, i (i)}
            <div>
              <label for="route{i}" class="label">Route Step {i + 1}</label>
              <input id="route{i}" type="text" bind:value={route_description[i]} placeholder="Enter route description" class="input input-bordered w-full" />
            </div>
          {/each}
          <button type="submit" class="btn btn-primary w-full">Next: Add Quiz Question</button>
        </form>
      {:else if currentPage === 'questionSection'}
        <!-- Third Section (Quiz Question Form) -->
        <h2 class="text-xl font-bold">Add Quiz Question</h2>
        <div>
          <label for="question" class="label">Quiz Question</label>
          <input id="question" type="text" bind:value={question} placeholder="Enter quiz question" class="input input-bordered w-full" required />
        </div>
        <h3 class="text-lg font-bold">Add up to 4 answer choices:</h3>
        {#each answers as answer, i (i)}
          <div>
            <label for="answer{i}" class="label">Answer {i + 1}</label>
            <input id="answer{i}" type="text" on:input={(e) => addChoice(i, e)} value={answer} class="input input-bordered w-full" placeholder="Enter choice" />
          </div>
        {/each}
        <div>
          <label for="correctAnswer" class="label">Correct Answer</label>
          <input id="correctAnswer" type="text" bind:value={correctAnswer} placeholder="Enter the correct answer" class="input input-bordered w-full" required />
        </div>
        <button type="button" class="btn btn-success w-full" on:click={submitQuiz}>Submit Quiz</button>
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
