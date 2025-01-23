<svelte:head>
  <script async src="https://docs.opencv.org/4.x/opencv.js" type="text/javascript"></script>
</svelte:head>

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
  let languages = ['ES', 'IT', 'DA', 'JA'];
let menuSections: MenuSection[] = [];

  let selectedLanguage = 'EN'; // Default language is English
  const availableLanguages = [
    { code: 'EN', name: 'English' },
    { code: 'ES', name: 'Spanish' },
    { code: 'IT', name: 'Italian' },
    { code: 'DA', name: 'Danish' },
    { code: 'JA', name: 'Japanese' }
  ];
  
const ocrLanguageMap: Record<string, string> = {
  EN: 'eng', // English
  ES: 'spa', // Spanish
  IT: 'ita', // Italian
  DA: 'dan', // Danish
  JA: 'jpn', // Japanese
};

  const currentDate = new Date().toISOString().slice(0, 16).replace('T', ' ');

  let filesMainPhoto: FileList | null = null;
  let compressedFile: File | null = null;

  let loading = false;

  let bucketId = '66efdb420000df196b64';
  const collectionId = '66eefaaf001c2777deb9';

  let currentPage = 'beginSection';
  $: userId = $user?.$id || 'anonymous';

  let photoPreviewUrl: string | null = null; // To store the URL of the uploaded photo
  let extractedText: string | null = null; // To store the extracted text from OCR
import Tesseract from 'tesseract.js';
import cv2 from 'opencv.js';

 import { onMount } from 'svelte';

  let cv: any;

  onMount(() => {
    // Wait for OpenCV.js to initialize
    cv['onRuntimeInitialized'] = () => {
      console.log('OpenCV.js is ready!');
      // Your OpenCV code here
    };
  });
  
  

function preprocessImage(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(imageFile);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const mat = cv.matFromImageData(imageData);
      const gray = new cv.Mat();
      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY, 0);
      const binary = new cv.Mat();
      cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

      const processedImageData = new ImageData(
        new Uint8ClampedArray(binary.data),
        binary.cols,
        binary.rows
      );
      ctx.putImageData(processedImageData, 0, 0);

      canvas.toBlob((blob) => {
        const processedFile = new File([blob], imageFile.name, { type: 'image/png' });
        resolve(processedFile);
      }, 'image/png');
    };
    img.onerror = reject;
  });
}

async function extractTextWithTesseract(file: File, languageCode: string) {
  try {
    const { data } = await Tesseract.recognize(file, languageCode, {
      logger: (m) => console.log(m), // Optional: Log progress
    });

    const parsedText = data.text;
    return { parsedText };
  } catch (error) {
    console.error('Tesseract Error:', error);
    return null;
  }
}

function parseHocrOutput(hocr: string): TextOverlay {
  const parser = new DOMParser();
  const doc = parser.parseFromString(hocr, 'text/html');
  const lines: Line[] = [];

  // Example: Parse hocr to extract words and their bounding boxes
  const wordElements = doc.querySelectorAll('.ocrx_word');
  wordElements.forEach((wordElement) => {
    const wordText = wordElement.textContent?.trim() || '';
    const bbox = wordElement.getAttribute('title')?.split(' '); // Extract bounding box
    if (bbox && bbox.length >= 4) {
      const word: Word = {
        WordText: wordText,
        Left: parseInt(bbox[1]),
        Top: parseInt(bbox[2]),
        Width: parseInt(bbox[3]) - parseInt(bbox[1]),
        Height: parseInt(bbox[4]) - parseInt(bbox[2]),
      };
      // Group words into lines (you may need to implement this logic)
      // ...
    }
  });

  return { Lines: lines };
}

function parseMenuFromText(text: string): MenuSection[] {
  const menuSections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;

  const lines = text.split('\n');
  for (const line of lines) {
    // Check if the line is a section header (e.g., all caps or contains specific keywords)
    if (isSectionHeader(line)) {
      currentSection = {
        name: line.trim(),
        items: [],
      };
      menuSections.push(currentSection);
    } else if (currentSection) {
      // Group lines into menu items and prices
      const item = parseMenuItem(line);
      if (item) {
        currentSection.items.push(item);
      }
    }
  }

  return menuSections;
}

