<script lang="ts">
  let selectedLanguage = 'english'; // Default language
  let answer = ''; // Store the answer for the multiple choice quiz
  let photo = null; // Store the photo taken by the user
  let showPhotoResult = false; // Control when to show the photo result

  const handleFileUpload = (event) => {
    photo = event.target.files[0]; // Capture the uploaded photo
    showPhotoResult = true;
  };

  const translations = {
    english: {
      title: 'Tryout Route Challenge',
      step1Title: 'Step 1: Go to your window and select what you see.',
      multipleChoice: 'Multiple choice:',
      choices: {
        car: 'Car',
        road: 'Road',
        tree: 'Tree',
        friend: 'Friend',
      },
      step2Title: 'Step 2: Now grab one of your shoes and take a picture of the shoe.',
      yourShoesAreOld: 'Your shoes are old!',
    },
    spanish: {
      title: 'Desafío de Ruta de Prueba',
      step1Title: 'Paso 1: Ve a tu ventana y selecciona lo que ves.',
      multipleChoice: 'Elección múltiple:',
      choices: {
        car: 'Coche',
        road: 'Carretera',
        tree: 'Árbol',
        friend: 'Amigo',
      },
      step2Title: 'Paso 2: Ahora agarra uno de tus zapatos y toma una foto del zapato.',
      yourShoesAreOld: '¡Tus zapatos son viejos!',
    },
    italian: {
      title: 'Sfida del Percorso di Prova',
      step1Title: 'Passo 1: Vai alla tua finestra e seleziona ciò che vedi.',
      multipleChoice: 'Scelta multipla:',
      choices: {
        car: 'Auto',
        road: 'Strada',
        tree: 'Albero',
        friend: 'Amico',
      },
      step2Title: 'Passo 2: Ora prendi una delle tue scarpe e fai una foto della scarpa.',
      yourShoesAreOld: 'Le tue scarpe sono vecchie!',
    },
    japanese: {
      title: 'トライアウトルートチャレンジ',
      step1Title: 'ステップ1：窓に行って見えるものを選んでください。',
      multipleChoice: '選択肢：',
      choices: {
        car: '車',
        road: '道路',
        tree: '木',
        friend: '友達',
      },
      step2Title: 'ステップ2：今すぐ靴の一つを手に取り、その写真を撮ってください。',
      yourShoesAreOld: 'あなたの靴は古いです！',
    },
    danish: {
      title: 'Prøvetursudfordring',
      step1Title: 'Trin 1: Gå til dit vindue og vælg, hvad du ser.',
      multipleChoice: 'Flere valgmuligheder:',
      choices: {
        car: 'Bil',
        road: 'Vej',
        tree: 'Træ',
        friend: 'Ven',
      },
      step2Title: 'Trin 2: Tag nu en af dine sko og tag et billede af skoen.',
      yourShoesAreOld: 'Dine sko er gamle!',
    },
  };
</script>

<div class="max-w-3xl mx-auto p-8">
  <!-- Language Selection -->
  <div class="mb-6">
    <label for="language" class="font-bold">Select Language:</label>
    <select id="language" bind:value={selectedLanguage} class="ml-2 p-1 border rounded">
      <option value="english">English</option>
      <option value="spanish">Spanish</option>
      <option value="italian">Italian</option>
      <option value="japanese">Japanese</option>
      <option value="danish">Danish</option>
    </select>
    <p>Each language change will be recorded and affect the score</p>
  </div>

  <h1 class="text-3xl font-bold mb-6">{translations[selectedLanguage].title}</h1>

  <!-- Challenge Step 1: Route Description and Quiz -->
  <div class="mb-8">
    <h2 class="text-xl font-bold">{translations[selectedLanguage].step1Title}</h2>
    <p class="mt-4">{translations[selectedLanguage].multipleChoice}</p>
    <ul class="space-y-2">
      <li>
        <label>
          <input type="radio" name="choice" value="car" bind:group={answer} />
          {translations[selectedLanguage].choices.car}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="road" bind:group={answer} />
          {translations[selectedLanguage].choices.road}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="tree" bind:group={answer} />
          {translations[selectedLanguage].choices.tree}
        </label>
      </li>
      <li>
        <label>
          <input type="radio" name="choice" value="friend" bind:group={answer} />
          {translations[selectedLanguage].choices.friend}
        </label>
      </li>
    </ul>
  </div>

  <!-- Challenge Step 2: Take a Picture of Your Shoe -->
  <div class="mb-8">
    <h2 class="text-xl font-bold">{translations[selectedLanguage].step2Title}</h2>
    <input type="file" accept="image/*" capture="camera" on:change={handleFileUpload} class="mt-4" />
  </div>

  <!-- Show Result After Photo is Uploaded -->
  {#if showPhotoResult}
    <div class="mt-8 bg-gray-100 p-4 rounded-lg">
      <h2 class="text-xl font-bold">{translations[selectedLanguage].yourShoesAreOld}</h2>
      {#if photo}
        <img src={URL.createObjectURL(photo)} alt="Uploaded Shoe" class="mt-4 max-w-xs" />
      {/if}
    </div>
  {/if}
</div>
