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
  import { OCRService } from '$lib/ocrService'; // Import OCR service
 
  let routeName = '';
  let Description = '';
  let lat = '';
  let gpsMessage = '';
  let lng = '';
  let showCoordinatesInput = false; 
  let message = '';
  let languages = ['ES','IT','DA','JA']; 
  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

  let filesMainPhoto: FileList | null = null;
  let compressedFile: File | null = null;
  let photoPreviewUrl: string | null = null;
  let ocrProcessing = false;
  let ocrData = null;
  let ocrResult = null;
  let ocrError = null;
  let isProcessing = false;
  let debugInfo = null;

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
        
        // Process the image with OCR
        await processImageWithOCR();
      } catch (error) {
        console.error('Error processing photo:', error);
        toasts.error('Error processing photo: ' + error.message);
      }
    }
  };

  /** Process the uploaded image with OCR */
  const processImageWithOCR = async () => {
    if (!compressedFile && !filesMainPhoto?.[0]) {
      return;
    }
    
    try {
      ocrProcessing = true;
      isProcessing = true;
      ocrError = null;
      ocrResult = null;
      debugInfo = null;
      
      // Upload the file temporarily to get a file ID
      const fileToUpload = compressedFile || filesMainPhoto?.[0];
      const fileId = ID.unique();
      
      const uploadResponse = await storage.createFile(
        bucketId,
        fileId,
        fileToUpload,
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );
      
      // Process the image with OCR
      const ocrResultResponse = await OCRService.processMenuImage(fileId, bucketId);
      ocrResult = ocrResultResponse;
      debugInfo = ocrResultResponse.debug;
      
      // If we have OCR data, populate the description field
      if (ocrResultResponse && ocrResultResponse.rawText) {
        Description = ocrResultResponse.rawText.substring(0, 500); // Limit to 500 chars
        
        // Show which model was used and quality metrics
        if (ocrResultResponse.debug) {
          const debug = ocrResultResponse.debug;
          
          if (debug.model) {
            // Get quality indicator based on extracted items
            const qualityIndicator = debug.extractedItems > 15 ? 'excellent' : 
                                    debug.extractedItems > 10 ? 'good' : 
                                    debug.extractedItems > 5 ? 'fair' : 'basic';
            
            toasts.success(
              `Menu text extracted successfully using Mistral OCR! ` +
              `(${qualityIndicator} quality, ${debug.extractedItems} items found)`
            );
            
            // Log additional details for debugging
            console.log(`Mistral OCR Quality Metrics:`, {
              model: debug.model,
              processingTimeMs: debug.processingTimeMs || 'N/A',
              textLength: debug.textLength,
              extractedItems: debug.extractedItems
            });
          } else {
            toasts.success('Menu text extracted successfully!');
          }
        } else {
          toasts.success('Menu text extracted successfully!');
        }
      }
      
    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Display a user-friendly error message
      let errorMessage = error.message || 'Unknown error occurred';
      
      // Add retry suggestion for specific errors
      if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        errorMessage += ' Please try again with a clearer image or smaller file size.';
      }
      
      toasts.error('Error extracting menu text: ' + errorMessage);
      ocrError = errorMessage;
      
      // If we have a partial result, still try to use it
      if (ocrResult && ocrResult.rawText && ocrResult.rawText.length > 20) {
        Description = ocrResult.rawText.substring(0, 500);
        toasts.info('Partial text was extracted. You may need to edit it manually.');
      }
    } finally {
      ocrProcessing = false;
      isProcessing = false;
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
      const documentData = {
        userId: userId,
        Route_name: routeName,
        Description: Description,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        dateModified: currentDate,
        photoFileId: mainPhotoFileId
      };
      
      // Add OCR data if available
      if (ocrData) {
        documentData.ocrdata = JSON.stringify(ocrData);
      }
      
      const response = await databases.createDocument(
        AppwriteService.databaseId,
        collectionId,
        ID.unique(),
        documentData,
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
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Add Restaurant Menu</h1>
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
                  id="mainPhoto" 
                  type="file" 
                  accept="image/*" 
                  bind:files={filesMainPhoto} 
                  on:change={handlePhotoUpload}
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p class="text-xs text-gray-500 mt-1">Upload a clear photo of the menu.</p>
                
                {#if ocrProcessing}
                  <div class="mt-3">
                    <Loading size="sm" />
                    <p class="text-sm text-gray-600 mt-1">Extracting menu text with OCR...</p>
                  </div>
                {/if}
                
                {#if photoPreviewUrl}
                  <div class="mt-3">
                    <img src={photoPreviewUrl} alt="Menu preview" class="max-w-full h-auto rounded-md shadow-sm" />
                  </div>
                  
                  <!-- OCR Info -->
                  <div class="mt-4 flex items-center">
                    <div class="text-sm text-gray-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
                      </svg>
                      Using Mistral OCR for text extraction
                    </div>
                    <div class="ml-2 group relative">
                      <span class="text-gray-500 cursor-help">ⓘ</span>
                      <div class="absolute bottom-full mb-2 left-0 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-64 shadow-lg">
                        Mistral OCR is a powerful document AI model that extracts text from images with high accuracy.
                      </div>
                    </div>
                  </div>
                  
                  <!-- OCR Button -->
                  <button 
                    on:click={processImageWithOCR} 
                    class="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
                    disabled={ocrProcessing}
                  >
                    {#if ocrProcessing}
                      <Loading size="sm" color="white" />
                      <span class="ml-2">Processing with Mistral OCR...</span>
                    {:else}
                      Extract Menu Text
                    {/if}
                  </button>
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
                rows="5" 
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter menu description or let OCR extract it automatically"
              ></textarea>
              {#if ocrData}
                <p class="text-xs text-green-600 mt-1"> Menu text extracted with OCR</p>
              {/if}
            </div>
            
            {#if ocrResult}
              <div class="ocr-results">
                <h3>OCR Results</h3>
                <div class="raw-text">
                  <h4>Raw Text:</h4>
                  <pre>{ocrResult.rawText}</pre>
                </div>
                
                {#if ocrResult.menuItems && ocrResult.menuItems.length > 0}
                  <div class="menu-items">
                    <h4 class="text-lg font-semibold mb-3">Menu Items:</h4>
                    
                    <!-- Categories and their items -->
                    {#each [...new Set(ocrResult.menuItems.map(item => item.category))] as category}
                      {#if category}
                        <div class="mb-4">
                          <h5 class="text-md font-semibold text-gray-700 mb-2">{category}</h5>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#each ocrResult.menuItems.filter(item => item.category === category && item.name) as item}
                              {@const itemId = `item-${Math.random().toString(36).substring(2, 9)}`}
                              <div class="menu-item-box">
                                <button 
                                  class="menu-item-button"
                                  on:click={() => {
                                    const detailsEl = document.getElementById(itemId);
                                    if (detailsEl) {
                                      detailsEl.classList.toggle('hidden');
                                    }
                                  }}
                                >
                                  <div class="flex justify-between items-center w-full">
                                    <span class="item-name font-medium">{item.name}</span>
                                    {#if item.price}
                                      <span class="item-price text-green-600 font-semibold">{item.price}</span>
                                    {/if}
                                  </div>
                                </button>
                                
                                <!-- Hidden details section -->
                                <div id={itemId} class="menu-item-details hidden">
                                  {#if item.description}
                                    <p class="text-gray-600 text-sm mt-1">{item.description}</p>
                                  {/if}
                                  <div class="flex justify-end mt-2">
                                    <button 
                                      class="text-xs text-gray-500 hover:text-gray-700"
                                      on:click={(e) => {
                                        e.stopPropagation();
                                        const detailsEl = document.getElementById(itemId);
                                        if (detailsEl) {
                                          detailsEl.classList.add('hidden');
                                        }
                                      }}
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              </div>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    {/each}
                    
                    <!-- Items without categories -->
                    {#if ocrResult.menuItems.some(item => !item.category && item.name)}
                      <div class="mb-4">
                        <h5 class="text-md font-semibold text-gray-700 mb-2">Other Items</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {#each ocrResult.menuItems.filter(item => !item.category && item.name) as item}
                            {@const itemId = `item-${Math.random().toString(36).substring(2, 9)}`}
                            <div class="menu-item-box">
                              <button 
                                class="menu-item-button"
                                on:click={() => {
                                  const detailsEl = document.getElementById(itemId);
                                  if (detailsEl) {
                                    detailsEl.classList.toggle('hidden');
                                  }
                                }}
                              >
                                <div class="flex justify-between items-center w-full">
                                  <span class="item-name font-medium">{item.name}</span>
                                  {#if item.price}
                                    <span class="item-price text-green-600 font-semibold">{item.price}</span>
                                  {/if}
                                </div>
                              </button>
                              
                              <!-- Hidden details section -->
                              <div id={itemId} class="menu-item-details hidden">
                                {#if item.description}
                                  <p class="text-gray-600 text-sm mt-1">{item.description}</p>
                                {/if}
                                <div class="flex justify-end mt-2">
                                  <button 
                                    class="text-xs text-gray-500 hover:text-gray-700"
                                    on:click={(e) => {
                                      e.stopPropagation();
                                      const detailsEl = document.getElementById(itemId);
                                      if (detailsEl) {
                                        detailsEl.classList.add('hidden');
                                      }
                                    }}
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
                
                {#if debugInfo}
                  <div class="debug-info">
                    <h4>Debug Information:</h4>
                    <details>
                      <summary>Click to expand debug details</summary>
                      <div class="debug-content">
                        <h5>Model: {debugInfo.model || 'Unknown'}</h5>
                        <p>Text length: {debugInfo.textLength || 0} characters</p>
                        <p>Extracted items: {debugInfo.extractedItems || 0}</p>
                        <p>Processing time: {debugInfo.processingTimeMs ? `${debugInfo.processingTimeMs}ms` : 'Unknown'}</p>
                      </div>
                    </details>
                  </div>
                {/if}
              </div>
            {/if}
            
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

<style>
  .debug-info {
    margin-top: 20px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background-color: #f9f9f9;
  }
  
  .debug-content {
    padding: 10px;
  }
  
  .menu-item-box {
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  .menu-item-box:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .menu-item-button {
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    background-color: white;
    transition: background-color 0.2s ease;
  }
  
  .menu-item-button:hover {
    background-color: #f9fafb;
  }
  
  .menu-item-details {
    padding: 0.75rem 1rem;
    border-top: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }
  
  .item-name {
    display: block;
    color: #1f2937;
  }
  
  .item-price {
    white-space: nowrap;
  }
</style>
