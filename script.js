class BettorApp {
    constructor() {
        this.gameData = {};
        this.allGames = [];
        this.currentSource = 'all';
        this.autocompleteItems = [];
        this.selectedAutocompleteIndex = -1;
        
        this.init();
    }

    async init() {
        await this.loadGameData();
        this.setupEventListeners();
        this.setupAutocomplete();
        this.setupAboutModal();
    }

    async loadGameData() {
        const sources = ['dodi', 'fitgirl', 'kaoskrew', 'onlinefix', 'xatab'];
        
        for (const source of sources) {
            try {
                const response = await fetch(`magnet_data/${source}.json`);
                if (response.ok) {
                    const data = await response.json();
                    this.gameData[source] = data.downloads || [];
                    
                    // Add source information to each game
                    this.gameData[source].forEach(game => {
                        game.source = source;
                    });
                    
                    this.allGames.push(...this.gameData[source]);
                }
            } catch (error) {
                console.warn(`Failed to load ${source}.json:`, error);
            }
        }

        // Create autocomplete suggestions from all game titles
        this.autocompleteItems = [...new Set(this.allGames.map(game => game.title))];
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const radioInputs = document.querySelectorAll('.radio-inputs input[type=radio]');

        // Search button click
        searchBtn.addEventListener('click', () => {
            this.performSearch();
        });

        // Enter key in search input
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        // Auto-select all text on focus if input has value
        searchInput.addEventListener('focus', function() {
            if (this.value.length > 0) {
                this.select();
            }
        });

        // Radio filter change
        radioInputs.forEach(radio => {
            radio.addEventListener('change', () => {
                this.setActiveFilter(radio.value);
            });
        });

        // Click outside to close autocomplete
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-outer')) {
                this.hideAutocomplete();
            }
        });
    }

    setupAutocomplete() {
        const searchInput = document.getElementById('searchInput');
        const autocompleteDropdown = document.getElementById('autocomplete');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length < 2) {
                this.hideAutocomplete();
                return;
            }

            const filteredItems = this.autocompleteItems.filter(item =>
                item.toLowerCase().includes(query)
            ).slice(0, 10);

            this.showAutocomplete(filteredItems, query);
        });

        searchInput.addEventListener('keydown', (e) => {
            const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedAutocompleteIndex = Math.min(this.selectedAutocompleteIndex + 1, items.length - 1);
                    this.updateAutocompleteSelection(items);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedAutocompleteIndex = Math.max(this.selectedAutocompleteIndex - 1, -1);
                    this.updateAutocompleteSelection(items);
                    break;
                    
                case 'Enter':
                    if (this.selectedAutocompleteIndex >= 0 && items[this.selectedAutocompleteIndex]) {
                        e.preventDefault();
                        searchInput.value = items[this.selectedAutocompleteIndex].textContent;
                        this.hideAutocomplete();
                        this.performSearch();
                    }
                    break;
                    
                case 'Escape':
                    this.hideAutocomplete();
                    break;
            }
        });
    }

    showAutocomplete(items, query) {
        const autocompleteDropdown = document.getElementById('autocomplete');
        
        if (items.length === 0) {
            this.hideAutocomplete();
            return;
        }

        autocompleteDropdown.innerHTML = '';
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            
            // Highlight matching text
            const regex = new RegExp(`(${query})`, 'gi');
            const highlightedText = item.replace(regex, '<strong>$1</strong>');
            div.innerHTML = highlightedText;
            
            div.addEventListener('click', () => {
                document.getElementById('searchInput').value = item;
                this.hideAutocomplete();
                this.performSearch();
            });
            
            autocompleteDropdown.appendChild(div);
        });

        autocompleteDropdown.style.display = 'block';
        this.selectedAutocompleteIndex = -1;
    }

    updateAutocompleteSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.selectedAutocompleteIndex);
        });
    }

    hideAutocomplete() {
        const autocompleteDropdown = document.getElementById('autocomplete');
        autocompleteDropdown.style.display = 'none';
        this.selectedAutocompleteIndex = -1;
    }

    setActiveFilter(source) {
        this.currentSource = source;
        // Update radio states (handled by browser)
        // Immediately update results with current query
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.toLowerCase().trim();
        if (query) {
            this.performSearch();
        }
    }

    async performSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.toLowerCase().trim();
        
        if (!query) return;

        this.showLoading();
        this.hideAutocomplete();

        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        const results = this.searchGames(query);
        this.displayResults(results);
    }

    searchGames(query) {
        let gamesToSearch = this.allGames;

        // Filter by source if not "all"
        if (this.currentSource !== 'all') {
            gamesToSearch = this.gameData[this.currentSource] || [];
        }

        return gamesToSearch.filter(game => {
            const title = game.title.toLowerCase();
            return title.includes(query);
        });
    }

    showLoading() {
        document.getElementById('loadingSection').classList.remove('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
    }

    displayResults(results) {
        const loadingSection = document.getElementById('loadingSection');
        const resultsSection = document.getElementById('resultsSection');
        const resultsCount = document.getElementById('resultsCount');
        const resultsList = document.getElementById('resultsList');

        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // Update results count
        const count = results.length;
        resultsCount.textContent = `${count} result${count !== 1 ? 's' : ''} found`;

        // Clear previous results
        resultsList.innerHTML = '';

        if (count === 0) {
            resultsList.innerHTML = `
                <div class="result-item" style="text-align: center; color: rgba(255, 255, 255, 0.7);">
                    <p>No games found matching your search.</p>
                    <p>Try different keywords or check other sources.</p>
                </div>
            `;
            return;
        }

        // Display results
        results.forEach(game => {
            const resultItem = this.createResultItem(game);
            resultsList.appendChild(resultItem);
        });
    }

    createResultItem(game) {
        const div = document.createElement('div');
        div.className = 'result-item';

        const uploadDate = new Date(game.uploadDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        div.innerHTML = `
            <div class="result-title">${this.escapeHtml(game.title)}</div>
            <div class="result-meta">
                <div class="result-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                    <span>${game.fileSize}</span>
                </div>
                <div class="result-meta-item">
                    <svg class="lucide" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
                    <span>${uploadDate}</span>
                </div>
                <div class="source-badge">${game.source}</div>
            </div>
            <div class="result-actions">
                <a href="${game.uris[0]}" class="magnet-btn" target="_blank">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-magnet-icon lucide-magnet"><path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/></svg>
                    <span>Download Magnet</span>
                </a>
            </div>
        `;

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupAboutModal() {
        const aboutBtn = document.querySelector('.about-btn');
        const aboutOverlay = document.getElementById('aboutOverlay');
        const aboutClose = document.getElementById('aboutClose');
        // Open overlay
        aboutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            aboutOverlay.classList.add('active');
        });
        // Close overlay
        aboutClose.addEventListener('click', () => {
            aboutOverlay.classList.remove('active');
        });
        // Close when clicking outside modal
        aboutOverlay.addEventListener('click', (e) => {
            if (e.target === aboutOverlay) {
                aboutOverlay.classList.remove('active');
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BettorApp();
}); 