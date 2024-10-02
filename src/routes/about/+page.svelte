<script>
    // You can import any Flowbite-Svelte components here if needed.
    import { Card, Avatar, Button } from 'flowbite-svelte';
  </script>
  
  <div class="flex flex-col items-center justify-center py-10">
    <!-- Creator's Avatar or Profile Image -->
    <Card class="w-full max-w-sm text-center">
      <div class="flex justify-center mb-4">
        <Avatar
          img="https://via.placeholder.com/150" 
          alt="Creator's Image"
          class="rounded-full h-32 w-32"
        />
      </div>
  
      <!-- About the Creator -->
      <h1 class="text-2xl font-bold mb-2">About the Creator</h1>
      <p class="text-gray-600 text-base mb-4">
        Hi! I'm Villads
  
      <p class="text-gray-600 text-base mb-4">
        When I’m not coding or working on data projects, I love exploring new cultures, 
        traveling, and constantly learning new things. Feel free to reach out and connect!
      </p>
  
      <!-- Contact / Social Links -->
      <div class="flex justify-center mt-4">
        <Button href="mailto:villadsg@outlook.com" pill={true} class="mr-2">
          Contact Me
        </Button>
   
      </div>
    </Card>
  </div>
  