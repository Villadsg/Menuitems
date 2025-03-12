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

                // Get the user's current location or use Copenhagen as default
                const { getCurrentLocation, DEFAULT_LOCATION } = await import('$lib/location');
                let userLocation: [number, number];
                
                try {
                    const location = await getCurrentLocation();
                    userLocation = [location.latitude, location.longitude];
                    console.log('Using user location:', userLocation);
                } catch (locationError) {
                    // If there's an error getting the user's location, use Copenhagen as default
                    userLocation = [DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude];
                    console.log('Using default location (Copenhagen):', userLocation);
                }

                // Initialize the map centered on the user's location or Copenhagen
                const map = L.map(mapElement).setView(userLocation, 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                }).addTo(map);

                // Add a marker for the user's location
                L.marker(userLocation)
                    .addTo(map)
                    .bindPopup('Your location (or default location if not available)')
                    .openPopup();

                // Define the custom icon for monuments
                const customIcon = L.icon({
                    iconUrl: '/pin.png', // Path to the monument marker icon
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32],
                });

                // Add markers for each monument with the custom icon
                monuments.forEach((monument) => {
                    if (monument.lat && monument.lng) {
                        L.marker([monument.lat, monument.lng], { icon: customIcon })
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