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
  let gpsMessage = '';
  let lng = '';
  let showCoordinatesInput = false; 
  let message = '';
  let languages = ['ES','IT','DA','JA']; 
  let closebyDescription = '';
  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

  let filesMainPhoto: FileList | null = null;
  let compressedFile: File | null = null;

  let loading = false;

  let bucketId = '66efdb420000df196b64';
  const collectionId = '66eefaaf001c2777deb9';
  
  /** Function to extract coordinates from EXIF metadata */
  const extractPhotoCoordinates = async (file: File) => {
  try {
    const metadata = await exifr.parse(file, { gps: true });
    console.log('Full EXIF metadata:', metadata);
    if (metadata && metadata.GPSLatitude && metadata.GPSLongitude) {
      lat = metadata.GPSLatitude.toString();
      lng = metadata.GPSLongitude.toString();
      showCoordinatesInput = false;
      
      if (lat && lng) {
  gpsMessage = 'GPS data was successfully loaded from the photo.';
} else {
  gpsMessage = 'Photo has no GPS data. Please enter manually or use current location.';
}

    } else {
      console.warn('No valid GPS data found in metadata.');
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

    // Initialize translations object
    const descriptionTranslations: Record<string, string> = {};
    const closebyDescriptionTranslations: Record<string, string> = {};

    // Loop through selected languages and populate translations
    for (const languageCode of languages) {
      try {
        const translatedDescription = await translateText(Description, languageCode);
        const translatedClosebyDescription = await translateText(closebyDescription, languageCode);

        if (translatedDescription && translatedClosebyDescription) {
          descriptionTranslations[languageCode] = translatedDescription;
          closebyDescriptionTranslations[languageCode] = translatedClosebyDescription;
        }
      } catch (error) {
        console.error(`Translation failed for ${languageCode}:`, error);
      }
    }

    // Include the original English version in translations
    descriptionTranslations['EN'] = Description;
    closebyDescriptionTranslations['EN'] = closebyDescription;

    // Serialize the translations as strings
    const serializedDescription = JSON.stringify(descriptionTranslations);
    const serializedClosebyDescription = JSON.stringify(closebyDescriptionTranslations);

    // Prepare the document data
    const documentData = {
      dateModified: currentDate,
      Route_name: routeName,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      userId: userId || "anonymous",
      photoFileId: mainPhotoFileId,
      Description: serializedDescription, // Store serialized JSON as a string
      closebyDescription: serializedClosebyDescription, // Store serialized JSON as a string
    };

    // Save the document with serialized translations
    await AppwriteService.createDocument(collectionId, documentData, [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ]);

    // Navigate to the confirmation page
    currentPage = 'confirmationPage';
    setTimeout(() => {
      goto('/');
    }, 4000);
  } catch (error) {
    console.error('SubmitQuiz error:', error);
    message = `Failed to create monument and quiz. Error: ${error.message || 'Unknown error'}`;
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
        <form on:submit|preventDefault={submitQuiz} class="space-y-4 max-w-md mx-auto">
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
            
            {#if gpsMessage}
    <p class="text-sm text-gray-600 mt-2">{gpsMessage}</p>
  {/if}
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
            <label for="Description" class="label">Photo introduction</label>
            <textarea id="Description" bind:value={Description} placeholder="'A house build with wood'" required class="textarea textarea-bordered w-full h-24"></textarea>
            
            <label for="closebyDescription" class="label">Description only available close by</label>
            <textarea id="closebyDescription" bind:value={closebyDescription} placeholder="'If you knock three times ill come out with chocolate'" required class="textarea textarea-bordered w-full h-24"></textarea>
            
            
            
          </div>
          
          
         <button type="button" class="btn btn-success w-full mt-3" on:click={submitQuiz}>
  {#if loading}
  <span class="loading loading-spinner"></span> Submitting...
{:else}
  Submit
{/if}
</button>
        </form>

      {:else if currentPage === 'confirmationPage'}
        <!-- Confirmation Page -->
        <div transition:fly={{ x: 200, duration: 300 }} class="space-y-4 max-w-md mx-auto text-center">
          <h2 class="text-2xl font-bold">Success!</h2>
          <p>Your location was submitted successfully</p>
          <p>Redirecting you to the main page...</p>
        </div>
      {/if}
    </div>
  {/key}
</div>
