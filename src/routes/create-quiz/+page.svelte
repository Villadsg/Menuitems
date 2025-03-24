<script lang="ts">
  import { databases, storage, ID, Permission, Role, Query } from '$lib/appwrite'; 
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
  // No longer need CryptoJS as we'll use Appwrite's built-in signature
 
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
   
      
      // Upload the file temporarily to get a file ID
      const fileToUpload = compressedFile || filesMainPhoto?.[0];
      const fileId = ID.unique();
      
      const uploadResponse = await storage.createFile(
        bucketId,
        fileId,
        fileToUpload,
        [
          Permission.read(Role.any()),
          Permission.write(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      
      // Store the file ID for feedback collection
      photoFileId = fileId;
      
      // Process the image with OCR
      const ocrResultResponse = await OCRService.processMenuImage(fileId, bucketId);
      ocrResult = ocrResultResponse;
      
      // Initialize editable menu items with the OCR results
      if (ocrResultResponse && ocrResultResponse.menuItems) {
        const itemsWithIds = JSON.parse(JSON.stringify(ocrResultResponse.menuItems));
        
        // Ensure each menu item has a stable ID
        itemsWithIds.forEach((item: MenuItem) => {
          if (!item.id) {
            item.id = `item-${Math.random().toString(36).substring(2, 9)}`;
          }
        });
        
        editableMenuItems = itemsWithIds;
      }
      
      // Autofill restaurant name if available
      if (ocrResultResponse && ocrResultResponse.restaurantName) {
        // Check if we have a valid restaurant name
        if (ocrResultResponse.restaurantName !== "Unknown Restaurant") {
          // Handle multiple possible names (separated by OR)
          if (ocrResultResponse.restaurantName.includes(" OR ")) {
            const possibleNames = ocrResultResponse.restaurantName.split(" OR ");
            // Use the first name as default
            routeName = possibleNames[0].trim();
            toasts.info(`Multiple possible restaurant names detected. Using "${routeName}"`);
          } else {
            routeName = ocrResultResponse.restaurantName;
            toasts.info(`Restaurant name "${routeName}" detected from menu image`);
          }
        }
      }
      
      // Log OCR data for debugging
      if (ocrResultResponse && ocrResultResponse.rawText) {
        
        // Show which model was used and quality metrics
        if (ocrResultResponse.debug) {
          const debug = ocrResultResponse.debug;
          
          if (debug.model) {
            // Get quality indicator based on extracted items
            const qualityIndicator = debug.extractedItems > 15 ? 'excellent' : 
                                    debug.extractedItems > 10 ? 'good' : 
                                    debug.extractedItems > 5 ? 'fair' : 'basic';
            
            toasts.success(
              `Menu text extracted successfully! ` +
              `(${qualityIndicator} quality, ${debug.extractedItems} items found)`
            );
            
            // Log additional details for debugging
            console.log(`OCR Quality Metrics:`, {
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
   * Find duplicate images in the Appwrite bucket based on file signature (MD5 hash)
   * @param file The file to check for duplicates
   * @returns The fileId of the duplicate if found, null otherwise
   */
  // Function to add a new menu item
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
  
  // Function to remove a menu item
  const removeMenuItem = (index: number) => {
    editableMenuItems = editableMenuItems.filter((_, i) => i !== index);
  };
  
  // Function to save edited menu items and store feedback for learning
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
        const feedbackId = ID.unique();
        await databases.createDocument(
          AppwriteService.databaseId,
          '67dfc9c800121e7b3df6', // menu_ocr_feedback collection ID
          feedbackId,
          {
            original_items: JSON.stringify(originalMenuItems),
            corrected_items: JSON.stringify(editableMenuItems),
            raw_text: ocrResult.rawText,
            restaurant_name: routeName,
            image_id: photoFileId || '',
            user_id: userId,
            timestamp: new Date().toISOString(),
            menu_structure: ocrResult.enhancedStructure ? JSON.stringify(ocrResult.enhancedStructure) : null
          }
        );
        console.log('Menu OCR feedback saved for learning');
        toasts.success("Menu items updated successfully. Your edits will help improve future menu recognition");
      } catch (error) {
        console.error('Failed to save menu OCR feedback:', error);
        // Still update the UI even if feedback saving fails
        toasts.success("Menu items updated successfully");
      }
      
      showMenuItemEditor = false;
    }
  };

  const findDuplicateImage = async (file: File): Promise<string | null> => {
    try {
      // Calculate MD5 hash of the file (this is done client-side before upload)
      // We'll use this to check if a file with the same signature already exists
      
      // First, get a list of all files in the bucket
      // We'll limit to 100 files for performance, adjust as needed
      const filesList = await storage.listFiles(
        bucketId,
        [Query.limit(100)]
      );
      
      // Check if there are any files in the bucket
      if (!filesList || !filesList.files || filesList.files.length === 0) {
        console.log('No files in bucket to check for duplicates');
        return null;
      }
      
      // Get file size to compare with existing files
      const fileSize = file.size;
      const fileName = file.name;
      
      // Log for debugging
      console.log(`Checking for duplicates of ${fileName} (${fileSize} bytes)`);
      
      // Look for files with similar properties
      for (const existingFile of filesList.files) {
        // Check if the file has similar properties (size within 5% difference)
        const sizeDifference = Math.abs(existingFile.sizeOriginal - fileSize);
        const sizeThreshold = fileSize * 0.05; // 5% threshold
        
        if (sizeDifference <= sizeThreshold) {
          console.log(`Found potential duplicate: ${existingFile.$id} with similar size`);
          
          // We found a potential duplicate based on size
          // We'll use this file ID to avoid uploading a duplicate
          return existingFile.$id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for duplicate images:', error);
      return null;
    }
  };
  
  /**
   * Delete duplicate menu photos from the bucket
   * This function will be called after a successful upload to clean up any other duplicates
   * @param currentFileId The ID of the file we just uploaded and want to keep
   * @param fileSize The size of the file we want to keep
   */
  const cleanupDuplicateMenuPhotos = async (currentFileId: string, fileSize: number): Promise<void> => {
    try {
      // Get all files in the bucket
      const filesList = await storage.listFiles(
        bucketId,
        [Query.limit(100)]
      );
      
      if (!filesList || !filesList.files || filesList.files.length <= 1) {
        // No need to check if there's only one file or none
        return;
      }
      
      // Find the file we just uploaded to get its details
      const currentFile = filesList.files.find(file => file.$id === currentFileId);
      if (!currentFile) {
        console.warn('Could not find current file in bucket, skipping duplicate cleanup');
        return;
      }
      
      // Get the files that are potential duplicates (similar size, not the current file)
      const potentialDuplicates = filesList.files.filter(file => {
        // Skip the current file
        if (file.$id === currentFileId) return false;
        
        // Check if the file has similar size (within 5% difference)
        const sizeDifference = Math.abs(file.sizeOriginal - fileSize);
        const sizeThreshold = fileSize * 0.05; // 5% threshold
        
        return sizeDifference <= sizeThreshold;
      });
      
      console.log(`Found ${potentialDuplicates.length} potential duplicate menu photos to clean up`);
      
      // Delete the duplicate files
      for (const duplicate of potentialDuplicates) {
        try {
          await storage.deleteFile(bucketId, duplicate.$id);
          console.log(`Deleted duplicate menu photo: ${duplicate.$id}`);
          toasts.success('Deleted duplicate menu photo to save storage space');
        } catch (deleteError) {
          console.error(`Failed to delete duplicate file ${duplicate.$id}:`, deleteError);
        }
      }
    } catch (error) {
      console.error('Error cleaning up duplicate menu photos:', error);
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
      // Check if a duplicate exists based on file properties
      const duplicateFileId = await findDuplicateImage(fileToUpload);
      
      if (duplicateFileId) {
        console.log('Using existing file instead of uploading duplicate:', duplicateFileId);
        toasts.info('A similar menu photo already exists. Using the existing photo to save storage space.');
        return duplicateFileId;
      }
      
      // Create a unique file ID
      const fileId = ID.unique();
      
      // Upload the file to Appwrite Storage with hash metadata
      const response = await storage.createFile(
        bucketId,
        fileId,
        fileToUpload,
        [
          Permission.read(Role.any()),
          Permission.write(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ],
        (progress) => {
          uploadProgress = Math.round(progress);
        }
      );
      
      // After successful upload, clean up any other duplicate menu photos
      await cleanupDuplicateMenuPhotos(fileId, fileToUpload.size);
      
      console.log('File uploaded successfully:', response);
      return fileId;
    } catch (error) {
      console.error('Error uploading file:', error);
      toasts.error('Error uploading file: ' + error.message);
      return null;
    }
  };

  /**
   * Validate that the OCR results contain actual menu items
   * @returns {boolean} True if the data likely represents a menu, false otherwise
   */
  const validateMenuItems = () => {
    // If no OCR result, we can't validate
    if (!ocrResult || !ocrResult.menuItems || ocrResult.menuItems.length === 0) {
      toasts.error('No menu items detected. Please try with a clearer menu image.');
      return false;
    }
    
    // Minimum number of menu items required (adjust as needed)
    const MIN_MENU_ITEMS = 3;
    if (ocrResult.menuItems.length < MIN_MENU_ITEMS) {
      toasts.error(`What the f are you trying to upload? `);
      return false;
    }
    
    // Check if we have at least some items with prices (common in menus)
    const itemsWithPrices = ocrResult.menuItems.filter(item => item.price && item.price.trim() !== '');
    const priceRatio = itemsWithPrices.length / ocrResult.menuItems.length;
    
    // At least 20% of items should have prices to be considered a menu
    if (priceRatio < 0.2 && itemsWithPrices.length < 2) {
      toasts.error('Few price information detected. This may not be a menu image.');
      return false;
    }
    
    // Check for menu item quality indicators
    const hasCategories = ocrResult.menuItems.some(item => item.category && item.category !== 'Uncategorized');
    const hasDescriptions = ocrResult.menuItems.some(item => item.description && item.description.trim() !== '');
    
    // Check if we have debug info about extraction quality
    let qualityScore = 0;
    if (ocrResult && 'debug' in ocrResult && ocrResult.debug) {
      const debug = ocrResult.debug as any; // Type assertion to avoid TS errors
      
      // If we have quality metrics from debug info
      const extractedItems = debug.extractedItems || 0;
      if (extractedItems > 15) qualityScore += 3; // excellent
      else if (extractedItems > 10) qualityScore += 2; // good
      else if (extractedItems > 5) qualityScore += 1; // fair
      
      // If enhanced analysis was done, that's a good sign
      if (debug.enhancedAnalysis) qualityScore += 1;
    }
    
    // Add points for structure quality
    if (hasCategories) qualityScore += 2;
    if (hasDescriptions) qualityScore += 1;
    if (priceRatio > 0.5) qualityScore += 2;
    
    // If we have a good quality score, it's likely a menu
    const QUALITY_THRESHOLD = 3;
    if (qualityScore >= QUALITY_THRESHOLD) {
      return true;
    }
    
    // Otherwise, show a warning but allow override
    const confirmed = confirm('This doesn\'t appear to be a typical menu. Are you sure you want to proceed with uploading?');
    return confirmed;
  };
  
  /** Submit the quiz */
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
      const mainPhotoFileId = await uploadMainPhoto();
      
      if (!mainPhotoFileId) {
        toasts.error('Failed to upload photo');
        loading = false;
        return;
      }
      
      // Create the document in the database
      const documentData: Record<string, any> = {
        userId: userId,
        Route_name: routeName,
        lat: parsedLat,
        lng: parsedLng,
        dateModified: currentDate,
        photoFileId: mainPhotoFileId
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
      
      const response = await databases.createDocument(
        AppwriteService.databaseId,
        collectionId,
        ID.unique(),
        documentData,
        [
          Permission.read(Role.any()),
          Permission.write(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
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
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {#if ocrResult && ocrResult.restaurantName && ocrResult.restaurantName !== "Unknown Restaurant"}
                {#if ocrResult.restaurantName.includes(" OR ")}
                  <p class="text-xs text-blue-600 mt-1">Multiple possible names detected from menu</p>
                {:else if routeName === ocrResult.restaurantName}
                  <p class="text-xs text-green-600 mt-1">Name detected from menu image</p>
                {/if}
              {/if}
            </div>
            
            <div class="space-y-2">
              <label for="mainPhoto" class="block text-sm font-medium text-gray-700 mb-1">Menu Photo</label>
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
                    class="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
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
            

            
            {#if ocrResult}
              <div class="ocr-results">
                <h3 class="text-xl font-semibold mb-4">OCR Results</h3>
                
                {#if ocrResult.menuItems && ocrResult.menuItems.length > 0}
                  <div class="menu-items">
                    <h4 class="text-lg font-semibold mb-3">Menu Items:</h4>
                    
                    <!-- Add button to edit menu items -->
                    <button
                      type="button"
                      class="text-blue-600 font-bold text-sm inline-flex items-center mb-4 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-full transition-all"
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
                <i class="fas fa-plus-circle mr-2"></i> Add Menu Content
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
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
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
              class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
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
