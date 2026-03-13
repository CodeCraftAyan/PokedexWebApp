let currentLanguage = 'en';
let currentPokemonQuery = null;
const localizationCache = new Map();
const languageCodes = {
    en: ['en'],
    ja: ['ja-Hrkt', 'ja']
};

const statLabelFallbacks = {
    en: {
        hp: 'HP',
        attack: 'Attack',
        defense: 'Defense',
        'special-attack': 'Special Attack',
        'special-defense': 'Special Defense',
        speed: 'Speed',
        accuracy: 'Accuracy',
        evasion: 'Evasion'
    },
    ja: {
        hp: 'HP',
        attack: 'こうげき',
        defense: 'ぼうぎょ',
        'special-attack': 'とくこう',
        'special-defense': 'とくぼう',
        speed: 'すばやさ',
        accuracy: 'めいちゅう',
        evasion: 'かいひ'
    }
};

const uiTranslations = {
    en: {
        appTitle: 'Pokedex',
        pokemonFact: 'The Pokedex is your ultimate Pokémon companion, offering detailed information on every Pokémon, including stats, abilities, and evolution paths, making it easy to explore and enhance your Pokémon journey.',
        searchPlaceholder: 'Search Pokémon...',
        searchButton: 'Search',
        descriptionLabel: 'Description',
        heightLabel: 'Height',
        weightLabel: 'Weight',
        abilitiesLabel: 'ABILITIES',
        attacksLabel: 'ATTACKS',
        closeAlertBtn: 'Close',
        toggleButton: '🇯🇵 日本語',
        notFound: 'Pokemon not found. Please try again.',
        noDescription: 'No description available.'
    },
    ja: {
        appTitle: 'ポケデックス',
        pokemonFact: 'ポケデックスは、すべてのポケモンのステータス、特性、進化情報を確認できる、あなたの冒険に欠かせないパートナーです。',
        searchPlaceholder: 'ポケモンを検索...',
        searchButton: '検索',
        descriptionLabel: '説明',
        heightLabel: '高さ',
        weightLabel: '重さ',
        abilitiesLabel: 'とくせい',
        attacksLabel: 'わざ',
        closeAlertBtn: '閉じる',
        toggleButton: '🇺🇸 English',
        notFound: 'ポケモンが見つかりませんでした。もう一度お試しください。',
        noDescription: '説明がありません。'
    }
};

