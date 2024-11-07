<script lang="ts">
  import { databases, storage, ID } from '$lib/appwrite';
  import { user } from '$lib/userStore';
  import { onMount } from 'svelte';
  import { Query } from 'appwrite';
  import { compressImage } from '$lib/compress'; // Import the compress function



  let deleteLoading = false; // New variable for delete loading spinner
  let loading = false;
  let monuments = [];
  let message = '';
  let monumentToDelete = null;
  let confirmationName = '';
  let errorMessage = '';

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  $: userId = $user?.$id;

  let isEditing = false;
  let editMonumentData = {
    id: '',
    Route_name: '',
    lat: '',
    lng: '',
    photoFileId: '',
    Description: '',
    quiz_question_answer: ['']
  };

  let newPhotoFile = null;

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      try {
        newPhotoFile = await compressImage(file); // Compress the file
      } catch (error) {
        console.error('Image compression failed:', error);
      }
    }
  }


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

  

  const loadMonuments = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal('userId', userId),Query.equal('language', 'EN')]
      );
      monuments = response.documents;
      message = monuments.length === 0 ? 'No monument tours created yet.' : '';
    } catch (error) {
      console.error('Error loading monuments:', error);
      message = 'Failed to load monuments.';
    }
  };

  const confirmDelete = async (monument) => {
  if (monument && confirmationName === monument.Route_name) {
    deleteLoading = true;
    try {
      if (monument.photoFileId) {
        await storage.deleteFile('66efdb420000df196b64', monument.photoFileId);
      }

      const copies = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal('idOriginal', monument.$id)]
      );

      for (const copy of copies.documents) {
        await databases.deleteDocument(databaseId, collectionId, copy.$id);
      }

      await databases.deleteDocument(databaseId, collectionId, monument.$id);
      await loadMonuments();

       // Close the modal after successful deletion
       monumentToDelete = null;
      confirmationName = '';  // Reset the confirmation name input
      errorMessage = ''; 
      
    } catch (error) {
      console.error('Error deleting monument:', error);
    } finally {
        deleteLoading = false; // Reset delete loading after the delete operation completes
      }
  } else {
    errorMessage = "The name you entered doesn't match the monument.";
  }
};


  const initiateDelete = (monument) => {
    monumentToDelete = monument;
    confirmationName = '';
    errorMessage = '';
  };

  const editMonument = (monument) => {
    isEditing = true;
    editMonumentData = {
      id: monument.$id,
      Route_name: monument.Route_name,
      lat: monument.lat,
      lng: monument.lng,
      photoFileId: monument.photoFileId,
      Description: monument.Description || '',
      quiz_question_answer: monument.quiz_question_answer || []
    };
  };

  const updateMonument = async () => {
    try {
      loading = true;
      const currentDate = new Date().toISOString();

      if (newPhotoFile) {
      // Delete the old photo if it exists
      if (editMonumentData.photoFileId) {
        try {
          await storage.deleteFile('66efdb420000df196b64', editMonumentData.photoFileId);
        } catch (error) {
          console.error(`Error deleting old photo:`, error);
        }
      }

      // Upload the compressed photo and update photoFileId
      try {
        const uploadResponse = await storage.createFile('66efdb420000df196b64', ID.unique(), newPhotoFile);
        editMonumentData.photoFileId = uploadResponse.$id;
      } catch (error) {
        console.error('Error uploading new photo:', error);
        throw new Error('Failed to upload new photo');
      }

      // Reset compressedFile after upload
      newPhotoFile = null;
    }

    const updatedData = {
      Route_name: editMonumentData.Route_name,
      lat: editMonumentData.lat,
      lng: editMonumentData.lng,
      Description: editMonumentData.Description,
      quiz_question_answer: editMonumentData.quiz_question_answer,
      photoFileId: editMonumentData.photoFileId,
      dateModified: currentDate
    };

      // Update the original monument
      await databases.updateDocument(databaseId, collectionId, editMonumentData.id, updatedData);

      // Fetch all translated copies
      const copies = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal('idOriginal', editMonumentData.id)]
      );

      // Delete existing translations
      for (const copy of copies.documents) {
        await databases.deleteDocument(databaseId, collectionId, copy.$id);
      }

      // Language codes for translations
      const targetLangs = {
        'Italian': 'IT',
        'Spanish': 'ES',
        'Japanese': 'JA',
        'Danish': 'DA'
      };

      // Translate and create new documents for each language
      for (const [language, code] of Object.entries(targetLangs)) {
        const translatedDescription = await translateText(updatedData.Description, code);
        const translatedAnswers = await Promise.all(updatedData.quiz_question_answer.map(answer => translateText(answer, code)));

        await databases.createDocument(databaseId, collectionId, ID.unique(), {
          idOriginal: editMonumentData.id,
          language: code,
          Route_name: editMonumentData.Route_name,
          lat: updatedData.lat,
          lng: updatedData.lng,
          userId,
          photoFileId: editMonumentData.photoFileId,
          Description: translatedDescription,
          quiz_question_answer: translatedAnswers,
          dateModified: currentDate
        });
      }

      isEditing = false;
      editMonumentData = {
        id: '',
        Route_name: '',
        lat: '',
        lng: '',
        Description: '',
        photoFileId: '',
        quiz_question_answer: ['']
      };

      await loadMonuments();
    } catch (error) {
      console.error('Error updating monument:', error);
      message = 'Failed to update monument.';
    } finally {
      loading = false;
    }
  };

  const cancelEdit = () => {
    isEditing = false;
    editMonumentData = {
      id: '',
      Route_name: '',
      lat: '',
      lng: '',
      Description: '',
      photoFileId: '',
      startingPoint: ['', ''],
      steps_in_route: [''],
      quiz_question_answer: ['']
    };
  };

  onMount(async () => {
    await loadMonuments();
  });


  const modifyAnswers = (action, index) => {
    if (action === 'add') {
      editMonumentData.quiz_question_answer = [...editMonumentData.quiz_question_answer, ''];
    } else if (action === 'remove' && index !== null) {
      editMonumentData.quiz_question_answer = editMonumentData.quiz_question_answer.filter((_, i) => i !== index);
    }
  };

    // Function to set a potential answer as correct by updating index 1
    function setCorrectAnswer(index: number) {
    editMonumentData.quiz_question_answer[1] = editMonumentData.quiz_question_answer[index];
  }
