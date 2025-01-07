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


    let selectedLanguage = 'EN'; // Default language is English
    const availableLanguages = [
        { code: 'EN', name: 'English' },
        { code: 'ES', name: 'Spanish' },
        { code: 'IT', name: 'Italian' },
        { code: 'DA', name: 'Danish' },
        { code: 'JA', name: 'Japanese' }
    ];
   
    const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
  
    let filesMainPhoto: FileList | null = null;
    let compressedFile: File | null = null;
  
    let loading = false;
  
    let bucketId = '66efdb420000df196b64';
    const collectionId = '66eefaaf001c2777deb9';
  
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

  
    let photoPreviewUrl: string | null = null; // To store the URL of the uploaded photo
  
    /** Function to extract coordinates from EXIF metadata */
    const extractPhotoCoordinates = async (file: File) => {
      try {
        const metadata = await exifr.parse(file, { gps: true });
        if (metadata && metadata.GPSLatitude && metadata.GPSLongitude) {
          lat = metadata.GPSLatitude.toString();
          lng = metadata.GPSLongitude.toString();
          showCoordinatesInput = false;
          gpsMessage = 'GPS data was successfully loaded from the photo.';
        } else {
          showCoordinatesInput = true;
          gpsMessage = 'Photo has no GPS data. Please enter manually or use current location.';
        }
      } catch (error) {
        console.error("Could not extract coordinates from photo:", error);
        showCoordinatesInput = true;
      }
    };
  
    const handlePhotoUpload = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      filesMainPhoto = input.files;
  
      if (filesMainPhoto && filesMainPhoto[0]) {
        const originalFile = filesMainPhoto[0];
        await extractPhotoCoordinates(originalFile);
  
        if (showCoordinatesInput) {
          const useLocation = confirm("Photo has no GPS data. Would you like to use your current location as the shop location?");
          if (useLocation) {
            await fetchCurrentLocation();
          }
        }
  
        try {
          compressedFile = await compressImage(originalFile);
        } catch (error) {
          message = 'Failed to compress the photo.';
          compressedFile = null;
        }
      }
    };
  
    const uploadMainPhoto = async () => {
      try {
        if (compressedFile) {
          const response = await storage.createFile(bucketId, ID.unique(), compressedFile);
          return response.$id;
        }
      } catch (error) {
        console.error('Failed to upload main photo:', error.message);
        message = `Failed to upload main photo: ${error.message};`
        return null;
      }
    };
  
    const submitQuiz = async () => {
      try {
        loading = true;
        const mainPhotoFileId = await uploadMainPhoto();
        if (!mainPhotoFileId) {
          message = 'Main photo upload failed. Please try again.';
          return;
        }
  
        const descriptionTranslations: Record<string, string> = {};
   
  
        for (const languageCode of languages) {
          try {
            const translatedDescription = await translateText(Description, languageCode);
        
  
            if (translatedDescription) {
              descriptionTranslations[languageCode] = translatedDescription;
            
            }
          } catch (error) {
            console.error(`Translation failed for ${languageCode}:`, error);
          }
        }
  
        descriptionTranslations['EN'] = Description;
  
        const serializedDescription = JSON.stringify(descriptionTranslations);
   
  
        const documentData = {
          dateModified: currentDate,
          Route_name: routeName,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          userId: userId || "anonymous",
          photoFileId: mainPhotoFileId,
          Description: serializedDescription,
          language: selectedLanguage
    
        };
  
        await AppwriteService.createDocument(collectionId, documentData);
  
        currentPage = 'confirmationPage';
        setTimeout(() => {
          goto('/');
        }, 4000);
      } catch (error) {
        console.error('SubmitQuiz error:', error);
        message = `Failed to create monument and quiz. Error: ${error.message || 'Unknown error'}`;
      } finally {
        loading = false;
      }
    };
  
    const fetchCurrentLocation = async () => {
      try {
        loading = true;
        const location = await getCurrentLocation();
        lat = location.latitude.toString();
        lng = location.longitude.toString();
        loading = false;
      } catch (error) {
        console.error('Error getting location:', error.message);
        message = 'Could not retrieve your location.';
        loading = false;
      }
    };
  
    const goToPhotoPreview = () => {
      if (filesMainPhoto && filesMainPhoto[0]) {
        const file = filesMainPhoto[0];
        photoPreviewUrl = URL.createObjectURL(file);
        currentPage = 'photoPreviewPage';
      }
    };
  </script>
  
  <div class="pt-20">
    {#key currentPage}
      <div transition:fly={{ x: 200, duration: 300 }} class="space-y-4 max-w-md mx-auto">
        {#if currentPage === 'beginSection'}
          <!-- First Section (Monument Form) -->
          <h1 class="text-2xl font-bold mb-4 text-center">Add Your Menu to MenuMaps</h1>
          <form on:submit|preventDefault={submitQuiz} class="space-y-4">
            <div class="form-control">
              <label for="routeName" class="label">Name of Place</label>
              <input id="routeName" type="text" bind:value={routeName} placeholder="'Best Bakery'" required class="input input-bordered w-full" />
            </div>
  
            <div class="form-control">
              <label for="photo" class="label">Add Menu Photo</label>
              <input 
                id="photo" 
                type="file" 
                bind:files={filesMainPhoto} 
                accept="image/*" 
                required 
                class="file-input file-input-bordered w-full" 
                on:change={handlePhotoUpload} 
              />
              {#if gpsMessage}
                <p class="text-sm text-gray-600 mt-2">{gpsMessage}</p>
              {/if}
            </div>
            
            {#if showCoordinatesInput}
              <div class="form-control">
                <h2 class="font-bold">Enter Coordinates Manually</h2>
                <label for="lat" class="label">Latitude</label>
                <input id="lat" type="number" step="any" bind:value={lat} placeholder="Enter Latitude" required class="input input-bordered w-full" />
                <label for="lng" class="label">Longitude</label>
                <input id="lng" type="number" step="any" bind:value={lng} placeholder="Enter Longitude" required class="input input-bordered w-full" />
                <button type="button" class="btn btn-outline w-full mt-2" on:click={fetchCurrentLocation} disabled={loading}>
                  {#if loading}
                    <span class="loading loading-spinner"></span> Loading...
                  {:else}
                    Use Current Location
                  {/if}
                </button>
              </div>
            {/if}
            <div class="form-control">
              <label for="language" class="label">Menu Language</label>
              <select id="language" bind:value={selectedLanguage} class="select select-bordered w-full">
                  {#each availableLanguages as language}
                      <option value={language.code}>{language.name}</option>
                  {/each}
              </select>
          </div>
            <div class="form-control">
              <label for="Description" class="label">Menu Description</label>
              <textarea id="Description" bind:value={Description} placeholder="'Build your own salad'" required class="textarea textarea-bordered w-full h-24"></textarea>
            </div>
  
            <button type="button" class="btn btn-primary w-full mt-3" on:click={goToPhotoPreview}>
              Next
            </button>
          </form>
  
          {:else if currentPage === 'photoPreviewPage'}
          <!-- Photo Preview Page -->
          <div transition:fly={{ x: 200, duration: 300 }} class="space-y-4 max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold">Menu Preview</h2>
            {#if photoPreviewUrl}
              <img src={photoPreviewUrl} alt="Uploaded Photo" class="w-full h-auto rounded-lg shadow-md" />
            {/if}

            <!-- Add User ID Input Field -->
            <div class="form-control">
              <label for="userId" class="label">User ID</label>
              <input 
                id="userId" 
                type="text" 
                bind:value={userId} 
                placeholder="Enter a secret user ID" 
                required 
                class="input input-bordered w-full" 
              />
              <p class="text-sm text-gray-600 mt-2">Add a secret user ID to be able to edit your menu later.</p>
            </div>

            <button type="button" class="btn btn-primary w-full mt-3" on:click={submitQuiz}>
              {#if loading}
                <span class="loading loading-spinner"></span> Submitting...
              {:else}
                Submit
              {/if}
            </button>
            <button type="button" class="btn btn-outline w-full mt-3" on:click={() => currentPage = 'beginSection'}>
              Go Back
            </button>
          </div> {:else if currentPage === 'photoPreviewPage'}
          <!-- Photo Preview Page -->
          <div transition:fly={{ x: 200, duration: 300 }} class="space-y-4 max-w-md mx-auto text-center">
            <h2 class="text-2xl font-bold">Menu Preview</h2>
            {#if photoPreviewUrl}
              <img src={photoPreviewUrl} alt="Uploaded Photo" class="w-full h-auto rounded-lg shadow-md" />
            {/if}

            <!-- Add User ID Input Field -->
            <div class="form-control">
              <label for="userId" class="label">User ID</label>
              <input 
                id="userId" 
                type="text" 
                bind:value={userId} 
                placeholder="Enter a secret user ID" 
                required 
                class="input input-bordered w-full" 
              />
              <p class="text-sm text-gray-600 mt-2">Add a secret user ID to be able to edit your menu later.</p>
            </div>

            <button type="button" class="btn btn-primary w-full mt-3" on:click={submitQuiz}>
              {#if loading}
                <span class="loading loading-spinner"></span> Submitting...
              {:else}
                Submit
              {/if}
            </button>
            <button type="button" class="btn btn-outline w-full mt-3" on:click={() => currentPage = 'beginSection'}>
              Go Back
            </button>
          </div>
  
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