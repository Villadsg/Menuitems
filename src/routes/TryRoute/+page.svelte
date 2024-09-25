<script lang="ts">
import { selectedLanguage } from '$lib/languageStore';
  import { onMount } from 'svelte';

  let language = 'english'; // Default language
  let answer = '';
  let photo = null;
  let showPhotoResult = false;
  let points = 0;
  let showResult = false;

  // Subscribe to the language store to get the initially selected language
  $: selectedLanguage.subscribe(value => {
    language = value;
  });

  // Update the store whenever the language is changed
  const handleLanguageChange = () => {
    selectedLanguage.set(language);
  };

  const handleFileUpload = (event) => {
    photo = event.target.files[0];
    showPhotoResult = true;
  };

  const handleSubmit = () => {
    if (answer === '') {
      alert('Please select an option.');
    } else {
      points = photo ? 100 : 50;
      showResult = true;
    }
  };

  const translations = {
    english: {
      title: 'Park Challenge',
      step1Title: 'Step 1: Go to the nearest park and take a photo of the grass.',
      multipleChoice: 'What got your attention?',
      choices: {
        tree: 'A Tree',
        shop: 'A Shop',
        person: 'A Person',
        squirrel: 'A Squirrel',
        gypsy: 'A Gypsy',
      },
      step2Title: 'Step 2: Now reflect on what caught your attention.',
      yourShoesAreOld: 'Excellent grass, don\'t forget to touch it!',
    },
    spanish: {
      title: 'Desafío del Parque',
      step1Title: 'Paso 1: Ve al parque más cercano y toma una foto del césped.',
      multipleChoice: '¿Qué te llamó la atención?',
      choices: {
        tree: 'Un Árbol',
        shop: 'Una Tienda',
        person: 'Una Persona',
        squirrel: 'Una Ardilla',
        gypsy: 'Un Gitano',
      },
      step2Title: 'Paso 2: Ahora reflexiona sobre lo que te llamó la atención.',
      yourShoesAreOld: '¡Césped excelente, no olvides tocarlo!',
    },
    italian: {
      title: 'Sfida del Parco',
      step1Title: 'Passo 1: Vai al parco più vicino e scatta una foto dell\'erba.',
      multipleChoice: 'Cosa ti ha colpito?',
      choices: {
        tree: 'Un Albero',
        shop: 'Un Negozio',
        person: 'Una Persona',
        squirrel: 'Uno Scoiattolo',
        gypsy: 'Un Gitano',
      },
      step2Title: 'Passo 2: Rifletti su ciò che ha catturato la tua attenzione.',
      yourShoesAreOld: 'Erba eccellente, non dimenticare di toccarla!',
    },
    japanese: {
      title: '公園チャレンジ',
      step1Title: 'ステップ1：最寄りの公園に行って芝生の写真を撮ってください。',
      multipleChoice: '何が目につきましたか？',
      choices: {
        tree: '木',
        shop: 'お店',
        person: '人',
        squirrel: 'リス',
        gypsy: 'ジプシー',
      },
      step2Title: '気を引いたものについて振り返りましょう。',
      yourShoesAreOld: '素晴らしい芝生、触れるのを忘れないでください!',
    },
    danish: {
      title: 'Parkudfordring',
      step1Title: 'Trin 1: Gå til den nærmeste park og tag et billede af græsset.',
      multipleChoice: 'Hvad fangede din opmærksomhed?',
      choices: {
        tree: 'Et Træ',
        shop: 'En Butik',
        person: 'En Person',
        squirrel: 'Et Egern',
        gypsy: 'En Sigøjner',
      },
      step2Title: 'Trin 2: Reflekter nu over hvad der fangede din opmærksomhed.',
      yourShoesAreOld: 'Fremragende græs, glem ikke at røre ved det!',
    },
  };
</script>



<div class="max-w-3xl mx-auto p-8">
  <!-- Language Selection Dropdown -->
  <div class="mb-6">
    <label for="language" class="font-bold">Select Language:</label>
    <select id="language" bind:value={language} on:change={handleLanguageChange} class="ml-2 p-1 border rounded">
      <option value="english">English</option>
      <option value="spanish">Spanish</option>
      <option value="italian">Italian</option>
      <option value="japanese">Japanese</option>
      <option value="danish">Danish</option>
    </select>
    <p>Changing to another language affects the score negatively</p>
  </div>

  <!-- The rest of your page using the selected language -->
  <h1 class="text-3xl font-bold mb-6">{translations[language].title}</h1>

  <div class="mb-8">
    <h2 class="text-xl font-bold">{translations[language].step1Title}</h2>
    <input type="file" accept="image/*" capture="camera" on:change={handleFileUpload} class="mt-4" />
  </div>

  {#if showPhotoResult}
    <div class="mt-8 bg-gray-100 p-4 rounded-lg">
      <h2 class="text-xl font-bold">{translations[language].yourShoesAreOld}</h2>
      {#if photo}
        <img src={URL.createObjectURL(photo)} alt="Uploaded Grass Photo" class="mt-4 max-w-xs" />
      {/if}
    </div>
  {/if}

  <div class="mb-8">
    <h2 class="text-xl font-bold">{translations[language].multipleChoice}</h2>
    <ul class="space-y-2">
      <li>
        <label>
          <input type="radio" name="choice" value="tree" bind:group={answer} />
          {translations[language].choices.tree}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="shop" bind:group={answer} />
          {translations[language].choices.shop}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="person" bind:group={answer} />
          {translations[language].choices.person}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="squirrel" bind:group={answer} />
          {translations[language].choices.squirrel}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="gypsy" bind:group={answer} />
          {translations[language].choices.gypsy}
        </label>
      </li>
    </ul>
  </div>

  <button on:click={handleSubmit} class="px-4 py-2 bg-blue-500 text-white rounded">
    Submit
  </button>

  {#if showResult}
    <div class="mt-8 bg-gray-100 p-4 rounded-lg">
      <h3 class="mt-4 text-xl font-bold">Your Score: {points} points</h3>
    </div>
  {/if}
</div>
