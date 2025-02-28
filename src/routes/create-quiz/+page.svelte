<script lang="ts">
  import { databases, storage, ID, Permission, Role } from '$lib/appwrite'; 
  import { goto } from '$app/navigation';
  import { user } from '$lib/userStore';
  import { fly, fade } from 'svelte/transition';
  import { AppwriteService } from '$lib/appwriteService';
  import { getCurrentLocation } from '$lib/location';
  import exifr from 'exifr'; // Import exifr for EXIF data extraction
  import { compressImage } from '$lib/compress'; 
  import { toasts } from '$lib/stores/toastStore';
  import Loading from '$lib/components/Loading.svelte';
  import Card from '$lib/components/Card.svelte';
  import Input from '$lib/components/Input.svelte';
 
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
  let photoPreviewUrl: string | null = null;

  let loading = false;
  let uploadProgress = 0;

  let bucketId = '66efdb420000df196b64';
  const collectionId = '66eefaaf001c2777deb9';
  
  let currentPage = 'beginSection';
  $: userId = $user?.$id || 'anonymous';
  
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
        gpsMessage = 'No location data found in image. Please enter location manually or use current location.';
      }
    } catch (error) {
      console.error("Could not extract coordinates from photo:", error);
      showCoordinatesInput = true;
      gpsMessage = 'Could not read location data from image. Please enter location manually.';
    }
  };

  /** Handle photo upload and compression */
  const handlePhotoUpload = async () => {
    if (filesMainPhoto && filesMainPhoto[0]) {
      try {
        // Create a preview URL for the image
        photoPreviewUrl = URL.createObjectURL(filesMainPhoto[0]);
        
        // Extract coordinates from photo if available
        await extractPhotoCoordinates(filesMainPhoto[0]);
        
        // Compress the image
        compressedFile = await compressImage(filesMainPhoto[0], 0.7);
        console.log('Compressed file size:', compressedFile.size);
      } catch (error) {
        console.error('Error processing photo:', error);
        toasts.error('Error processing photo: ' + error.message);
      }
    }
  };

  /** Function to upload the main photo */
  const uploadMainPhoto = async () => {
    if (!compressedFile && !filesMainPhoto?.[0]) {
      toasts.error('Please select a photo to upload');
      return null;
    }
    
    const fileToUpload = compressedFile || filesMainPhoto?.[0];
    
    if (!fileToUpload) {
      toasts.error('No file available for upload');
      return null;
    }
    
    try {
      // Create a unique file ID
      const fileId = ID.unique();
      
      // Upload the file to Appwrite Storage
      const response = await storage.createFile(
        bucketId,
        fileId,
        fileToUpload,
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ],
        (progress) => {
          uploadProgress = Math.round(progress);
        }
      );
      
      console.log('File uploaded successfully:', response);
      return fileId;
    } catch (error) {
      console.error('Error uploading file:', error);
      toasts.error('Error uploading file: ' + error.message);
      return null;
    }
  };

  /** Submit the quiz */
  const submitQuiz = async () => {
    try {
      loading = true;
      const mainPhotoFileId = await uploadMainPhoto();
      
      if (!mainPhotoFileId) {
        toasts.error('Failed to upload photo');
        loading = false;
        return;
      }
      
      // Create the document in the database
      const response = await databases.createDocument(
        AppwriteService.databaseId,
        collectionId,
        ID.unique(),
        {
          user_id: userId,
          name: routeName,
          description: Description,
          closebyDescription: closebyDescription,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          date_created: currentDate,
          photo_id: mainPhotoFileId
        },
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );
      
      console.log('Document created successfully:', response);
      toasts.success('Menu uploaded successfully!');
      
      // Show confirmation page and redirect after a delay
      currentPage = 'confirmationPage';
      setTimeout(() => {
        goto('/');
      }, 2000);
    } catch (error) {
      console.error('Error creating document:', error);
      toasts.error('Error saving menu: ' + error.message);
    } finally {
      loading = false;
    }
  };

  /** Fetch current location */
  const fetchCurrentLocation = async () => {
    try {
      loading = true;
      const location = await getCurrentLocation();
      lat = location.latitude.toString();
      lng = location.longitude.toString();
      toasts.success('Location retrieved successfully');
      loading = false;
    } catch (error) {
      console.error('Error getting location:', error.message);
      toasts.error('Could not retrieve your location');
      loading = false;
    }
  };
</script>

