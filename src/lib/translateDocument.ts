// src/lib/translateDocument.ts
import { databases, functions } from '$lib/appwrite'; // Import Appwrite client

const langlang = 'es';

// Function to call the Appwrite function for translation
async function translateText(text: string, targetLang: string) {
  try {
    // Call the Appwrite Cloud function you created
    const response = await functions.createExecution('66ffb043000e5dfc70f9', JSON.stringify({
      text: text,
      target_lang: targetLang.toUpperCase(),
    }));

    const result = JSON.parse(response.response);
    return result.translation || text; // Return the translated text or fallback to original
  } catch (error) {
    console.error("Error executing translation function:", error);
    throw error;
  }
}

// Function to create the translated replica document
export async function createTranslatedDocument(originalDoc: any, userId: string, translatedCollectionId: string) {
  try {
    const translatedRouteName = await translateText(originalDoc.Route_name, langlang);
    const translatedDescription = await translateText(originalDoc.Description, langlang);
    const translatedSteps = await Promise.all(originalDoc.steps_in_route.map((desc: string) => translateText(desc, langlang)));
    const translatedQuestion = await translateText(originalDoc.quiz_question_answer[0], langlang);
    const translatedCorrectAnswer = await translateText(originalDoc.quiz_question_answer[1], langlang);
    const translatedAnswers = await Promise.all(originalDoc.quiz_question_answer.slice(2).map((ans: string) => translateText(ans, langlang)));

    const translatedDoc = {
      Route_name: translatedRouteName,
      Description: translatedDescription,
      lat: originalDoc.lat,
      lng: originalDoc.lng,
      steps_in_route: translatedSteps,
      quiz_question_answer: [translatedQuestion, translatedCorrectAnswer, ...translatedAnswers],
      userId: userId,
      dateModified: new Date().toISOString(),
      photoFileId: originalDoc.photoFileId
    };

    await databases.createDocument('databaseId', translatedCollectionId, 'unique()', translatedDoc);
  } catch (error) {
    console.error("Error creating translated document:", error);
  }
}
