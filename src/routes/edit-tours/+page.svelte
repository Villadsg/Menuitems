<script lang="ts">
  import { databases } from '$lib/appwrite';
  import { user } from '$lib/userStore';
  import { onMount } from 'svelte';
  import { Query } from 'appwrite';
  
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
    Description: '',
    steps_in_route: [''],
    quiz_question_answer: ['']
  };

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



  const confirmDelete = async () => {
  if (monumentToDelete && confirmationName === monumentToDelete.Route_name) {
    try {
      await databases.deleteDocument(databaseId, collectionId, monumentToDelete.$id);
      monumentToDelete = null;  // Reset the confirmation state
      confirmationName = '';    // Clear the input
      await loadMonuments();    // Reload the monuments list
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
      Description: monument.Description || '',
      steps_in_route: monument.steps_in_route || [],
      quiz_question_answer: monument.quiz_question_answer || []
    };
  };

  const updateMonument = async () => {
  try {
    const currentDate = new Date().toISOString();

    // Create the updated data object without the 'id' field
    const { id, ...updatedData } = editMonumentData;
    
    // Add the dateModified field to the updated data
    updatedData.dateModified = currentDate;
    updatedData.lat = parseFloat(editMonumentData.lat);
    updatedData.lng = parseFloat(editMonumentData.lng);

    // Perform the update
    await databases.updateDocument(databaseId, collectionId, id, updatedData);
    
    // Reset the editing state
    isEditing = false;
    editMonumentData = {
      id: '',
      Route_name: '',
      lat: '',
      lng: '',
      Description: '',
      steps_in_route: [''],
      quiz_question_answer: ['']
    };

    await loadMonuments();
  } catch (error) {
    console.error('Error updating monument:', error);
    message = 'Failed to update monument.';
  }
};


  const cancelEdit = () => {
    isEditing = false;
    editMonumentData = { id: '', Route_name: '', lat: '', lng: '', Description: '', steps_in_route: [''], quiz_question_answer: [''] };
  };

  onMount(async () => {
    await loadMonuments();
  });


  const modifySteps = (action, index) => {
  if (action === 'add') {
    // Add a new step
    editMonumentData.steps_in_route = [...editMonumentData.steps_in_route, ''];
  } else if (action === 'remove' && index !== null) {
    // Remove the step at the given index
    editMonumentData.steps_in_route = editMonumentData.steps_in_route.filter((_, i) => i !== index);
  }
};


const modifyAnswers = (action, index) => {
  if (action === 'add') {
    // Add a new answer
    editMonumentData.quiz_question_answer = [...editMonumentData.quiz_question_answer, ''];
  } else if (action === 'remove' && index !== null) {
    // Remove the answer at the given index
    editMonumentData.quiz_question_answer = editMonumentData.quiz_question_answer.filter((_, i) => i !== index);
  }
};



</script>

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
        <h2 class="card-title">Edit {editMonumentData.Route_name} </h2>
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
      
              <span class="label-text">Steps in Route</span>
  
            {#each editMonumentData.steps_in_route as step, index}
              <div class="flex items-center space-x-2">
                <input type="text" bind:value={editMonumentData.steps_in_route[index]} class="input input-bordered w-full" placeholder="Enter step" />
                <button type="button" class="btn btn-outline btn-error" on:click={() => modifySteps('remove', index)}>Remove</button>
              </div>
            {/each}
            <button type="button" class="btn btn-outline mt-2" on:click={() => modifySteps('add')}>Add Step</button>
          </div>

          <div class="form-control">
        
              <span class="label-text">Quiz Question Answers</span>
       
            {#each editMonumentData.quiz_question_answer as answer, index}
              <div class="flex items-center space-x-2">
                <input type="text" bind:value={editMonumentData.quiz_question_answer[index]} class="input input-bordered w-full" placeholder="Enter answer" />
                <button type="button" class="btn btn-outline btn-error" on:click={() => modifyAnswers('remove', index)}>Remove</button>
              </div>
            {/each}
            <button type="button" class="btn btn-outline mt-2" on:click={() => modifyAnswers('add')}>Add Answer</button>
          </div>

          <div class="card-actions justify-end mt-4">
            <button type="submit" class="btn btn-primary">Update Monument</button>
            <button type="button" class="btn btn-outline" on:click={cancelEdit}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if !isEditing}

  {#if monumentToDelete}
  <div class="card bg-base-100 shadow-lg">
    <div class="card-body">
      <h3 class="card-title">Confirm Delete</h3>
      <p>Are you sure you want to delete the monument "<strong>{monumentToDelete.Route_name}</strong>"?</p>
      <p>Type the monument name below to confirm:</p>
      <input type="text" bind:value={confirmationName} class="input input-bordered" placeholder="Monument name" />
      
      {#if errorMessage}
        <div class="alert alert-error mt-2">{errorMessage}</div>
      {/if}
      
      <div class="card-actions justify-end mt-4">
        <button class="btn btn-outline" on:click={() => { monumentToDelete = null }}>Cancel</button>
        <button class="btn btn-error" on:click={confirmDelete}>Confirm Delete</button>
      </div>
    </div>
  </div>
{/if}


  <ul class="mt-6 space-y-4">
    {#each monuments as monument (monument.$id)}
      <li class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <h3 class="card-title">{monument.Route_name}</h3>
          <p><strong>Description:</strong> {monument.Description}</p>
          <p>Date Modified: {monument.dateModified}</p>
          <div class="card-actions justify-end">
            <button class="btn btn-outline btn-error" on:click={() => initiateDelete(monument)}>Delete</button>
            <button class="btn btn-outline btn-primary ml-2" on:click={() => editMonument(monument)}>Edit</button>
          </div>
        </div>
      </li>
    {/each}
  </ul>
  {/if}
</div>

