<script lang="ts">
  import { onMount } from 'svelte';
  import LocationSearchWidget from '$lib/components/LocationSearchWidget.svelte';
  import type { LocationResult } from '$lib/locationSearchService';

  let stats = {
    totalRestaurants: 0,
    withCoordinates: 0,
    withLocationSearch: 0,
    missingLocation: 0,
    coordinatesPercentage: 0,
    locationSearchPercentage: 0
  };

  let loading = false;
  let backfillResults: any = null;
  let selectedResult: LocationResult | null = null;
  let testSearchLoading = false;
  let backfillOptions = {
    limit: 10,
    onlyMissingCoordinates: true,
    dryRun: true
  };

  // Load statistics on mount
  onMount(async () => {
    await loadStats();
  });

  const loadStats = async () => {
    try {
      const response = await fetch('/api/backfill-locations?action=stats');
      const data = await response.json();
      
      if (data.success) {
        stats = data.stats;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleLocationFound = (event) => {
    selectedResult = event.detail;
  };

  const handleSearchError = (event) => {
    alert(`Search error: ${event.detail}`);
  };

  const runBackfill = async () => {
    loading = true;
    backfillResults = null;
    
    try {
      const response = await fetch('/api/backfill-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backfillOptions),
      });

      const data = await response.json();
      
      if (data.success) {
        backfillResults = data;
        if (!backfillOptions.dryRun) {
          await loadStats(); // Refresh stats after actual backfill
        }
      } else {
        alert(`Backfill failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Backfill failed:', error);
      alert(`Backfill failed: ${error.message}`);
    } finally {
      loading = false;
    }
  };

  const clearTestResult = () => {
    selectedResult = null;
  };
</script>

<svelte:head>
  <title>Location Search Admin - MenuMap</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-6xl mx-auto px-4">
    <h1 class="text-3xl font-light text-gray-900 mb-8">Location Search Administration</h1>

    <!-- Statistics Section -->
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
      <h2 class="text-xl font-medium text-gray-900 mb-4">Database Statistics</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-stone-50 rounded-xl p-4">
          <div class="text-2xl font-bold text-gray-900">{stats.totalRestaurants}</div>
          <div class="text-sm text-gray-600">Total Restaurants</div>
        </div>
        
        <div class="bg-orange-50 rounded-xl p-4">
          <div class="text-2xl font-bold text-orange-600">{stats.withCoordinates}</div>
          <div class="text-sm text-gray-600">With Coordinates</div>
          <div class="text-xs text-gray-500">{stats.coordinatesPercentage}%</div>
        </div>
        
        <div class="bg-green-50 rounded-xl p-4">
          <div class="text-2xl font-bold text-green-600">{stats.withLocationSearch}</div>
          <div class="text-sm text-gray-600">Location Search Done</div>
          <div class="text-xs text-gray-500">{stats.locationSearchPercentage}%</div>
        </div>
        
        <div class="bg-red-50 rounded-xl p-4">
          <div class="text-2xl font-bold text-red-600">{stats.missingLocation}</div>
          <div class="text-sm text-gray-600">Missing Location Data</div>
        </div>
      </div>

      <button
        on:click={loadStats}
        class="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm"
      >
        <i class="fas fa-refresh mr-2"></i>
        Refresh Stats
      </button>
    </div>

    <!-- Test Search Section -->
    <div class="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-gray-100">
      <h2 class="text-xl font-medium text-gray-900 mb-4">Test Location Search</h2>
      
      <div class="max-w-md">
        <LocationSearchWidget
          placeholder="Enter restaurant name to test search..."
          on:locationFound={handleLocationFound}
          on:searchError={handleSearchError}
          on:searchStarted={() => testSearchLoading = true}
          on:searchCompleted={() => testSearchLoading = false}
        />
      </div>

      {#if selectedResult}
        <div class="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium text-green-900 mb-2">Location Found!</h3>
              <div class="space-y-1 text-sm text-green-800">
                <div><strong>Name:</strong> {selectedResult.name}</div>
                <div><strong>Address:</strong> {selectedResult.address}</div>
                <div><strong>Coordinates:</strong> {selectedResult.latitude}, {selectedResult.longitude}</div>
                <div><strong>Type:</strong> {selectedResult.placeType}</div>
                <div><strong>Confidence:</strong> {Math.round(selectedResult.confidence * 100)}%</div>
                <div><strong>City:</strong> {selectedResult.city}, {selectedResult.country}</div>
              </div>
            </div>
            <button
              on:click={clearTestResult}
              class="text-green-600 hover:text-green-800 transition-colors"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Backfill Section -->
    <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <h2 class="text-xl font-medium text-gray-900 mb-4">Backfill Restaurant Locations</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label for="limit" class="block text-sm font-medium text-gray-700 mb-1">
            Limit
          </label>
          <input
            id="limit"
            type="number"
            bind:value={backfillOptions.limit}
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        
        <div class="flex items-center">
          <label class="inline-flex items-center">
            <input
              type="checkbox"
              bind:checked={backfillOptions.onlyMissingCoordinates}
              class="rounded border-gray-300 text-orange-400 focus:ring-orange-400"
            />
            <span class="ml-2 text-sm text-gray-700">Only missing coordinates</span>
          </label>
        </div>
        
        <div class="flex items-center">
          <label class="inline-flex items-center">
            <input
              type="checkbox"
              bind:checked={backfillOptions.dryRun}
              class="rounded border-gray-300 text-orange-400 focus:ring-orange-400"
            />
            <span class="ml-2 text-sm text-gray-700">Dry run (preview only)</span>
          </label>
        </div>
      </div>

      <button
        on:click={runBackfill}
        disabled={loading}
        class="px-6 py-3 bg-orange-400 hover:bg-orange-500 disabled:bg-gray-300 text-white rounded-xl transition-colors font-medium"
      >
        {#if loading}
          <i class="fas fa-spinner fa-spin mr-2"></i>
          Processing...
        {:else}
          <i class="fas fa-play mr-2"></i>
          {backfillOptions.dryRun ? 'Preview' : 'Run'} Backfill
        {/if}
      </button>

      {#if backfillResults}
        <div class="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 class="font-medium text-blue-900 mb-3">
            {backfillResults.dryRun ? 'Preview Results' : 'Backfill Results'}
          </h3>
          
          {#if backfillResults.dryRun}
            <div class="text-sm text-blue-800">
              <div><strong>Would process:</strong> {backfillResults.wouldProcess} restaurants</div>
            </div>
            
            {#if backfillResults.restaurants && backfillResults.restaurants.length > 0}
              <div class="mt-3">
                <div class="text-xs font-medium text-blue-800 mb-2">Restaurants to process:</div>
                <div class="max-h-40 overflow-y-auto space-y-1">
                  {#each backfillResults.restaurants.slice(0, 10) as restaurant}
                    <div class="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      {restaurant.name} 
                      {restaurant.hasCoordinates ? '(has coords)' : '(no coords)'}
                      {restaurant.locationSearchStatus ? `[${restaurant.locationSearchStatus}]` : '[no search]'}
                    </div>
                  {/each}
                  {#if backfillResults.restaurants.length > 10}
                    <div class="text-xs text-blue-600">
                      ... and {backfillResults.restaurants.length - 10} more
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          {:else}
            <div class="text-sm text-blue-800 space-y-1">
              <div><strong>Processed:</strong> {backfillResults.processed}</div>
              <div><strong>Successful:</strong> {backfillResults.successful}</div>
              <div><strong>Failed:</strong> {backfillResults.failed}</div>
              <div class="mt-2 text-xs">{backfillResults.message}</div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>