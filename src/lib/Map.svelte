<script lang="ts">
    import { onMount } from 'svelte';
    let mapElement: HTMLDivElement;
    let L: typeof import('leaflet');
  
    // Import getCurrentLocation from your location utility
    import { getCurrentLocation } from '$lib/location';
  
    onMount(async () => {
      if (typeof window !== 'undefined') {
        try {
          // Dynamically import Leaflet in a browser environment
          const leaflet = await import('leaflet');
          L = leaflet;
  
          // Import Leaflet CSS dynamically
          await import('leaflet/dist/leaflet.css');
  
          // Get the user's current location
          const location = await getCurrentLocation();
          const center: [number, number] = [location.latitude, location.longitude];
  
          // Initialize the map
          const map = L.map(mapElement).setView(center, 13);
  
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);
  
          // Add a marker at the user's location
          L.marker(center).addTo(map).bindPopup('You are here').openPopup();
        } catch (err) {
          console.error('Error initializing the map:', err);
        }
      }
    });
  </script>
  
  <style>
    .map-container {
      height: 400px;
      width: 100%;
    }
  </style>
  
  <div bind:this={mapElement} class="map-container"></div>
  