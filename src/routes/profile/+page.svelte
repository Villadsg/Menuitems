<script lang="ts">
  import { databases } from '$lib/appwrite';
  import { user } from '$lib/userStore';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Button } from 'flowbite-svelte';

  let monuments = [];
  let message = '';
  let isEditing = false;
  let editMonumentData = { id: '', Route_name: '', lat: '', lng: '' };

  const loadMonuments = async () => {
    // Monument loading logic
  };

  const deleteMonument = async (id) => {
    // Monument deletion logic
  };

  const editMonument = (monument) => {
    isEditing = true;
    editMonumentData = { ...monument };
  };

  const updateMonument = async () => {
    // Monument update logic
  };

  const cancelEdit = () => {
    isEditing = false;
    editMonumentData = { id: '', Route_name: '', lat: '', lng: '' };
  };

  onMount(async () => {
    await loadMonuments();
  });
</script>

<h1 class="text-2xl font-bold mb-6">Your Monuments</h1>
<p class="text-red-500">{message}</p>

{#if isEditing}
  <div class="edit-form max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
    <h2 class="text-xl font-bold mb-4">Edit Monument</h2>
    <form on:submit|preventDefault={updateMonument} class="space-y-4">
      <div>
        <Label for="editRouteName">Monument Name (Route Name)</Label>
        <input id="editRouteName" type="text" bind:value={editMonumentData.Route_name} required class="w-full p-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <Label for="editLat">Latitude</Label>
        <input id="editLat" type="number" step="any" bind:value={editMonumentData.lat} required class="w-full p-2 border border-gray-300 rounded-lg" />
      </div>
      <div>
        <Label for="editLng">Longitude</Label>
        <input id="editLng" type="number" step="any" bind:value={editMonumentData.lng} required class="w-full p-2 border border-gray-300 rounded-lg" />
      </div>
      <div class="flex space-x-2">
        <Button type="submit" class="bg-green-500 text-white">Update Monument</Button>
        <Button type="button" class="bg-gray-500 text-white" on:click={cancelEdit}>Cancel</Button>
      </div>
    </form>
  </div>
{/if}

<ul>
  {#each monuments as monument (monument.$id)}
    <li class="mb-4 p-4 bg-gray-100 rounded shadow">
      <h3 class="text-xl font-semibold">{monument.Route_name}</h3>
      <p>Latitude: {monument.lat}</p>
      <p>Longitude: {monument.lng}</p>
      <Button on:click={() => deleteMonument(monument.$id)} class="bg-red-500 text-white">Delete</Button>
      <Button on
