<script lang="ts">
  import { databases, storage, ID } from '$lib/appwrite';
  import { user } from '$lib/userStore';
  import { onMount } from 'svelte';
  import { Query } from 'appwrite';

  let loading = false;
  let monuments = [];
  let message = '';
  let monumentToDelete = null;
  let confirmationName = '';
  let errorMessage = '';

  const databaseId = '6609473fbde756e5dc45';
  const collectionId = '66eefaaf001c2777deb9';
  const translatedCollectionId = '66fe6ac90010d9e9602f';
  $: userId = $user?.$id;

  let isEditing = false;
  let editMonumentData = {
    id: '',
    Route_name: '',
    lat: '',
    lng: '',
    photoFileId: '',
    Description: '',
    startingPoint: ['', ''], // Ensures that startingPoint has both photoFileId and description
    steps_in_route: [''],
    quiz_question_answer: ['']
  };

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
        [Query.equal('userId', userId)]
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
    try {
      if (monument.photoFileId) {
        await storage.deleteFile('66efdb420000df196b64', monument.photoFileId);
      }

      const copies = await databases.listDocuments(
        databaseId,
        translatedCollectionId,
        [Query.equal('idOriginal', monument.$id)]
      );

      for (const copy of copies.documents) {
        await databases.deleteDocument(databaseId, translatedCollectionId, copy.$id);
      }

      await databases.deleteDocument(databaseId, collectionId, monument.$id);
      await loadMonuments();
    } catch (error) {
      console.error('Error deleting monument:', error);
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
      startingPoint: monument.startingPoint || ['', ''], // Ensure photoFileId and description in startingPoint
      steps_in_route: monument.steps_in_route || [],
      quiz_question_answer: monument.quiz_question_answer || []
    };
  };

  const updateMonument = async () => {
    try {
      loading = true;
      const currentDate = new Date().toISOString();

      const { id, ...updatedData } = editMonumentData;
      updatedData.dateModified = currentDate;
      updatedData.lat = parseFloat(editMonumentData.lat);
      updatedData.lng = parseFloat(editMonumentData.lng);

      // Update the original monument
      await databases.updateDocument(databaseId, collectionId, id, updatedData);

      // Fetch all translated copies
      const copies = await databases.listDocuments(
        databaseId,
        translatedCollectionId,
        [Query.equal('idOriginal', id)]
      );

      // Delete existing translations
      for (const copy of copies.documents) {
        await databases.deleteDocument(databaseId, translatedCollectionId, copy.$id);
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
        const translatedStartingPoint = [updatedData.startingPoint[0], await translateText(updatedData.startingPoint[1], code)];
        const translatedSteps = await Promise.all(updatedData.steps_in_route.map(step => translateText(step, code)));
        const translatedAnswers = await Promise.all(updatedData.quiz_question_answer.map(answer => translateText(answer, code)));

        await databases.createDocument(databaseId, translatedCollectionId, ID.unique(), {
          idOriginal: id,
          language: code,
          Route_name: editMonumentData.Route_name,
          lat: updatedData.lat,
          lng: updatedData.lng,
          userId,
          photoFileId: editMonumentData.photoFileId,
          Description: translatedDescription,
          startingPoint: translatedStartingPoint, // Use translated starting point description
          steps_in_route: translatedSteps,
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
        startingPoint: ['', ''],
        steps_in_route: [''],
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

  const modifySteps = (action, index) => {
    if (action === 'add') {
      editMonumentData.steps_in_route = [...editMonumentData.steps_in_route, ''];
    } else if (action === 'remove' && index !== null) {
      editMonumentData.steps_in_route = editMonumentData.steps_in_route.filter((_, i) => i !== index);
    }
  };

  const modifyAnswers = (action, index) => {
    if (action === 'add') {
      editMonumentData.quiz_question_answer = [...editMonumentData.quiz_question_answer, ''];
    } else if (action === 'remove' && index !== null) {
      editMonumentData.quiz_question_answer = editMonumentData.quiz_question_answer.filter((_, i) => i !== index);
    }
  };
</script>

<!-- Edit Monument Form -->
<div class="pt-20 max-w-lg mx-auto">
  <h1 class="text-3xl font-bold mb-4">My Tours</h1>
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
            <span class="label-text">Starting Point Description</span>
            <textarea bind:value={editMonumentData.startingPoint[1]} class="textarea textarea-bordered" required></textarea>
          </div>

          <div class="form-control">
            <span class="label-text">Steps in Route</span>
            {#each editMonumentData.steps_in_route as step, index}
              <div class="flex items-center space-x-2">
                <input type="text" bind:value={editMonumentData.steps_in_route[index]} class="input input-bordered w-full" placeholder="Enter step" />
                <button type="button" class="btn btn-outline btn-error" on:click={() => modifySteps('remove', index)}>Remove</button>
              </div>
            {/each}
            <button type="button" class="btn btn-outline mt-2" on:click={() => modifySteps('add', null)}>Add Step</button>
          </div>

          <div class="form-control">
            <span class="label-text">Quiz Question Answers</span>
            {#each editMonumentData.quiz_question_answer as answer, index}
              <div class="flex items-center space-x-2">
                <input type="text" bind:value={editMonumentData.quiz_question_answer[index]} class="input input-bordered w-full" placeholder="Enter answer" />
                <button type="button" class="btn btn-outline btn-error" on:click={() => modifyAnswers('remove', index)}>Remove</button>
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
              <button class="btn btn-outline btn-error" on:click={() =>  confirmDelete(monument)}>Delete</button>
              <button class="btn btn-outline btn-primary ml-2" on:click={() => editMonument(monument)}>Edit</button>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