<div class="container mx-auto px-4 py-8">
  {#key currentPage}
    {#if currentPage === 'beginSection'}
      <div in:fly={{ y: 20, duration: 300 }} class="max-w-2xl mx-auto">
        <Card padding="p-8">
          <div class="mb-6">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Add Menu Items</h1>
            <p class="text-gray-600">Upload your menu photo and we'll extract the content using OCR technology.</p>
          </div>
          
          <div class="space-y-6">
            <div>
              <label for="routeName" class="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
              <input 
                id="routeName" 
                type="text" 
                bind:value={routeName} 
                placeholder="e.g. Joe's Italian Bistro" 
                required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Menu Photo</label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                <input 
                  id="photo" 
                  type="file" 
                  bind:files={filesMainPhoto} 
                  accept="image/*" 
                  required 
                  class="hidden" 
                  on:change={handlePhotoUpload}
                />
                
                {#if photoPreviewUrl}
                  <div class="mb-4">
                    <img src={photoPreviewUrl} alt="Menu preview" class="max-h-64 mx-auto rounded-lg shadow-md" />
                    <button 
                      type="button" 
                      class="mt-2 text-sm text-red-600 hover:text-red-800"
                      on:click={() => {
                        photoPreviewUrl = null;
                        filesMainPhoto = null;
                        compressedFile = null;
                      }}
                    >
                      <i class="fas fa-trash mr-1"></i> Remove photo
                    </button>
                  </div>
                {:else}
                  <label for="photo" class="cursor-pointer">
                    <div class="text-center">
                      <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                      <p class="text-gray-700">Drag and drop your menu photo here or</p>
                      <p class="text-green-600 font-medium">Browse files</p>
                    </div>
                  </label>
                {/if}
              </div>
              
              {#if gpsMessage}
                <p class="text-sm text-gray-600 mt-1 flex items-center">
                  <i class="fas fa-info-circle mr-1 text-blue-500"></i> {gpsMessage}
                </p>
              {/if}
            </div>
            
            {#if showCoordinatesInput}
              <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h2 class="font-semibold text-gray-800 mb-3">Restaurant Location</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label for="lat" class="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input 
                      id="lat" 
                      type="number" 
                      step="any" 
                      bind:value={lat} 
                      placeholder="e.g. 41.8781" 
                      required 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  
                  <div>
                    <label for="lng" class="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input 
                      id="lng" 
                      type="number" 
                      step="any" 
                      bind:value={lng} 
                      placeholder="e.g. -87.6298" 
                      required 
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                <button 
                  type="button" 
                  class="w-full flex items-center justify-center py-2 px-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  on:click={fetchCurrentLocation} 
                  disabled={loading}
                >
                  {#if loading}
                    <Loading size="sm" color="text-blue-700" />
                  {:else}
                    <i class="fas fa-location-arrow mr-2"></i> Use Current Location
                  {/if}
                </button>
              </div>
            {/if}
            
            <div>
              <label for="Description" class="block text-sm font-medium text-gray-700 mb-1">Menu Description</label>
              <textarea 
                id="Description" 
                bind:value={Description} 
                placeholder="Describe the menu and any special offerings" 
                required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-24"
              ></textarea>
            </div>
            
            <div>
              <label for="closebyDescription" class="block text-sm font-medium text-gray-700 mb-1">Special Offers (Only Visible Nearby)</label>
              <textarea 
                id="closebyDescription" 
                bind:value={closebyDescription} 
                placeholder="Enter special offers or promotions only visible to nearby users" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-24"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">This information will only be visible to users who are physically near your restaurant.</p>
            </div>
            
            <button 
              type="button" 
              class="w-full flex items-center justify-center py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              on:click={submitQuiz}
              disabled={loading}
            >
              {#if loading}
                <div class="mr-2">
                  <Loading size="sm" color="text-white" />
                </div>
                {#if uploadProgress > 0 && uploadProgress < 100}
                  Uploading... {uploadProgress}%
                {:else}
                  Saving Menu...
                {/if}
              {:else}
                <i class="fas fa-plus-circle mr-2"></i> Add Menu
              {/if}
            </button>
          </div>
        </Card>
      </div>
    {:else if currentPage === 'confirmationPage'}
      <div in:fly={{ y: 20, duration: 300 }} class="max-w-md mx-auto text-center">
        <Card padding="p-8">
          <div class="flex flex-col items-center">
            <div class="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <i class="fas fa-check text-2xl"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p class="text-gray-600 mb-6">Your menu has been uploaded successfully.</p>
            <p class="text-gray-500">Redirecting you to the home page...</p>
          </div>
        </Card>
      </div>
    {/if}
  {/key}
</div>
