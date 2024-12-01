<script lang="ts">
    import { onMount } from 'svelte';
    export let monuments = []; // Accept monuments as a prop
    let mapElement: HTMLDivElement;
    let L: typeof import('leaflet');

    onMount(async () => {
        if (typeof window !== 'undefined') {
            try {
                const leaflet = await import('leaflet');
                L = leaflet;
                await import('leaflet/dist/leaflet.css');

                // Get the user's current location
                const { getCurrentLocation } = await import('$lib/location');
                const location = await getCurrentLocation();
                const userLocation: [number, number] = [location.latitude, location.longitude];

                // Initialize the map centered on the user's location
                const map = L.map(mapElement).setView(userLocation, 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                }).addTo(map);

                // Add a marker for the user's location
                L.marker(userLocation)
                    .addTo(map)
                    .bindPopup('You are here')
                    .openPopup();

                // Add markers for each monument
                monuments.forEach((monument) => {
                    if (monument.lat && monument.lng) {
                        L.marker([monument.lat, monument.lng])
                            .addTo(map)
                            .bindPopup(`<strong>${monument.name}</strong><br>${monument.description}`);
                    }
                });
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