<script lang="ts">
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; 
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { fly } from 'svelte/transition';

  let routeName = '';
  let Description = '';
  let lat = '';
  let lng = '';
  let route_description = [];
  let question = "";
  let answers = [];
  let correctAnswer = "";
  let message = '';
  let languages = ['ES','IT','DA','JA']; // Array to hold selected languages
  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

   
  const addChoice = (index, event) => {
    answers[index] = event.target.value;
  };

  let currentPage = 'beginSection';
  $: userId = $user?.$id;

  /** Function to translate text */
  async function translateText(text: string, targetLang: string) {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      return data.translation;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text if translation fails
    }
  }

  const submitQuiz = async () => {
    try {
      let fileId = null;

// Check if a photo is provided and store it in Appwrite after everything else is prepared
if (files && files.length > 0) {
  const file = files[0];
  // Upload the file to Appwrite storage
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

      // Create the original document in Appwrite
      await databases.createDocument(databaseId, collectionId, ID.unique(), documentData);

      // Check if any languages were selected
      if (languages.length > 0) {
        const translatedCollectionId = '66fe6ac90010d9e9602f'; // Adjust if necessary

        // Loop through selected languages
        for (const languageCode of languages) {
          // Translate the inputs into the current language
          const translatedRouteName = await translateText(routeName, languageCode);
          const translatedDescription = await translateText(Description, languageCode);
          const translatedRouteDescriptions = await Promise.all(
            route_description.map(desc => translateText(desc, languageCode))
          );
          const translatedQuestion = await translateText(question, languageCode);
          const translatedAnswers = await Promise.all(
            answers.map(ans => translateText(ans, languageCode))
          );
          const translatedCorrectAnswer = await translateText(correctAnswer, languageCode);

          // Create the translated document data
          const translatedDocumentData = {
            ...documentData,
            Route_name: translatedRouteName,
            Description: translatedDescription,
            steps_in_route: translatedRouteDescriptions,
            quiz_question_answer: [
              translatedQuestion,
              translatedCorrectAnswer,
              ...translatedAnswers.filter(answer => answer.trim() !== "")
            ],
            language: languageCode,
            lat: parseFloat(lat),
            lng: parseFloat(lng), 
            userId: userId,
            ...(fileId && { photoFileId: fileId })
          };

          // Save the translated document
          await databases.createDocument(databaseId, translatedCollectionId, ID.unique(), translatedDocumentData);
        }
      }

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
        <form on:submit|preventDefault={() => currentPage = 'photoSection'} class="space-y-4 max-w-md mx-auto">
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
          
          <button type="button" class="btn btn-outline w-full" on:click={getCurrentLocation} disabled={loading}>
            {#if loading}
              <span class="loading loading-spinner"></span> Loading...
            {:else}
              Use Current Location
            {/if}
          </button>

          
         
          <button type="submit" class="btn btn-primary w-full">Next: add photo</button>
        </form>
        {:else if currentPage === 'photoSection'}
        <form on:submit|preventDefault={() => currentPage = 'routeSection'}  class="space-y-4 max-w-md mx-auto">
          <div>
            <label for="photo" class="label">Upload or Take the Photo a user should find</label>
            <p>Make sure it's unique within the area</p>
            <input id="photo" type="file" bind:files={files} accept="image/*" capture="environment" required class="input input-bordered w-full" />
          </div>

          <button type="submit" class="btn btn-primary w-full">Next: add route to photo</button>
        </form>

      {:else if currentPage === 'routeSection'}
        <!-- Second Section (Route Descriptions) -->
        <form on:submit|preventDefault={() => currentPage = 'questionSection'}  class="space-y-4 max-w-md mx-auto">
          <h2 class="text-xl font-bold">Add Route Descriptions</h2>
          <h3 class="text-lg">Add steps in your route to the photo:</h3>
          
          {#each route_description as step, index}
  <div class="flex items-center space-x-2">
    <input 
      type="text" 
      bind:value={route_description[index]} 
      class="input input-bordered w-full" 
      placeholder="Enter step"
    />
    <button 
      type="button" 
      class="btn btn-outline btn-error" 
      on:click={() => route_description = route_description.filter((_, i) => i !== index)}
    >
      Remove
    </button>
  </div>
{/each}
<button 
  type="button" 
  class="btn btn-outline mt-2" 
  on:click={() => route_description = [...route_description, '']}
>
  Add Step
</button>

      
          <button type="submit" class="btn btn-primary w-full">Next: Add Quiz Question</button>
        </form>
      {:else if currentPage === 'questionSection'}
        <!-- Third Section (Quiz Question Form) -->
        <h2 class="text-xl font-bold">Add Quiz Question</h2>
        <div>
          <label for="question" class="label">Quiz Question</label>
          <input id="question" type="text" bind:value={question} placeholder="Enter quiz question" class="input input-bordered w-full" required />
        </div>
        <h3 class="text-lg font-bold">Add answer options in the multiple choice:</h3>
        {#each answers as step, index}
        <div class="flex items-center space-x-2">
          <input 
            type="text" 
            bind:value={answers[index]} 
            class="input input-bordered w-full" 
            placeholder="Enter Potential Correct Answer"
          />
          <button 
            type="button" 
            class="btn btn-outline btn-error" 
            on:click={() => answers = answers.filter((_, i) => i !== index)}
          >
            Remove
          </button>
        </div>
      {/each}
      <button 
        type="button" 
        class="btn btn-outline mt-2" 
        on:click={() => answers = [...answers, '']}
      >
        Add Step
      </button>
      
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
