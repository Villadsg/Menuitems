<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { LocationResult } from '$lib/locationSearchService';
  
  export let disabled = false;
  export let placeholder = "Search for restaurant locations...";
  
  const dispatch = createEventDispatcher<{
    locationFound: LocationResult;
    searchError: string;
    searchStarted: void;
    searchCompleted: void;
  }>();

  let searchQuery = '';
  let loading = false;
  let results: LocationResult[] = [];
  let showResults = false;
  let searchTimeout: NodeJS.Timeout;
  let city = '';
  let country = '';
  let showAdvanced = false;
  let lastSearchQuery = '';

  // Debounced search function
  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      results = [];
      showResults = false;
      return;
    }

    if (query === lastSearchQuery) {
      return; // Avoid duplicate searches
    }

    lastSearchQuery = query;
    loading = true;
    dispatch('searchStarted');

    try {
      const response = await fetch('/api/location-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName: query,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          additionalContext: 'restaurant menu location search'
        }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        results = [data.result];
        showResults = true;
        dispatch('locationFound', data.result);
      } else {
        results = [];
        showResults = false;
        console.log('No location found for:', query);
      }

    } catch (error) {
      console.error('Location search failed:', error);
      results = [];
      showResults = false;
      dispatch('searchError', error.message || 'Location search failed');
    } finally {
      loading = false;
      dispatch('searchCompleted');
    }
  };

  // Handle input changes with debouncing
  const handleInput = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms debounce
  };

  // Handle result selection
  const selectResult = (result: LocationResult) => {
    searchQuery = result.name;
    showResults = false;
    dispatch('locationFound', result);
  };

  // Clear search
  const clearSearch = () => {
    searchQuery = '';
    results = [];
    showResults = false;
    lastSearchQuery = '';
  };

  // Toggle advanced options
  const toggleAdvanced = () => {
    showAdvanced = !showAdvanced;
  };
</script>

<div class="location-search-widget">
  <!-- Main search input -->
  <div class="relative">
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        on:input={handleInput}
        {placeholder}
        {disabled}
        class="w-full px-4 py-3 pr-12 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
        class:opacity-50={disabled}
      />
      
      {#if loading}
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div class="animate-spin h-5 w-5 border-2 border-orange-400 border-t-transparent rounded-full"></div>
        </div>
      {:else if searchQuery}
        <button
          on:click={clearSearch}
          class="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="Clear search"
        >
          <i class="fas fa-times"></i>
        </button>
      {:else}
        <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400">
          <i class="fas fa-search"></i>
        </div>
      {/if}
    </div>

    <!-- Advanced search toggle -->
    <button
      type="button"
      on:click={toggleAdvanced}
      class="mt-2 text-xs text-stone-500 hover:text-stone-700 transition-colors"
    >
      <i class="fas fa-cog mr-1"></i>
      Advanced search options
      <i class="fas fa-chevron-{showAdvanced ? 'up' : 'down'} ml-1"></i>
    </button>

    <!-- Advanced search options -->
    {#if showAdvanced}
      <div class="mt-3 p-4 bg-stone-50 rounded-lg border border-stone-100">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label for="city" class="block text-xs font-medium text-stone-700 mb-1">
              City
            </label>
            <input
              id="city"
              type="text"
              bind:value={city}
              placeholder="e.g., Copenhagen"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 text-sm"
            />
          </div>
          <div>
            <label for="country" class="block text-xs font-medium text-stone-700 mb-1">
              Country
            </label>
            <input
              id="country"
              type="text"
              bind:value={country}
              placeholder="e.g., Denmark"
              class="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 text-sm"
            />
          </div>
        </div>
      </div>
    {/if}

    <!-- Search results dropdown -->
    {#if showResults && results.length > 0}
      <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
        {#each results as result}
          <button
            type="button"
            on:click={() => selectResult(result)}
            class="w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0 focus:outline-none focus:bg-stone-50"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="font-medium text-stone-900 text-sm">
                  {result.name}
                </div>
                <div class="text-xs text-stone-600 mt-1">
                  {result.address}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    {result.placeType}
                  </span>
                  {#if result.confidence}
                    <span class="text-xs text-stone-500">
                      {Math.round(result.confidence * 100)}% confidence
                    </span>
                  {/if}
                </div>
              </div>
              <div class="text-xs text-stone-500 ml-2">
                <i class="fas fa-map-marker-alt mr-1"></i>
                {result.city}, {result.country}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .location-search-widget {
    position: relative;
  }
  
  /* Ensure dropdown appears above other elements */
  .location-search-widget :global(.absolute) {
    z-index: 50;
  }
</style>