function isSectionHeader(line: string): boolean {
  // Example logic: Check if the line is in all caps or contains specific keywords
  return line === line.toUpperCase() || line.includes('Menu') || line.includes('Section');
}

function parseMenuItem(line: string): { name: string; price: string } | null {
  const priceMatch = line.match(/\$\d+(\.\d{2})?/); // Match prices like $10.00
  if (priceMatch) {
    const price = priceMatch[0];
    const name = line.replace(price, '').trim();
    return {
      name,
      price,
    };
  }
  return null;
}
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
      console.error('Could not extract coordinates from photo:', error);
      showCoordinatesInput = true;
    }
  };

async function handlePhotoUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  filesMainPhoto = input.files;

  if (filesMainPhoto && filesMainPhoto[0]) {
    const originalFile = filesMainPhoto[0];
    await extractPhotoCoordinates(originalFile);

    if (showCoordinatesInput) {
      const useLocation = confirm('Photo has no GPS data. Would you like to use your current location as the shop location?');
      if (useLocation) {
        await fetchCurrentLocation();
      }
    }

    try {
      // Preprocess the image
      const preprocessedFile = await preprocessImage(originalFile);
      compressedFile = await compressImage(preprocessedFile);

      // Extract text using Tesseract.js with custom configuration
      const ocrResult = await extractTextWithTesseract(compressedFile, ocrLanguageMap[selectedLanguage], {
        tessedit_pageseg_mode: '6', // PSM_SINGLE_BLOCK
        tessedit_ocr_engine_mode: '1', // OEM_LSTM_ONLY
      });

      if (ocrResult) {
        const { parsedText } = ocrResult;

        // Correct spelling
        const correctedText = correctSpelling(parsedText);

        // Store the parsed text (if needed)
        extractedText = correctedText;

        // Process the text to group words into logical sections
        menuSections = parseMenuFromText(correctedText);

        // Log or store the structured menu data
        console.log('Structured Menu Data:', menuSections);

        // Optionally, update your UI or state with the structured menu data
      }
    } catch (error) {
      console.error('Failed to process the photo:', error);
      message = 'Failed to process the photo.';
      compressedFile = null;
    }
  }
}
 
  const uploadMainPhoto = async () => {
    try {
      if (compressedFile) {
        const response = await storage.createFile(bucketId, ID.unique(), compressedFile);
        return response.$id;
      }
    } catch (error) {
      console.error('Failed to upload main photo:', error.message);
      message = `Failed to upload main photo: ${error.message}`;
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
        userId: userId || 'anonymous',
        photoFileId: mainPhotoFileId,
        Description: serializedDescription,
        language: selectedLanguage,
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
            <label for="Description" class="label">Menu page Name</label>
            <textarea id="Description" bind:value={Description} placeholder="'Drinks'" required class="textarea textarea-bordered"></textarea>
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
 <!-- Display Raw OCR Output -->
          {#if extractedText}
            <div class="form-control">
              <label class="label">Raw OCR Output</label>
              <div class="p-4 bg-gray-100 rounded-lg text-left">
                <pre class="whitespace-pre-wrap break-words">{extractedText}</pre>
              </div>
            </div>
          {/if}
          
{#if menuSections && menuSections.length > 0}
  <div class="form-control">
    <label class="label">Structured Menu</label>
    <div class="p-4 bg-gray-100 rounded-lg text-left">
      {#each menuSections as section}
        <div class="menu-section mb-6">
          <h2 class="section-title font-bold text-lg mb-2">{section.name}</h2>
          <ul class="menu-items">
            {#each section.items as item}
              <li class="menu-item mb-2">
                <span class="item-name">{item.name}</span>
                <span class="item-price font-bold ml-2">{item.price}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>
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
          <button type="button" class="btn btn-outline w-full mt-3" on:click={() => (currentPage = 'beginSection')}>
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