</script>

<!-- Edit Monument Form -->
<div class="pt-20 max-w-lg mx-auto">
  <h1 class="text-3xl font-bold mb-4">My Locations</h1>
  {#if message}
    <div class="alert alert-error shadow-lg">
      <div>{message}</div>
    </div>
  {/if}

  {#if isEditing}
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Edit {editMonumentData.Route_name}</h2>
        <form on:submit|preventDefault={updateMonument} class="form-control space-y-4">
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">Tour Name</span>
              <input type="text" bind:value={editMonumentData.Route_name} class="input input-bordered" required />
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Upload New Photo</span>
              <input type="file" accept="image/*" on:change={handleFileChange} class="input input-bordered" />
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Latitude</span>
              <input type="number" step="any" bind:value={editMonumentData.lat} class="input input-bordered" required />
            </label>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Longitude</span>
              <input type="number" step="any" bind:value={editMonumentData.lng} class="input input-bordered" required />
            </label>
          </div>

          <div class="form-control">
            <span class="label-text">Description</span>
            <textarea bind:value={editMonumentData.Description} class="textarea textarea-bordered" required></textarea>
          </div>



          <div class="form-control">
            <span class="label-text">Quiz Question and Answers</span>
          
            <!-- Display the Question -->
            <div class="flex items-center space-x-2">
              <input type="text" bind:value={editMonumentData.quiz_question_answer[0]} class="input input-bordered w-full" placeholder="Enter question" />
              <span class="text-gray-500">Question</span>
            </div>
          
            <!-- Display Potential Answers -->
            {#each editMonumentData.quiz_question_answer.slice(2) as answer, index}
              <div class="flex items-center space-x-2 mt-2">
                <input type="text" bind:value={editMonumentData.quiz_question_answer[index + 2]} class="input input-bordered w-full" placeholder="Enter answer option" />
                <button type="button" class="btn btn-outline" on:click={() => setCorrectAnswer(index + 2)}>Set as Correct</button>
              </div>
            {/each}
            <button type="button" class="btn btn-outline mt-2" on:click={() => modifyAnswers('add', null)}>Add Answer</button>
          </div>

          <div class="card-actions justify-end mt-4">
            <button type="submit" class="btn btn-primary">
              {#if loading}
                <span class="loading loading-spinner mr-2"></span> Updating...
              {:else}
                Update Route
              {/if}
            </button>
            <button type="button" class="btn btn-outline" on:click={cancelEdit}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  {/if}
  
  <!-- Monument List -->
  {#if !isEditing}
    <ul class="mt-6 space-y-4">
      {#each monuments as monument (monument.$id)}
        <li class="card bg-base-100 shadow-lg">
          <div class="card-body">
            <h3 class="card-title">{monument.Route_name}</h3>
            <p><strong>Description:</strong> {monument.Description}</p>
            <p>Date Modified: {monument.dateModified.slice(0, 16).replace('T', ' ')}</p>
            <div class="card-actions justify-end">
              <button class="btn btn-outline btn-error" on:click={() =>  initiateDelete(monument)}>Delete</button>
              <button class="btn btn-outline btn-primary ml-2" on:click={() => editMonument(monument)}>Edit</button>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
{#if monumentToDelete}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Confirm Delete</h3>
      <p>Are you sure you want to delete {monumentToDelete.Route_name}?</p>
      <p>Enter the name <strong>{monumentToDelete.Route_name}</strong> to confirm:</p>
      <input
        type="text"
        bind:value={confirmationName}
        placeholder="Enter name to confirm"
        class="input input-bordered w-full mt-2"
      />
      {#if errorMessage}
        <p class="text-red-500 mt-2">{errorMessage}</p>
      {/if}
      <div class="modal-action">
        <button class="btn btn-error" on:click={() => confirmDelete(monumentToDelete)} disabled={deleteLoading}>
          {#if deleteLoading}
            <span class="loading loading-spinner mr-2"></span> Deleting...
          {:else}
            Delete
          {/if}
        </button>
        <button class="btn" on:click={() => monumentToDelete = null}>Cancel</button>
      </div>
    </div>
  </div>
{/if}