const applyUiLanguage = () => {
    const t = uiTranslations[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.getElementById('appTitle').textContent = t.appTitle;
    document.getElementById('pokemonFact').textContent = t.pokemonFact;
    document.getElementById('pokemonInput').placeholder = t.searchPlaceholder;
    document.getElementById('searchButton').textContent = t.searchButton;
    document.getElementById('descriptionLabel').textContent = t.descriptionLabel;
    document.getElementById('heightLabel').textContent = t.heightLabel;
    document.getElementById('weightLabel').textContent = t.weightLabel;
    document.getElementById('abilitiesLabel').textContent = t.abilitiesLabel;
    document.getElementById('attacksLabel').textContent = t.attacksLabel;
    document.getElementById('closeAlertBtn').textContent = t.closeAlertBtn;
    document.getElementById('langToggle').textContent = t.toggleButton;
};

const toEnglishLabel = (value) => value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getLocalizedNameFromEntries = (entries) => {
    if (!Array.isArray(entries)) return null;
    const preferredCodes = languageCodes[currentLanguage] || [currentLanguage];
    for (const code of preferredCodes) {
        const match = entries.find(item => item.language?.name === code);
        if (match?.name) return match.name;
    }
    return null;
};

const getLocalizedResourceName = async (resourceUrl, fallbackName) => {
    const cacheKey = `${currentLanguage}:${resourceUrl}`;
    if (localizationCache.has(cacheKey)) {
        return localizationCache.get(cacheKey);
    }

    try {
        const response = await fetch(resourceUrl);
        const data = await response.json();
        const localized = getLocalizedNameFromEntries(data.names);
        const value = localized || (currentLanguage === 'en' ? toEnglishLabel(fallbackName) : fallbackName);
        localizationCache.set(cacheKey, value);
        return value;
    } catch {
        return currentLanguage === 'en' ? toEnglishLabel(fallbackName) : fallbackName;
    }
};

const getStatDisplayName = (statName, localizedValue) => {
    const fallback = statLabelFallbacks[currentLanguage]?.[statName];
    if (currentLanguage === 'ja') {
        return fallback || localizedValue || statName;
    }
    return fallback || localizedValue || toEnglishLabel(statName);
};

const pokemonFetchData = async (query) => {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${query.toLowerCase()}`);
  return response.json();
  };

  const pokemonFetchEvolutionChain = async (speciesUrl) => {
  const speciesResponse = await fetch(speciesUrl);
  const speciesData = await speciesResponse.json();
  const chainResponse = await fetch(speciesData.evolution_chain.url);
  return (await chainResponse.json()).chain;
  }

  const renderEvolutionChain = async (chain) => {
  const evolutions = [];
  let current = chain;

  while (current) {
      const speciesResponse = await fetch(current.species.url);
      const speciesData = await speciesResponse.json();

      const pokemonResponse = await fetch(speciesData.varieties[0].pokemon.url);
      const pokemonData = await pokemonResponse.json();
      const sprite = pokemonData.sprites.other['official-artwork'].front_default;
    const localizedName = getLocalizedNameFromEntries(speciesData.names) || current.species.name;

      const bgColor = getRandomBackgroundColor();
      evolutions.push({ name: localizedName, image: sprite, backgroundColor: bgColor });
      current = current.evolves_to[0];
  }

  return evolutions.map(evo => `
      <div class="flex flex-col items-center">
          <img src="${evo.image}" alt="${evo.name}" class="h-30 w-30 rounded-lg shadow-md ${evo.backgroundColor}">
          <p class="text-gray-700 font-semibold">${evo.name.toUpperCase()}</p>
      </div>
  `).join('');
  };

  const renderPokemon = async (query) => {
  try {
      currentPokemonQuery = query;
      const data = await pokemonFetchData(query);

      document.getElementById('pokemonName').textContent = data.name.toUpperCase();
      document.getElementById('pokemonID').textContent = `#${data.id}`;

      document.getElementById('pokemonImage').src = data.sprites.other['official-artwork'].front_default;

            const localizedTypes = await Promise.all(
                data.types.map(type => getLocalizedResourceName(type.type.url, type.type.name))
            );
            const types = data.types.map((type, idx) => {
                    const typeLabel = currentLanguage === 'en' ? localizedTypes[idx].toUpperCase() : localizedTypes[idx];
                    return `<span class="text-white w-25 text-center px-2 py-1 rounded-lg" style="background-color: ${getTypeColor(type.type.name)}">${typeLabel}</span>`;
            }).join('');
      document.getElementById('types').innerHTML = types;

            const localizedStats = await Promise.all(
                data.stats.map(stat => getLocalizedResourceName(stat.stat.url, stat.stat.name))
            );
            const stats = data.stats.map((stat, idx) => `
          <div>
                            <p class="text-gray-700 font-semibold">${getStatDisplayName(stat.stat.name, localizedStats[idx])}</p>
              <p class="text-gray-500">${stat.base_stat}</p>
          </div>
      `).join('');
      document.getElementById('stats').innerHTML = stats;

      const evolutionChain = await pokemonFetchEvolutionChain(data.species.url);
      const evolutionHTML = await renderEvolutionChain(evolutionChain);
      document.getElementById('evolutions').innerHTML = evolutionHTML;

      document.getElementById('pokemonHeight').textContent = `${(data.height / 10).toFixed(1)} m`;
      document.getElementById('pokemonWeight').textContent = `${(data.weight / 10).toFixed(1)} kg`;

      // Fetch and display description (and language-specific name)
      const speciesResponse = await fetch(data.species.url);
      const speciesData = await speciesResponse.json();
      const localizedPokemonName = getLocalizedNameFromEntries(speciesData.names);
      if (localizedPokemonName) document.getElementById('pokemonName').textContent = localizedPokemonName;
      const descriptionEntry = speciesData.flavor_text_entries.find(entry => (languageCodes[currentLanguage] || [currentLanguage]).includes(entry.language.name));
    const description = descriptionEntry ? descriptionEntry.flavor_text.replace(/\f/g, " ") : uiTranslations[currentLanguage].noDescription;
      document.getElementById('pokemonDescription').textContent = description;

      // Display Abilities
      const localizedAbilities = await Promise.all(
          data.abilities.map(ability => getLocalizedResourceName(ability.ability.url, ability.ability.name))
      );
      const abilities = data.abilities.map((ability, idx) => {
          const randomColor = getRandomAttackColor();  
          const abilityName = currentLanguage === 'en'
              ? toEnglishLabel(localizedAbilities[idx])
              : localizedAbilities[idx];
          return `<li class="py-2 px-4 rounded-sm ${randomColor} text-white">${abilityName}</li>`;
      }).join('');
      document.getElementById('abilities').querySelector('ul').innerHTML = abilities;
      
            const attackMoves = data.moves.slice(0, 10);
            const localizedMoves = await Promise.all(
                attackMoves.map(move => getLocalizedResourceName(move.move.url, move.move.name))
            );
            const attacks = attackMoves.map((move, idx) => {
          const attackColor = getRandomAttackColor();
                    const moveName = currentLanguage === 'en'
                        ? toEnglishLabel(localizedMoves[idx])
                        : localizedMoves[idx];
                    return `<li class="py-2 px-4 rounded-sm text-white ${attackColor}">${moveName}</li>`;
      }).join('');
      document.getElementById('attacks').querySelector('ul').innerHTML = attacks;

      // Show the pokemon details after fetching data
      document.getElementById('pokemonDetails').style.display = 'block';

      // For Scrollback to top of the screen
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  } catch (error) {
      showCustomAlert(uiTranslations[currentLanguage].notFound);
  }
  }

  const getTypeColor = (type) => {
  const typeColors = {
      fire: '#F08030',       
      water: '#4A90E2',      
      grass: '#48C774',      
      electric: '#FFD700', 
      normal: '#B8B8B8',    
      bug: '#A3C644',        
      poison: '#9B59B6',  
      flying: '#82AAFF',     
      ground: '#E8A878',     
      rock: '#C7A06B',       
      psychic: '#FF77AB', 
      ice: '#AEEEEE',      
      dragon: '#6A5ACD', 
      dark: '#4F4F4F',      
      steel: '#C0C0C0',    
      fairy: '#FFB0F0',     
      ghost: '#7B68EE',     
      fighting: '#E57373',   
  };

  return typeColors[type] || '#A8A878';
  };

  const getRandomBackgroundColor = () => {
  const colors = [
      'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 
      'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-teal-200', 
      'bg-violet-200', 'bg-slate-200', 'bg-sky-200', 'bg-zinc-200', 
      'bg-rose-200', 'bg-orange-200', 'bg-emerald-200', 'bg-fuchsia-200'  
  ]
  return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRandomAttackColor = () => {
  const colors = [
      'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 
      'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400', 
      'bg-violet-400', 'bg-slate-400', 'bg-sky-400', 'bg-zinc-400', 
      'bg-rose-400', 'bg-orange-400', 'bg-emerald-400', 'bg-fuchsia-400'  
  ]
  return colors[Math.floor(Math.random() * colors.length)];
  };

  document.getElementById('pokemonSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = document.getElementById('pokemonInput').value.trim();
  renderPokemon(query);
  });

  function showCustomAlert(message) {
  const alertBox = document.getElementById('customAlert');
  const alertMessage = document.getElementById('customAlertMessage');
  alertMessage.textContent = message;
  alertBox.classList.remove('hidden');
  }

  function hideCustomAlert() {
  const alertBox = document.getElementById('customAlert');
  alertBox.classList.add('hidden');
  }

  async function fetchPokemon() {
    const container = document.getElementById("pokemon-container");
    for (let i = 1; i <= 1000; i++) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
            const data = await response.json();

            const card = document.createElement("div");
            card.className = "p-5 rounded-lg shadow-xl text-center cursor-pointer hover:bg-gray-100 transition";
            card.innerHTML = `
                <img src="${data.sprites.other['official-artwork'].front_default}" alt="${data.name}" class="mx-auto w-32 h-32">
                <h2 class="text-xl font-bold capitalize mt-4">${data.name}</h2>
                <p class="text-gray-400">#${data.id}</p>
                <p class="text-blue-500">${data.types.map(t => t.type.name).join(" | ").toUpperCase()}</p>
            `;

            // ✅ Add click event to show detailed Pokémon info
            card.addEventListener("click", () => {
                renderPokemon(data.name); // Call detailed render function
            });

            container.appendChild(card);
        } catch (err) {
            console.error(`Failed to fetch Pokémon #${i}`, err);
        }
    }
}

fetchPokemon();
applyUiLanguage();

document.getElementById('langToggle').addEventListener('click', () => {
    currentLanguage = currentLanguage === 'en' ? 'ja' : 'en';
    applyUiLanguage();
    if (currentPokemonQuery) renderPokemon(currentPokemonQuery);
});
