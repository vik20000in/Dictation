// Global variables
let dictationData = null;
let utterances = [];
let currentIndex = 0;
let speedFactor = 0.3; // Default starting speed set to 60%
let isPaused = false;
const themeSelector = document.getElementById('themeSelector');
const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
    themeSelector.value = savedTheme;

   

themeSelector.addEventListener('change', (e) => {
        document.body.className = e.target.value;
        localStorage.setItem('theme', e.target.value);
    });
// Load JSON data from dictation.json
fetch('data/categories.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        dictationData = data;
        populateCategories();
    })
    .catch(error => {
        console.error('Error loading JSON:', error);
        alert('Failed to load dictation data. Please ensure dictation.json is in the same directory and correctly formatted.');
    });

// Populate the category dropdown
function populateCategories() {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    dictationData.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    categorySelect.disabled = false;
}

// Populate subcategory dropdown when a category is selected
document.getElementById('categorySelect').addEventListener('change', function() {
    const selectedCategory = this.value;
    const subcategorySelect = document.getElementById('subcategorySelect');
    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
    if (selectedCategory) {
        const category = dictationData.categories.find(cat => cat.name === selectedCategory);
        category.subcategories.forEach(subcat => {
            const option = document.createElement('option');
            option.value = subcat.name;
            option.textContent = subcat.name;
            subcategorySelect.appendChild(option);
        });
        subcategorySelect.disabled = false;
    } else {
        subcategorySelect.disabled = true;
    }
    document.getElementById('startButton').disabled = true;
});

// Enable the Start button when a subcategory is selected
document.getElementById('subcategorySelect').addEventListener('change', function() {
    document.getElementById('startButton').disabled = this.value === '';
});

// Add voice selector
const voiceSelect = document.createElement('select');
voiceSelect.id = 'voiceSelect';
document.querySelector('.controls').appendChild(voiceSelect);

// Populate voices
function populateVoices() {
    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '<option value="">Default Voice</option>';
    voices.forEach(voice => {
        if(voice.name.endsWith('India')) {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    }
    });
}
speechSynthesis.onvoiceschanged = populateVoices;
populateVoices(); // Initial call

// Start the dictation process
document.getElementById('startButton').addEventListener('click', function() {
    const subcategorySelect = document.getElementById('subcategorySelect');
    const selectedSubcategory = subcategorySelect.value;
    const categorySelect = document.getElementById('categorySelect');
    const selectedCategory = categorySelect.value;
    const category = dictationData.categories.find(cat => cat.name === selectedCategory);
    const subcategory = category.subcategories.find(sub => sub.name === selectedSubcategory);
    const phraseFile = subcategory.phraseFile;
   // Fetch the phrases
   fetch(phraseFile)
   .then(response => {
       if (!response.ok) {
           throw new Error(`Failed to load ${phraseFile}`);
       }
       return response.json();
   })
   .then(data => {
       const phrases = data.phrases;

       // Clear any ongoing speech
       speechSynthesis.cancel();

       // Prepare utterances (each phrase repeated 3 times)
       utterances = [];
       const selectedVoice = voiceSelect.value;
       const voices = speechSynthesis.getVoices();
       phrases.forEach(phrase => {
           for (let i = 0; i < 3; i++) {
               const utterance = new SpeechSynthesisUtterance(phrase);
               if (selectedVoice) {
                utterance.voice = voices.find(v => v.name === selectedVoice);
            }
               utterance.words = phrase.split(' '); // Split phrase into words
               utterance.onstart = function() {
                   this.currentWordIndex = 0;
                //   document.getElementById('textDisplay').innerHTML = ''; // Clear display
               };
               utterance.onboundary = function(event) {
                   if (event.name === 'word' && this.currentWordIndex < this.words.length) {
                       const word = this.words[this.currentWordIndex];
                       if (i === 0) {
                           document.getElementById('textDisplay').innerHTML += word + ' '; // Append word
                       }
                       this.currentWordIndex++;
                   }
               };
               utterances.push(utterance);
           }
       });

       // Reset state
       currentIndex = 0;
       isPaused = false;
       document.getElementById('playPauseButton').textContent = '|| Pause';
       document.getElementById('playPauseButton').disabled = false;
       document.getElementById('stopButton').disabled = false;
     
       // Start speaking
       speakNext();
   })
   .catch(error => {
       console.error('Error loading phrases:', error);
       alert(`Failed to load phrases for ${selectedSubcategory}. Please check the phrase file.`);
   });
});
// Speak the next phrase in the queue
function speakNext() {
    if (currentIndex < utterances.length) {
        const utterance = utterances[currentIndex];
        utterance.rate = speedFactor; // Apply current speed
        speechSynthesis.speak(utterance);
        currentIndex++;
        utterance.onend = speakNext; // Move to the next phrase when this one ends
    } else {
        alert('Dictation completed!');
        document.getElementById('playPauseButton').disabled = true;
        document.getElementById('stopButton').disabled = true;
     
    }
}

// Toggle between pause and play
document.getElementById('playPauseButton').addEventListener('click', function() {
    if (isPaused) {
        speechSynthesis.resume();
        this.textContent = '|| Pause';
    } else {
        speechSynthesis.pause();
        this.textContent = '▶ Play';
    }
    isPaused = !isPaused;
});

// Stop the dictation and reset
document.getElementById('stopButton').addEventListener('click', function() {
    speechSynthesis.cancel();
    currentIndex = 0;
    isPaused = false;
    document.getElementById('playPauseButton').textContent = 'Pause';
    document.getElementById('playPauseButton').disabled = true;
    document.getElementById('stopButton').disabled = true;
    
    document.getElementById('textDisplay').innerHTML = ''; // Clear text display
});

// Increase speed by 10%
document.getElementById('speedUpButton').addEventListener('click', function() {
    speedFactor = Math.min(10, speedFactor * 1.1);
    updateSpeedDisplay();
});

// Decrease speed by 10%
document.getElementById('speedDownButton').addEventListener('click', function() {
    speedFactor = Math.max(0.1, speedFactor / 1.1);
    updateSpeedDisplay();
});
// Update the speed display
function updateSpeedDisplay() {
    document.getElementById('speedDisplay').textContent = Math.round(speedFactor * 100) + '%';
}

// Initialize speed display
updateSpeedDisplay();
