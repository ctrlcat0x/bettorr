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
        const filterBtns = document.querySelectorAll('.filter-btn');

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

        // Filter button clicks
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveFilter(btn.dataset.source);
            });
        });

        // Click outside to close autocomplete
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-wrapper')) {
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
        
        // Update button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.source === source);
        });
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
                    <i class="fas fa-hdd"></i>
                    <span>${game.fileSize}</span>
                </div>
                <div class="result-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${uploadDate}</span>
                </div>
                <div class="source-badge">${game.source}</div>
            </div>
            <div class="result-actions">
                <a href="${game.uris[0]}" class="magnet-btn" target="_blank">
                    <i class="fas fa-magnet"></i>
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BettorApp();
}); 