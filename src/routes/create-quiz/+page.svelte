<script lang="ts">
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; 
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { fly } from 'svelte/transition';
  import { AppwriteService } from '$lib/appwriteService';
  import { getCurrentLocation} from '$lib/location'; //
  import { addItem } from '$lib/formHelpers';

  let routeName = '';
  let Description = '';
  let lat = '';
  let lng = '';
  let route_description: string[] = [];
  let question = "";
  let answers: string[] = [];
  let correctAnswer = "";
  let message = '';
  let languages = ['ES','IT','DA','JA']; // Array to hold selected languages
  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
  let startingPoint: string[] = []; // New startingPoint array
  let photoDescription = '';

   // Separate variables for file uploads
   let filesMainPhoto = null; // For the main photo
  let filesStartingPointPhoto = null; // For the starting point photo

  const translatedCollectionId = '66fe6ac90010d9e9602f'; // Adjust if necessary
  let loading = false;

  let bucketId = '66efdb420000df196b64';
  const collectionId = '66eefaaf001c2777deb9';
  
  /** Function to upload the main photo */
  const uploadMainPhoto = async () => {
    try {
      if (filesMainPhoto && filesMainPhoto.length > 0) {
        const file = filesMainPhoto[0];
        const response = await storage.createFile(bucketId, ID.unique(), file, [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]);
        return response.$id; // Return file ID for main photo
      }
    } catch (error) {
      console.error('Failed to upload main photo:', error.message);
      message = `Failed to upload main photo: ${error.message}`;
      return null;
    }
  };

   /** Function to upload the starting point photo */
   const uploadStartingPointPhoto = async () => {
    try {
      if (filesStartingPointPhoto && filesStartingPointPhoto.length > 0) {
        const file = filesStartingPointPhoto[0];
        const response = await storage.createFile(bucketId, ID.unique(), file, [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ]);

        // Add file ID and description to the startingPoint array
        startingPoint = addItem(startingPoint, response.$id); // Add photo ID
        startingPoint = addItem(startingPoint, photoDescription); // Add description
      }
    } catch (error) {
      console.error('Failed to upload starting point photo:', error.message);
      message = `Failed to upload starting point photo: ${error.message}`;
    }
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
    loading = true;
       // Upload main photo
       const mainPhotoFileId = await uploadMainPhoto();
      if (!mainPhotoFileId) {
        message = 'Main photo upload failed. Please try again.';
        return;
      }

      // Upload starting point photo
      await uploadStartingPointPhoto();
      if (startingPoint.length === 0) {
        message = 'No starting point photo uploaded. Please try again.';
        return;
      }

      const documentData = {
        dateModified: currentDate,
        Route_name: routeName,
        Description: Description,
        startingPoint,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        steps_in_route: route_description,
        quiz_question_answer: [
          question,
          correctAnswer,
          ...answers.filter(answer => answer.trim() !== "")
        ],
        userId: userId,
        photoFileId: mainPhotoFileId, // Main photo file ID
      };

      
      const originalDocument = await AppwriteService.createDocument(collectionId, documentData);
      const originalDocumentId = originalDocument.$id;

      // Check if any languages were selected
      if (languages.length > 0) {
        

        // Loop through selected languages
        for (const languageCode of languages) {
          // Translate the inputs into the current language
          const translatedDescription = await translateText(Description, languageCode);
          // Create the translated startingPoint array with the translated description
          
          const translatedstartingPoint = [startingPoint[0], await translateText(startingPoint[1], languageCode)];

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
            Route_name: routeName,
            Description: translatedDescription,
            startingPoint: translatedstartingPoint,
            steps_in_route: translatedRouteDescriptions,
            quiz_question_answer: [
              translatedQuestion,
              translatedCorrectAnswer,
              ...translatedAnswers.filter(answer => answer.trim() !== "")
            ],
            language: languageCode,
            idOriginal: originalDocumentId,
            lat: parseFloat(lat),
            lng: parseFloat(lng), 
            userId: userId,
            photoFileId: mainPhotoFileId, // Main photo file ID
          };

          // Save the translated document
          await AppwriteService.createDocument(translatedCollectionId, translatedDocumentData);
        }
      }

      currentPage = 'confirmationPage';
      setTimeout(() => {
        goto('/');
      }, 4000);
    } catch (error) {
      message = `Failed to create monument and quiz. Error: ${error.message}`;
    } finally {
    loading = false; // Hide spinner after loading is done
  }
  };



  // Updated function to use getCurrentLocation from location.ts
  const fetchCurrentLocation = async () => {
    try {
      loading = true; // Set loading state to true
      const location = await getCurrentLocation(); // Call getCurrentLocation from location.ts
      lat = location.latitude.toString(); // Set latitude
      lng = location.longitude.toString(); // Set longitude
      loading = false;
    } catch (error) {
      console.error('Error getting location:', error.message);
      message = 'Could not retrieve your location.';
      loading = false;
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
          
          <button type="button" class="btn btn-outline w-full" on:click={fetchCurrentLocation} disabled={loading}>
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
            <h3 class="text-lg font-bold">Upload or Take the Main photo user should find</h3>
            <label for="photo" class="label">Make sure it is unique in the area</label>
            <input id="photo" type="file" bind:files={filesMainPhoto} accept="image/*" capture="environment" required class="input input-bordered w-full" />
          </div>

          <h3 class="text-lg font-bold">Add Photo of Starting position</h3>
          <label for="photo" class="label">Upload a photo for the starting point</label>
          <input id="photo" type="file" bind:files={filesStartingPointPhoto} accept="image/*" required class="input input-bordered w-full" />
          
          <label for="photoDescription" class="label">Add description of the starting point</label>
          <textarea id="photoDescription" bind:value={photoDescription} class="textarea textarea-bordered w-full" placeholder="Enter description"></textarea>
          

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
        {#each answers as answer, index}
  <div class="flex items-center space-x-2">
    <!-- Answer input -->
    <input 
      type="text" 
      bind:value={answers[index]} 
      class="input input-bordered w-full" 
      placeholder="Enter answer option"
    />
    
    <!-- Radio button for marking the correct answer -->
    <input 
      type="radio" 
      name="correctAnswer" 
      value={answers[index]} 
      checked={correctAnswer === answers[index]} 
      on:change={() => correctAnswer = answers[index]}
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
        Add Option
      </button>
      
        <button type="button" class="btn btn-success w-full" on:click={submitQuiz}>
          {#if loading}
          <span class="loading loading-spinner mr-2"></span> Submitting...
        {:else}
          Submit Quiz
        {/if}

        </button>
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
