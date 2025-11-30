<script lang="ts">
  import { DatabaseService } from '$lib/database';
  import { goto } from '$app/navigation';
  import { fly, fade } from 'svelte/transition';
  import { getCurrentLocation } from '$lib/location';
  import exifr from 'exifr'; // Import exifr for EXIF data extraction
  import { compressImage } from '$lib/compress';
  import { toasts } from '$lib/stores/toastStore';
  import Loading from '$lib/components/Loading.svelte';

  import { OCRService } from '$lib/ocrService';
  import { verifyMenuContent, type ValidationResult } from '$lib/menuValidation';
  import { filterMenuItems, getFilterReport } from '$lib/contentFilter';
  import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
  import { Capacitor } from '@capacitor/core';
  import ApiConfig from '$lib/apiConfig';

  // Configuration constants
  const COMPRESSION_QUALITY = 0.7;
  const REDIRECT_DELAY_MS = 2000;

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

  let routeName = '';
  let lat = '';
  let gpsMessage = '';
  let lng = '';
  let showCoordinatesInput = false; 
  let message = '';
  let languages = ['ES','IT','DA','JA']; 
  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
  
  // Menu editor variables
  let showMenuItemEditor = false;
  let editableMenuItems: MenuItem[] = [];

  let filesMainPhoto: FileList | null = null;
  let compressedFile: File | null = null;
  let photoPreviewUrl: string | null = null;
  let photoFileId: string | null = null;
  let ocrProcessing = false;
  interface MenuItem {
    name: string;
    price?: string;
    description?: string;
    category?: string;
    id?: string; // Add stable ID for menu items
  }

  interface OCRResult {
    menuItems: MenuItem[];
    rawText?: string;
    restaurantName?: string;
    enhancedStructure?: any;
    debug?: any;
  }

  let ocrResult: OCRResult | null = null;
  let ocrError = null;
  let isProcessing = false;

  let loading = false;
  let uploadProgress = 0;

  let bucketId = 'photos';
  const tableName = 'restaurants';
  
  let currentPage = 'beginSection';
  const userId = 'local-user';

  // Platform detection
  const isMobile = Capacitor.isNativePlatform();
  const isWeb = !isMobile;

  /** Function to extract coordinates from EXIF metadata */
  const extractPhotoCoordinates = async (file: File) => {
    try {
      const metadata = await exifr.parse(file, { gps: true });
      if (metadata && metadata.GPSLatitude && metadata.GPSLongitude) {
        // Ensure we have valid numeric values
        const validLat = !isNaN(parseFloat(metadata.GPSLatitude.toString()));
        const validLng = !isNaN(parseFloat(metadata.GPSLongitude.toString()));
        
        if (validLat && validLng) {
          lat = metadata.GPSLatitude.toString();
          lng = metadata.GPSLongitude.toString();
          showCoordinatesInput = false;
          gpsMessage = 'GPS data was successfully loaded from the photo.';
        } else {
          console.warn('Invalid GPS data format in metadata.');
          showCoordinatesInput = true;
          gpsMessage = 'Invalid GPS data format in photo. Please enter location manually.';
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

  /**
   * Validate uploaded file type and size
   * Returns true if valid, throws error if invalid
   */
  const validateFile = (file: File): boolean => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new Error(`Invalid file type. Only JPG, PNG, and WebP images are allowed. Your file: ${file.type || extension}`);
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(`File size too large (${sizeMB}MB). Maximum allowed size is ${maxSizeMB}MB.`);
    }

    // Check file size minimum (avoid empty files)
    if (file.size < 1024) {
      throw new Error('File size too small. Please upload a valid image file.');
    }

    return true;
  };

  /**
   * Capture photo using native camera (mobile only)
   * Opens the device camera, captures a photo, and converts it to a File object
   */
  const capturePhotoWithCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false
      });

      // Convert photo to blob
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();

      // Create a File object from the blob
      const file = new File([blob], 'menu-photo.jpg', { type: 'image/jpeg' });

      // Create a FileList-like object to maintain compatibility with existing code
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      filesMainPhoto = dataTransfer.files;

      // Process the photo using existing upload handler
      await handlePhotoUpload();
    } catch (error) {
      console.error('Camera error:', error);
      if (error.message !== 'User cancelled photos app') {
        toasts.error('Camera error: ' + error.message);
      }
    }
  };

  /**
   * Handle photo upload and compression
   * Processes the uploaded photo, extracts GPS coordinates if available, compresses the image, and initiates OCR
   */
  const handlePhotoUpload = async () => {
    if (filesMainPhoto && filesMainPhoto[0]) {
      try {
        // Validate file before processing
        validateFile(filesMainPhoto[0]);

        // Create a preview URL for the image
        photoPreviewUrl = URL.createObjectURL(filesMainPhoto[0]);

        // Extract coordinates from photo if available
        await extractPhotoCoordinates(filesMainPhoto[0]);

        // Compress the image
        compressedFile = await compressImage(filesMainPhoto[0], COMPRESSION_QUALITY);

        // Process the image with OCR
        await processImageWithOCR();
      } catch (error) {
        console.error('Error processing photo:', error);
        toasts.error('Error processing photo: ' + error.message);

        // Clear the file input on validation error
        if (error.message.includes('Invalid file type') || error.message.includes('File size')) {
          filesMainPhoto = null;
          photoPreviewUrl = null;
          compressedFile = null;
        }
      }
    }
  };

  /**
   * Process the uploaded image with OCR
   * For anonymous users: processes directly via base64
   * For authenticated users: uploads to storage first, then processes
   * Applies menu corrections and initializes editable menu items
   */
  const processImageWithOCR = async () => {
    if (!compressedFile && !filesMainPhoto?.[0]) {
      return;
    }
    
    try {
      ocrProcessing = true;
      isProcessing = true;
      ocrError = null;
      ocrResult = null;
   
      
      // Upload the file and process via storage
      const fileToUpload = compressedFile || filesMainPhoto?.[0];

      const uploadResponse = await DatabaseService.uploadFile(fileToUpload, bucketId);

      // Store the file ID for feedback collection
      photoFileId = uploadResponse.path;

      // Process the image with OCR
      ocrResult = await OCRService.processMenuImage(uploadResponse.path, bucketId);
      
      // Initialize editable menu items with the OCR results
      if (ocrResult && ocrResult.menuItems) {
        const itemsWithIds = JSON.parse(JSON.stringify(ocrResult.menuItems));
        
        // Ensure each menu item has a stable ID
        itemsWithIds.forEach((item: MenuItem) => {
          if (!item.id) {
            item.id = `item-${Math.random().toString(36).substring(2, 9)}`;
          }
        });
        
        editableMenuItems = itemsWithIds;
      }
      
      // Autofill restaurant name if available
      if (ocrResult && ocrResult.restaurantName) {
        // Check if we have a valid restaurant name
        if (ocrResult.restaurantName !== "Unknown Restaurant") {
          // Handle multiple possible names (separated by OR)
          if (ocrResult.restaurantName.includes(" OR ")) {
            const possibleNames = ocrResult.restaurantName.split(" OR ");
            // Use the first name as default
            routeName = possibleNames[0].trim();
            toasts.info(`Multiple possible restaurant names detected. Using "${routeName}"`);
          } else {
            routeName = ocrResult.restaurantName;
            toasts.info(`Restaurant name "${routeName}" detected from menu image`);
          }
        }
      }

      // Show extraction success
      if (ocrResult && ocrResult.rawText) {
        if (ocrResult.debug) {
          const debug = ocrResult.debug;

          if (debug.model) {
            // Get quality indicator based on extracted items
            const qualityIndicator = debug.extractedItems > 15 ? 'excellent' :
                                    debug.extractedItems > 10 ? 'good' :
                                    debug.extractedItems > 5 ? 'fair' : 'basic';

            toasts.success(
              `Menu text extracted successfully! ` +
              `(${qualityIndicator} quality, ${debug.extractedItems} items found)`
            );
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
      
      // If we have a partial result, notify the user
      if (ocrResult && ocrResult.rawText && ocrResult.rawText.length > 20) {
        toasts.info('Partial text was extracted from the menu image.');
      }
    } finally {
      ocrProcessing = false;
      isProcessing = false;
    }
  };

  /**
   * Add a new empty menu item to the editable items list
   */
  const addMenuItem = () => {
    editableMenuItems = [
      ...editableMenuItems,
      {
        name: "",
        price: "",
        description: "",
        category: ""
      }
    ];
  };
  
  /**
   * Remove a menu item from the editable items list
   * @param index The index of the item to remove
   */
  const removeMenuItem = (index: number) => {
    editableMenuItems = editableMenuItems.filter((_, i) => i !== index);
  };
  
  /**
   * Save edited menu items and store feedback for learning
   * Updates the OCR result with user corrections and saves feedback to database for ML improvement
   * Only authenticated users have their feedback stored
   */
  const saveEditedMenuItems = async () => {
    if (ocrResult) {
      // Store the original menu items before updating
      const originalMenuItems = JSON.parse(JSON.stringify(ocrResult.menuItems));
      
      // Update the OCR result with edited items
      // Force a complete refresh of the component by creating a new object
      // Ensure each menu item has a stable ID
      const updatedMenuItems = JSON.parse(JSON.stringify(editableMenuItems));
      
      // Add stable IDs for any items that don't have them
      updatedMenuItems.forEach((item: MenuItem) => {
        if (!item.id) {
          item.id = `item-${Math.random().toString(36).substring(2, 9)}`;
        }
      });
      
      ocrResult = {
        ...ocrResult,
        menuItems: updatedMenuItems
      };
      
      // Store the feedback for learning purposes
      try {
        // Create a feedback document with original and corrected data
        await DatabaseService.createDocument('menu_ocr_feedback', {
          original_items: JSON.stringify(originalMenuItems),
          corrected_items: JSON.stringify(editableMenuItems),
          raw_text: ocrResult.rawText,
          restaurant_name: routeName,
          image_id: photoFileId || '',
          user_id: userId,
          timestamp: new Date().toISOString(),
          menu_structure: ocrResult.enhancedStructure ? JSON.stringify(ocrResult.enhancedStructure) : null
        });
        toasts.success("Menu items updated successfully. Your edits will help improve future menu recognition");
      } catch (error) {
        console.error('Failed to save menu OCR feedback:', error);
        // Still update the UI even if feedback saving fails
        toasts.success("Menu items updated successfully");
      }
      
      showMenuItemEditor = false;
    }
  };

  /**
   * Upload the main photo to Supabase storage
   * @returns The file path/ID in storage, or null if upload fails
   */
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
      // Upload the file to Supabase Storage
      const response = await DatabaseService.uploadFile(fileToUpload, bucketId);
      return response.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      toasts.error('Error uploading file: ' + error.message);
      return null;
    }
  };

  /**
   * Validate that the OCR results contain actual menu items
   * Checks minimum item count, price information, and quality indicators
   * @returns True if the data likely represents a menu, false otherwise
   */
  const validateMenuItems = () => {
    // If no OCR result, we can't validate
    if (!ocrResult || !ocrResult.menuItems || ocrResult.menuItems.length === 0) {
      toasts.error('No menu items detected. Please try with a clearer menu image.');
      return false;
    }

    // 1. CRITICAL: Content filtering - check for profanity and PII
    const filterResult = filterMenuItems(ocrResult.menuItems);

    if (filterResult.hasErrors) {
      const profanityIssues = filterResult.results
        .flatMap(r => r.issues.profanity)
        .filter((v, i, a) => a.indexOf(v) === i); // unique

      if (profanityIssues.length > 0) {
        toasts.error(`Inappropriate content detected. Menu cannot be uploaded.`);
        return false;
      }
    }

    if (filterResult.hasWarnings) {
      const piiIssues = filterResult.results
        .flatMap(r => r.issues.pii)
        .filter((v, i, a) => a.indexOf(v) === i); // unique

      if (piiIssues.length > 0) {
        toasts.warning(`Personal information detected and removed: ${piiIssues.join(', ')}`);
      }
    }

    // 2. HIGH: Menu content verification
    const validation = verifyMenuContent(filterResult.filtered);

    if (!validation.isValid) {
      const errorMsg = validation.errors.length > 0
        ? validation.errors[0]
        : 'Content does not appear to be a restaurant menu';
      toasts.error(errorMsg);
      return false;
    }

    // 3. Show warnings but allow upload (moderate strictness)
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        toasts.warning(warning);
      });
    }

    // 4. Update ocrResult with sanitized content
    ocrResult.menuItems = filterResult.filtered;

    return true;
  };
  
  /**
   * Submit the menu data to the database
   * Validates menu items, uploads photo (for authenticated users), and creates database entry
   */
  const submitQuiz = async () => {
    try {
      // First validate if the extracted content is likely a menu
      if (!validateMenuItems()) {
        return;
      }
      
      // Validate lat and lng values
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      
      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        toasts.error('Invalid location coordinates. Please enter valid latitude and longitude values.');
        showCoordinatesInput = true;
        return;
      }
      
      loading = true;

      // Upload the photo to storage
      let mainPhotoFileId = await uploadMainPhoto();
      if (!mainPhotoFileId) {
        toasts.error('Failed to upload photo');
        loading = false;
        return;
      }
      
      // Create the document in the database
      const documentData: Record<string, any> = {
        user_id: userId,
        route_name: routeName,
        lat: parsedLat,
        lng: parsedLng,
        date_modified: currentDate,
        photo_file_id: mainPhotoFileId
      };
      
      // Add OCR data if available
      if (ocrResult && ocrResult.menuItems) {
        // Format menu items to ensure they're separatable
        const structuredMenuItems = ocrResult.menuItems.map(item => ({
          name: item.name || '',
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'Uncategorized'
        }));
        
        // Add OCR data to the document
        documentData.ocrdata = JSON.stringify(structuredMenuItems);
      }
      
      const response = await DatabaseService.createDocument(tableName, documentData);

      toasts.success('Menu uploaded successfully!');
      
      // Show confirmation page and redirect after a delay
      currentPage = 'confirmationPage';
      setTimeout(() => {
        goto('/');
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      console.error('Error creating document:', error);
      toasts.error('Error saving menu: ' + error.message);
    } finally {
      loading = false;
    }
  };

  /**
   * Fetch the user's current location using the browser's geolocation API
   */
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

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
  <div class="container mx-auto px-4 py-8">
  {#key currentPage}
    {#if currentPage === 'beginSection'}
      <div in:fly={{ y: 20, duration: 300 }} class="max-w-2xl mx-auto">
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20">
          <div class="mb-6">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Add Menu Content</h1>
            <p class="text-gray-600">Upload your menu photo and we'll extract the content using OCR technology.</p>
          </div>
          
          <div class="space-y-6">
            <div>
              <label for="routeName" class="block text-sm font-medium text-gray-700 mb-1">Name of Place</label>
              <input 
                id="routeName" 
                type="text" 
                bind:value={routeName} 
                placeholder="e.g. Joe's Italian Bistro" 
                required 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
              {#if ocrResult && ocrResult.restaurantName && ocrResult.restaurantName !== "Unknown Restaurant"}
                {#if ocrResult.restaurantName.includes(" OR ")}
                  <p class="text-xs text-gray-600 mt-1">Multiple possible names detected from menu</p>
                {:else if routeName === ocrResult.restaurantName}
                  <p class="text-xs text-gray-600 mt-1">Name detected from menu image</p>
                {/if}
              {/if}
            </div>
            
            <div class="space-y-2">
              <label for="mainPhoto" class="block text-sm font-medium text-gray-700 mb-1">Menu Photo</label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                {#if isMobile}
                  <!-- Mobile: Camera button -->
                  <button
                    type="button"
                    on:click={capturePhotoWithCamera}
                    class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                    </svg>
                    <span>Take Photo</span>
                  </button>
                  <p class="text-xs text-gray-500 mt-2">Opens your device camera to capture a menu photo</p>
                {:else}
                  <!-- Web: File input -->
                  <input
                    id="mainPhoto"
                    type="file"
                    accept="image/*"
                    bind:files={filesMainPhoto}
                    on:change={handlePhotoUpload}
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                  />
                  <p class="text-xs text-gray-500 mt-1">Upload a clear photo of the menu.</p>
                {/if}
                
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
                      Using advanced OCR for text extraction
                    </div>
                    <div class="ml-2 group relative">
                      <span class="text-gray-500 cursor-help">ⓘ</span>
                      <div class="absolute bottom-full mb-2 left-0 transform -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-64 shadow-lg">
                        Our OCR service uses a powerful document AI model that extracts text from images with high accuracy.
                      </div>
                    </div>
                  </div>
                  
                  <!-- OCR Button -->
                  <button 
                    on:click={processImageWithOCR} 
                    class="mt-3 w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
                    disabled={ocrProcessing}
                  >
                    {#if ocrProcessing}
                      <Loading size="sm" color="white" />
                      <span class="ml-2">Processing with OCR service...</span>
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
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
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
                      class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    />
                  </div>
                </div>
                
                <button 
                  type="button" 
                  class="w-full flex items-center justify-center py-2 px-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
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
            

            
            {#if ocrResult}
              <div class="ocr-results">
                <h3 class="text-xl font-semibold mb-4">OCR Results</h3>
                
                {#if ocrResult.menuItems && ocrResult.menuItems.length > 0}
                  <div class="menu-items">
                    <h4 class="text-lg font-semibold mb-3">Menu Items:</h4>
                    
                    <!-- Add button to edit menu items -->
                    <button
                      type="button"
                      class="text-gray-600 font-bold text-sm inline-flex items-center mb-4 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-full transition-all"
                      on:click={() => {
                        // Copy OCR result items to editable items
                        if (ocrResult && ocrResult.menuItems) {
                          editableMenuItems = JSON.parse(JSON.stringify(ocrResult.menuItems));
                          showMenuItemEditor = true;
                        }
                      }}
                    >
                      <i class="fas fa-edit mr-2"></i> Edit Menu Items
                    </button>
                    
                    <!-- Categories and their items -->
                    {#each [...new Set(ocrResult.menuItems.map(item => item.category))] as category}
                      {#if category}
                        <div class="mb-4">
                          <h5 class="text-md font-semibold text-gray-700 mb-2">{category}</h5>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#each ocrResult.menuItems.filter(item => item.category === category && item.name) as item}
                              {@const itemId = item.id || `item-${Math.random().toString(36).substring(2, 9)}`}
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
                                      <span class="item-price text-gray-600 font-semibold">{item.price}</span>
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
                
             
              </div>
            {/if}
            
            <button 
              type="button" 
              class="w-full flex items-center justify-center py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
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
                <i class="fas fa-plus-circle mr-2"></i> Add Menu Content
              {/if}
            </button>
          </div>
        </div>
      </div>
    {:else if currentPage === 'confirmationPage'}
      <div in:fly={{ y: 20, duration: 300 }} class="max-w-md mx-auto text-center">
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-white/20">
          <div class="flex flex-col items-center">
            <div class="bg-gray-100 text-gray-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <i class="fas fa-check text-2xl"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
            <p class="text-gray-600 mb-6">Your menu has been uploaded successfully.</p>
            <p class="text-gray-500">Redirecting you to the home page...</p>
          </div>
        </div>
      </div>
    {/if}
  {/key}
  </div>
</div>

<!-- Menu Item Editor Popup -->
{#if showMenuItemEditor}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
  <div class="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Edit Menu Items</h2>
        <button 
          class="text-gray-500 hover:text-gray-700" 
          on:click={() => showMenuItemEditor = false}
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-6">
        {#if editableMenuItems.length === 0}
          <p class="text-gray-500 italic">No menu items found</p>
        {:else}
          {#each editableMenuItems as item, index}
            <div class="p-4 border border-gray-200 rounded-lg relative">
              <button 
                class="absolute top-3 right-3 text-red-500 hover:text-red-700"
                on:click={() => removeMenuItem(index)}
              >
                <i class="fas fa-trash"></i>
              </button>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for={`item-name-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    id={`item-name-${index}`}
                    type="text" 
                    bind:value={item.name} 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Item name"
                  />
                </div>
                
                <div>
                  <label for={`item-price-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input 
                    id={`item-price-${index}`}
                    type="text" 
                    bind:value={item.price} 
                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="$0.00"
                  />
                </div>
              </div>
              
              <div class="mt-3">
                <label for={`item-category-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input 
                  id={`item-category-${index}`}
                  type="text" 
                  bind:value={item.category} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Appetizers, Main Course, etc."
                />
              </div>
              
              <div class="mt-3">
                <label for={`item-description-${index}`} class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  id={`item-description-${index}`}
                  bind:value={item.description} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                  placeholder="Enter item description"
                ></textarea>
              </div>
            </div>
          {/each}
        {/if}
        
        <div class="flex justify-between mt-6">
          <button
            type="button"
            class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            on:click={addMenuItem}
          >
            <i class="fas fa-plus mr-2"></i> Add New Item
          </button>
          
          <div>
            <button
              type="button"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors mr-3"
              on:click={() => showMenuItemEditor = false}
            >
              Cancel
            </button>
            
            <button
              type="button"
              class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              on:click={saveEditedMenuItems}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
{/if}

<style>
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
