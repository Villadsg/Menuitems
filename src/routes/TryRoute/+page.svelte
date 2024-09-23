<script lang="ts">
    let answer = ''; // Store the answer for the multiple choice quiz
    let photo = null; // Store the photo taken by the user
    let showPhotoResult = false; // Control when to show the photo result
  
    const handleFileUpload = (event) => {
      photo = event.target.files[0]; // Capture the uploaded photo
      showPhotoResult = true;
    };
  </script>
  
  <div class="max-w-3xl mx-auto p-8">
    <h1 class="text-3xl font-bold mb-6">Tryout Route Challenge</h1>
  
    <!-- Challenge Step 1: Route Description and Quiz -->
    <div class="mb-8">
      <h2 class="text-xl font-bold">Step 1: Go to your window and select what you see.</h2>
      <p class="mt-4">Multiple choice:</p>
      <ul class="space-y-2">
        <li>
          <label>
            <input type="radio" name="choice" value="car" bind:group={answer} />
            Car
          </label>
        </li>
        <li>
          <label>
            <input type="radio" name="choice" value="road" bind:group={answer} />
            Road
          </label>
        </li>
        <li>
          <label>
            <input type="radio" name="choice" value="tree" bind:group={answer} />
            Tree
          </label>
        </li>
        <li>
          <label>
            <input type="radio" name="choice" value="friend" bind:group={answer} />
            Friend
          </label>
        </li>
      </ul>
    </div>
  
    <!-- Challenge Step 2: Take a Picture of Your Shoe -->
    <div class="mb-8">
      <h2 class="text-xl font-bold">Step 2: Now grab one of your shoes and take a picture of the shoe.</h2>
      <input type="file" accept="image/*" capture="camera" on:change={handleFileUpload} class="mt-4" />
    </div>
  
    <!-- Show Result After Photo is Uploaded -->
    {#if showPhotoResult}
      <div class="mt-8 bg-gray-100 p-4 rounded-lg">
        <h2 class="text-xl font-bold">Your shoes are old!</h2>
        {#if photo}
          <p class="mt-2">Here’s the photo you uploaded:</p>
          <img src={URL.createObjectURL(photo)} alt="Uploaded Shoe" class="mt-4 max-w-xs" />
        {/if}
      </div>
    {/if}
  </div>
  
  