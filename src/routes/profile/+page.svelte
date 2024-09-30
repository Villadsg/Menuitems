<script lang="ts">
    import { databases } from '$lib/appwrite';
    import { user } from '$lib/userStore';
    import { onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { Query } from 'appwrite';
  
    let monuments = [];
    let message = '';
  
    const databaseId = '6609473fbde756e5dc45';
    const collectionId = '66eefaaf001c2777deb9';
    const userId = get(user)?.$id;

    let editMonumentData = {
      id: '',
      Route_name: '',
      lat: '',
      lng: ''
    };

    import { goto } from '$app/navigation';
  
  function navigateToEditTours() {
    goto('/edit-tours');
  }

    
  
  </script>
  
  
  <div class="flex justify-center items-center min-h-screen">
    <button 
      class="btn btn-primary" 
      on:click={navigateToEditTours}>
      List of own created tours
    </button>
  </div>
  