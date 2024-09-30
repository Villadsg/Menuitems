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
  
  </script>
  