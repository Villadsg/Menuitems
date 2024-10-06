<script lang="ts">
    import { databases, ID } from '$lib/appwrite'; 
    import { goto } from '$app/navigation';
  
    export let documentData = {};
    export let translatedCollectionId = '66fe6ac90010d9e9602f';
    export let apiKey = '41ea25a3-4a88-4345-9ed9-40a99dcda151:fx';
  
    let translatedDocument = null;
    let message = '';
  
    const translateText = async (text) => {
      try {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
          },
          body: new URLSearchParams({
            text: text,
            target_lang: 'ES',
          }),
        });
  
        const result = await response.json();
        return result.translations[0]?.text || text; // Return translated text or fallback to original
      } catch (error) {
        console.error('Error translating text:', error);
        return text; // Fallback to original if there's an error
      }
    };
  
    const createTranslatedDocument = async () => {
      try {
        // Translate document fields to Spanish
        const translatedData = {
          Route_name: await translateText(documentData.Route_name),
          Description: await translateText(documentData.Description),
          steps_in_route: await Promise.all(documentData.steps_in_route.map(step => translateText(step))),
          quiz_question_answer: await Promise.all(documentData.quiz_question_answer.map(answer => translateText(answer))),
          lat: documentData.lat,
          lng: documentData.lng,
          userId: documentData.userId,
          photoFileId: documentData.photoFileId,
          dateModified: documentData.dateModified
        };
  
        // Store the translated document in the specified collection
        translatedDocument = await databases.createDocument(
          documentData.databaseId, // Assuming this is passed from the parent component
          translatedCollectionId,
          ID.unique(),
          translatedData
        );
        message = 'Translated document successfully created!';
      } catch (error) {
        message = `Failed to create translated document. Error: ${error.message}`;
      }
    };
  
    // This function will be triggered by the parent component when the main document is submitted
    export const translateAndStoreDocument = async () => {
      await createTranslatedDocument();
      setTimeout(() => {
        goto('/'); // Redirect to main page after success
      }, 4000);
    };
  </script>
  
  <div class="pt-20">
    <div class="space-y-4 max-w-md mx-auto">
      {#if translatedDocument}
        <h2 class="text-xl font-bold">Translation Success!</h2>
        <p>Translated document was created successfully.</p>
      {:else if message}
        <p>{message}</p>
      {/if}
    </div>
  </div>
  