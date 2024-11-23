<script lang="ts">
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; 
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { fly } from 'svelte/transition';
  import { AppwriteService } from '$lib/appwriteService';
  import { getCurrentLocation } from '$lib/location';
  import exifr from 'exifr'; // Import exifr for EXIF data extraction
  import { compressImage } from '$lib/compress'; 
 
  let routeName = '';
  let Description = '';
  let lat = '';
  let lng = '';
  let question = "";
  let answers: string[] = [];
  let correctAnswer = "";
  let showCoordinatesInput = false; 
  let message = '';
  let languages = ['ES','IT','DA','JA']; // Array to hold selected languages
  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

  let filesMainPhoto: FileList | null = null;
  let compressedFile: File | null = null;

  let loading = false;

  let bucketId = '66efdb420000df196b64';
  const collectionId = '66eefaaf001c2777deb9';
  
  /** Function to extract coordinates from EXIF metadata */
  const extractPhotoCoordinates = async (file: File) => {
    try {
      const metadata = await exifr.gps(file);
      if (metadata && metadata.latitude && metadata.longitude) {
        lat = metadata.latitude.toString();
        lng = metadata.longitude.toString();
        showCoordinatesInput = false;
      } else {
        showCoordinatesInput = true;
      }
    } catch (error) {
      console.error("Could not extract coordinates from photo:", error);
      showCoordinatesInput = true;
    }
  };

  const handlePhotoUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  filesMainPhoto = input.files; // Assign directly without converting to an array

  if (filesMainPhoto && filesMainPhoto[0]) {
    const originalFile = filesMainPhoto[0];

    // Extract coordinates from EXIF metadata
    await extractPhotoCoordinates(originalFile);

    // If no coordinates found, prompt to use current location
    if (showCoordinatesInput) {
      const useLocation = confirm("Photo has no GPS data. Would you like to use your current location?");
      if (useLocation) {
        await fetchCurrentLocation();
      }
    }

    // Compress the photo
    try {
      compressedFile = await compressImage(originalFile);
    } catch (error) {
      message = 'Failed to compress the photo.';
      compressedFile = null;
    }
  }
};


  /** Function to upload the main photo */
  const uploadMainPhoto = async () => {
    try {
      if (compressedFile) {

        const response = await storage.createFile(bucketId, ID.unique(), compressedFile, [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId || "anonymous")),
          Permission.delete(Role.user(userId || "anonymous")),
        ]);
        return response.$id;
      }
    } catch (error) {
      console.error('Failed to upload main photo:', error.message);
      message = `Failed to upload main photo: ${error.message};`
      return null;
    }
  };


  let currentPage = 'beginSection';
  $: userId = $user?.$id || "anonymous";

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

  

      const documentData = {
        dateModified: currentDate,
        Route_name: routeName,
        Description: Description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        language: 'EN',
        idOriginal: 'Main',
        quiz_question_answer: [
          question,
          correctAnswer,
          ...answers.filter(answer => answer.trim() !== "")
        ],
        userId: userId || "anonymous",
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
          await AppwriteService.createDocument(collectionId, translatedDocumentData);
        }
      }

      currentPage = 'confirmationPage';
      setTimeout(() => {
        goto('/');
      }, 4000);
    } catch (error) {
      message = `Failed to create monument and quiz. Error: ${error.message};`
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
        <h1 class="text-2xl font-bold mb-4">Create and describe a photo to find</h1>
        <form on:submit|preventDefault={() => currentPage = 'questionSection'} class="space-y-4 max-w-md mx-auto">
          <div>
            <label for="routeName" class="label">Name of Place</label>
            <input id="routeName" type="text" bind:value={routeName} placeholder="'Best Bakery'" required class="input input-bordered w-full" />
          </div>

          <div>
            <h3 class="text-lg font-bold">Add photo</h3>
            <input 
              id="photo" 
              type="file" 
              bind:files={filesMainPhoto} 
              accept="image/*" 
              required 
              class="input input-bordered w-full" 
              on:change={handlePhotoUpload} 
            />
          </div>

          {#if showCoordinatesInput}
          <h2 class="font-bold">Enter Coordinates Manually</h2>
         
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
          {/if}
          
          <div>
            <label for="Description" class="label">Photo Description</label>
            <textarea id="Description" bind:value={Description} placeholder="'When I was here this happened'" required class="textarea textarea-bordered w-full h-24"></textarea>
          </div>
         
          <button type="submit"  class="btn btn-success w-full mt-3">Next: add quiz question</button>
        </form>

      {:else if currentPage === 'questionSection'}
        <!-- Quiz Question Form -->
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
