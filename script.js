class BettorApp {
    constructor() {
        this.gameData = {};
        this.allGames = [];
        this.activeSources = ['dodi', 'fitgirl', 'kaoskrew', 'onlinefix', 'xatab', 'rutracker', 'shisuy', 'tinyrepacks'];
        this.currentQuery = '';
        this.autocompleteItems = [];
        this.selectedAutocompleteIndex = -1;
        this.sortKey = null;
        this.sortOrder = 'desc';
        this.remoteEndpoints = [
            'https://hydralinks.pages.dev/sources/fitgirl.json',
            'https://hydralinks.pages.dev/sources/dodi.json',
            'https://hydralinks.pages.dev/sources/xatab.json',
            'https://raw.githubusercontent.com/Shisuiicaro/source/refs/heads/main/shisuyssource.json',
        ];
        this.remoteCache = {};
        this.coverCache = {};
        this.viewModes = ['grid-4', 'grid-3', 'table'];
        this.viewModeKey = 'bettorr_view_mode';
        this.viewMode = localStorage.getItem(this.viewModeKey) || 'grid-4';
        // RAWG API key cycling
        this.rawgApiKeys = [
            'a7884c7fd3aa426682d33a193f162652',
            '387f6afe22434d7e9bc9cbf04b262973',
            '20822d1bdc9d470a9b7c65a5adb84b97'
        ];
        this.rawgApiKeyIndex = 0;
        this.rawgApiKeyUsage = 0;
        this.rawgApiKeyUsageLimit = 5; // switch after 5 requests
        // DOM Elements
        this.cacheDOMElements();
        
        // Initialization
        this.init();
    }

    cacheDOMElements() {
        this.els = {
            searchInput: document.getElementById('searchInput'),
            autocompleteDropdown: document.getElementById('autocomplete'),
            filterBtn: document.getElementById('filterBtn'),
            viewToggleBtn: document.getElementById('viewToggleBtn'),
            viewToggleIcon: document.getElementById('viewToggleIcon'),
            sourceFilterDropdown: document.getElementById('sourceFilterDropdown'),
            sourceCheckboxes: document.querySelectorAll('.source-filter-dropdown input[type="checkbox"]'),
            resultsTable: document.querySelector('.results-table'),
            resultsBody: document.getElementById('resultsBody'),
            initialState: document.getElementById('initialState'),
            loadingState: document.getElementById('loadingState'),
            noResultsState: document.getElementById('noResultsState'),
            themeToggleBtn: document.querySelector('[data-theme-btn]'),
            resultsContainer: document.getElementById('resultsContainer'),
        };
    }

    async init() {
        this.setupEventListeners();
        this.initializeTheme();
        await this.loadGameData();
        // After data is loaded, create a unique list of titles for autocomplete
        this.autocompleteItems = [...new Set(this.allGames.map(game => game.title))];
        this.showFeaturedGames();
    }

    setupEventListeners() {
        // Search and Autocomplete
        this.els.searchInput.addEventListener('input', () => this.handleAutocomplete());
        this.els.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
        this.els.searchInput.addEventListener('focus', (e) => {
            // Select all text when input is focused by click or tab
            setTimeout(() => {
                e.target.select();
            }, 0);
        });
        
        // View button and source filtering
        this.els.filterBtn.addEventListener('click', () => this.toggleSourceFilter());
        this.els.sourceCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.handleSourceChange());
        });

        // View mode toggle
        this.els.viewToggleBtn.addEventListener('click', () => this.toggleViewMode());

        // Global click listener to close dropdowns
        document.addEventListener('click', (e) => this.handleGlobalClick(e));

        // Theme toggling
        this.els.themeToggleBtn.addEventListener('click', () => this.cycleTheme());

        // Sorting event listeners
        this.sortableHeaders = Array.from(document.querySelectorAll('.sortable-header'));
        this.sortableHeaders.forEach(th => {
            th.addEventListener('click', (e) => {
                if (th.classList.contains('disabled')) return;
                this.handleSortClick(th);
            });
        });

        // Global keyboard shortcut: Ctrl+K or Cmd+K
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.els.searchInput.focus();
                setTimeout(() => {
                    this.els.searchInput.select();
                }, 0);
            }
        });
    }
    
    async loadGameData() {
        const sources = ['dodi', 'fitgirl', 'kaoskrew', 'onlinefix', 'xatab', 'rutracker', 'shisuy', 'tinyrepacks'];
        const cacheKey = 'bettorr_game_data_v1';
        const cacheTimeKey = 'bettorr_game_data_time_v1';
        const cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
        let useCache = false;
        let cachedData = null;
        try {
            const cached = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimeKey);
            if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < cacheTTL)) {
                cachedData = JSON.parse(cached);
                useCache = true;
            }
        } catch (e) { useCache = false; }

        if (useCache && cachedData) {
            this.gameData = cachedData.gameData || {};
            this.allGames = cachedData.allGames || [];
            return;
        }

        this.gameData = {};
        this.allGames = [];
        for (const source of sources) {
            try {
                const response = await fetch(`magnet_data/${source}.json`);
                if (response.ok) {
                    const data = (await response.json()).downloads || [];
                    data.forEach(game => {
                        game.source = source.charAt(0).toUpperCase() + source.slice(1);
                    });
                    this.gameData[source] = data;
                    this.allGames.push(...data);
                }
            } catch (error) {
                console.warn(`Failed to load ${source}.json:`, error);
            }
        }
        // Save to cache
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ gameData: this.gameData, allGames: this.allGames }));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {}
    }
    
    async fetchRemoteSearchResults(query) {
        for (const url of this.remoteEndpoints) {
            // Use cache if available
            let remoteData = this.remoteCache[url];
            if (!remoteData) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) continue;
                    const json = await response.json();
                    remoteData = json.downloads || [];
                    this.remoteCache[url] = remoteData;
                } catch (e) {
                    continue;
                }
            }
            const results = remoteData.filter(game =>
                game.title && game.title.toLowerCase().includes(query.toLowerCase())
            );
            if (results.length > 0) {
                return results;
            }
        }
        return [];
    }

    limitResultsPerSource(results, maxPerSource = 3) {
        const sourceCount = {};
        return results.filter(game => {
            const src = (game.source || '').toLowerCase();
            sourceCount[src] = (sourceCount[src] || 0) + 1;
            return sourceCount[src] <= maxPerSource;
        });
    }

    async performSearch(query) {
        this.currentQuery = query.toLowerCase().trim();
        this.hideAutocomplete();
        this.updateSortableHeaders();
        if (!this.currentQuery) {
            this.setResultsTitle('🔥 Hot Games Right Now');
            this.showState('initial');
            return;
        }
        this.setResultsTitle(`Search results for: ${this.els.searchInput.value}`);
        this.showState('loading', 'Searching...');
        setTimeout(async () => {
            let results = this.allGames.filter(game =>
                this.activeSources.includes(game.source.toLowerCase()) &&
                game.title.toLowerCase().includes(this.currentQuery)
            );
            results = this.getSortedResults(results);
            // Restrict to 3 per source
            results = this.limitResultsPerSource(results, 3);
            if (results.length > 0) {
                this.displayResults(results);
            } else {
                // Show loading indicator for remote search
                this.showState('loading', 'Searching with external sources...');
                // Fetch from remote endpoints
                let remoteResults = await this.fetchRemoteSearchResults(this.currentQuery);
                // Restrict to 3 per source for remote as well
                remoteResults = this.limitResultsPerSource(remoteResults, 3);
                if (remoteResults.length > 0) {
                    this.displayResults(remoteResults);
                } else {
                    this.setResultsTitle('');
                    this.showState('no-results');
                }
            }
        }, 300);
    }

    displayResults(results) {
        if (this.viewMode !== 'table') {
            this.renderResultsGrid(results);
        } else {
            this.renderResultsTable(results);
        }
    }

    renderResultsTable(results) {
        if (!this.els.resultsTable) {
            const table = document.createElement('table');
            table.className = 'results-table';
            const tbody = document.createElement('tbody');
            tbody.id = 'resultsBody';
            table.appendChild(tbody);
            this.els.resultsContainer.appendChild(table);
            this.els.resultsTable = table;
            this.els.resultsBody = tbody;
        }
        this.els.resultsTable.style.display = '';
        let grid = document.getElementById('resultsGrid');
        if (grid) grid.remove();

        let thead = this.els.resultsTable.querySelector('thead');
        if (thead) thead.remove();
        thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="col-name sortable-header" data-sort-key="title">Name
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
                </th>
                <th class="col-date sortable-header" data-sort-key="uploadDate">Upload Date
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
                </th>
                <th class="col-size sortable-header" data-sort-key="fileSize">File Size
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-narrow-wide-icon lucide-arrow-up-narrow-wide"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
                </th>
                <th class="col-source">Source</th>
                <th class="col-actions">Download</th>
            </tr>
        `;
        this.els.resultsTable.insertBefore(thead, this.els.resultsBody);
        this.els.resultsBody.innerHTML = '';
        if (results.length === 0) {
            this.setResultsTitle('');
            this.showState('no-results');
            return;
        }
        this.showState('results');
        results.forEach(game => {
            const row = this.createResultRow(game);
            this.els.resultsBody.appendChild(row);
        });
        // GSAP animation for table rows
        if (window.gsap) {
            gsap.from(
                this.els.resultsBody.querySelectorAll('tr'),
                {
                    opacity: 0,
                    y: 32,
                    duration: 0.6,
                    stagger: 0.08,
                    ease: 'power2.out',
                }
            );
        }
        // Re-attach sorting event listeners
        this.sortableHeaders = Array.from(this.els.resultsTable.querySelectorAll('.sortable-header'));
        this.sortableHeaders.forEach(th => {
            th.addEventListener('click', (e) => {
                if (th.classList.contains('disabled')) return;
                this.handleSortClick(th);
            });
        });
    }

    async renderResultsGrid(results) {
        // Hide table, show grid
        if (this.els.resultsTable) {
            this.els.resultsTable.style.display = 'none';
        }
        let grid = document.getElementById('resultsGrid');
        if (!grid) {
            grid = document.createElement('div');
            grid.id = 'resultsGrid';
            grid.className = 'results-grid';
        }
        grid.innerHTML = '';
        this.els.resultsContainer.appendChild(grid);
        // Set grid columns class
        grid.classList.remove('grid-3', 'grid-4');
        if (this.viewMode === 'grid-3') grid.classList.add('grid-3');
        else if (this.viewMode === 'grid-4') grid.classList.add('grid-4');
        // Show loading spinner while rendering
        this.showState('loading', 'Searching...');

        // Stagger index for animation
        let revealIndex = 0;

        // Observer for lazy loading and reveal animation
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const img = card.querySelector('img');
                    if (img && img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    // Animate in with GSAP when card enters viewport, with stagger
                    if (window.gsap) {
                        gsap.fromTo(card, {
                            opacity: 0,
                            y: 32
                        }, {
                            opacity: 1,
                            y: 0,
                            duration: 0.6,
                            delay: revealIndex * 0.08,
                            ease: 'power2.out',
                        });
                        revealIndex++;
                    }
                    obs.unobserve(card);
                }
            });
        }, {
            rootMargin: '0px',
            threshold: 0.15
        });

        // Initialize screenshot index for cycling through available screenshots
        let screenshotIndex = 0;
        let firstCardLoaded = false;

        for (const game of results) {
            let selectedCoverUrl = null;
            // Only use dynamic screenshots for search results and if available
            if (this.currentQuery.length > 0 && game.short_screenshots && game.short_screenshots.length > 0) {
                selectedCoverUrl = game.short_screenshots[screenshotIndex % game.short_screenshots.length].image;
                screenshotIndex++;
            }
            // Call createGameCard with the selected coverUrl, allowing it to override default fetching
            const card = await this.createGameCard(game, selectedCoverUrl);
            grid.appendChild(card);
            observer.observe(card);
            if (!firstCardLoaded) {
                this.showState('results');
                firstCardLoaded = true;
            }
        }
    }

    async createGameCard(game, preselectedCoverUrl = null) {
        let coverUrl;

        // Use the preselected URL if provided (from renderResultsGrid for dynamic covers)
        if (preselectedCoverUrl) {
            coverUrl = preselectedCoverUrl;
        } else {
            // Existing logic for fetching cover from RAWG API or cache (for featured games or no dynamic cover)
            coverUrl = this.coverCache[game.title];
            if (!coverUrl) {
                coverUrl = await this.fetchGameCover(game.title);
                this.coverCache[game.title] = coverUrl;
            }
        }

        if (!coverUrl) {
            coverUrl = 'https://placehold.co/400x225/18181b/fff?text=No+Art';
        }
        // Truncate title for display (before first bracket)
        let shortTitle = game.title.split(/\(|\[|\{/)[0].trim();
        if (!shortTitle) shortTitle = game.title;
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img class="game-card-art" data-src="${coverUrl}" alt="${this.escapeHtml(game.title)} cover art" loading="lazy" />
            <div class="game-card-content">
                <div class="game-card-title" title="${this.escapeHtml(game.title)}">${this.escapeHtml(shortTitle)}</div>
                <div class="game-card-sub">
                    <span>
                        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-file-icon lucide-file\"><path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/></svg>
                        ${game.fileSize} • ${game.source}
                    </span>
                    <span>
                        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-calendar-days-icon lucide-calendar-days\"><path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/><path d=\"M8 14h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 18h.01\"/><path d=\"M12 18h.01\"/><path d=\"M16 18h.01\"/></svg>
                        ${new Date(game.uploadDate).toLocaleDateString('en-IN')}
                    </span>
                </div>
                <div class="game-card-actions">
                    <a href="${game.uris[0]}" class="magnet-btn" title="Download Magnet">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/></svg>
                        <span>Download magnet</span>
                    </a>
                    <button class="copy-btn" title="Copy Magnet Link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                </div>
            </div>
        `;
        // Copy button event
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => this.copyToClipboard(game.uris[0], copyBtn));
        return card;
    }

    getCurrentRawgApiKey() {
        if (this.rawgApiKeyUsage >= this.rawgApiKeyUsageLimit) {
            this.rawgApiKeyIndex = (this.rawgApiKeyIndex + 1) % this.rawgApiKeys.length;
            this.rawgApiKeyUsage = 0;
        }
        this.rawgApiKeyUsage++;
        return this.rawgApiKeys[this.rawgApiKeyIndex];
    }

    async fetchGameCover(title) {
        // RAWG API: https://api.rawg.io/api/games?search={title}&key={API_KEY}
        const apiKey = this.getCurrentRawgApiKey();
        // Strip everything after the first bracket for better matching
        let shortTitle = title.split(/\(|\[|\{/)[0].trim();
        if (!shortTitle) shortTitle = title;
        // LocalStorage cache
        const cacheKey = `bettorr_cover_${shortTitle}`;
        const cacheTimeKey = `bettorr_cover_time_${shortTitle}`;
        const cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
        try {
            const cached = localStorage.getItem(cacheKey);
            const cachedTime = localStorage.getItem(cacheTimeKey);
            if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < cacheTTL)) {
                return cached;
            }
        } catch (e) {}
        try {
            const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(shortTitle)}&key=${apiKey}`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
                const img = data.results[0].background_image;
                if (img) {
                    try {
                        localStorage.setItem(cacheKey, img);
                        localStorage.setItem(cacheTimeKey, Date.now().toString());
                    } catch (e) {}
                    return img;
                }
            }
        } catch (e) {}
        return null;
    }

    // --- Event Handlers ---

    handleSearchKeydown(e) {
        const items = this.els.autocompleteDropdown.querySelectorAll('.autocomplete-item');
        switch (e.key) {
            case 'Enter':
                if (this.selectedAutocompleteIndex > -1 && items[this.selectedAutocompleteIndex]) {
                    this.els.searchInput.value = items[this.selectedAutocompleteIndex].textContent;
                }
                this.performSearch(this.els.searchInput.value);
                this.els.searchInput.blur(); // Remove focus after search
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (this.selectedAutocompleteIndex < items.length - 1) {
                    this.selectedAutocompleteIndex++;
                    this.updateAutocompleteSelection(items);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.selectedAutocompleteIndex > -1) {
                    this.selectedAutocompleteIndex--;
                    this.updateAutocompleteSelection(items);
                }
                break;
            case 'Escape':
                this.hideAutocomplete();
                break;
        }
    }
    
    handleAutocomplete() {
        const query = this.els.searchInput.value.toLowerCase().trim();
        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        const filteredItems = this.autocompleteItems
            .filter(item => item.toLowerCase().includes(query))
            .slice(0, 7);

        this.showAutocomplete(filteredItems, query);
    }
    
    handleSourceChange() {
        this.activeSources = Array.from(this.els.sourceCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }
    }
    
    handleGlobalClick(e) {
        if (!e.target.closest('.search-wrapper')) {
            this.hideAutocomplete();
        }
        if (!e.target.closest('.view-toggle-wrapper')) {
            this.els.sourceFilterDropdown.classList.add('hidden');
        }
    }
    
    handleSortClick(th) {
        if (!this.currentQuery) return; // Prevent sorting if no search query
        const key = th.getAttribute('data-sort-key');
        if (this.sortKey === key) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortKey = key;
            this.sortOrder = 'asc';
        }
        // Remove sort classes from all headers
        this.sortableHeaders.forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
        });
        th.classList.add(this.sortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
        // Only sort filtered results
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        }
    }

    getSortedResults(results) {
        if (!this.sortKey) return results;
        const key = this.sortKey;
        const order = this.sortOrder;
        return [...results].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            if (key === 'fileSize') {
                aVal = this.parseFileSize(aVal);
                bVal = this.parseFileSize(bVal);
            } else if (key === 'uploadDate') {
                aVal = new Date(a.uploadDate).getTime();
                bVal = new Date(b.uploadDate).getTime();
            } else {
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    parseFileSize(sizeStr) {
        if (!sizeStr) return 0;
        const match = sizeStr.match(/([\d.]+)\s*(GB|MB|TB)/i);
        if (!match) return 0;
        let [ , num, unit ] = match;
        num = parseFloat(num);
        switch (unit.toUpperCase()) {
            case 'TB': return num * 1024 * 1024;
            case 'GB': return num * 1024;
            case 'MB': return num;
            default: return num;
        }
    }

    // --- UI State & Toggles ---

    showState(state, loadingText) {
        const existingInitial = document.getElementById('initialState');
        if (existingInitial) existingInitial.remove();
        const existingLoading = document.getElementById('loadingState');
        if (existingLoading) existingLoading.remove();
        const existingNoResults = document.getElementById('noResultsState');
        if (existingNoResults) existingNoResults.remove();
        if (this.els.resultsTable) this.els.resultsTable.classList.add('hidden');

        switch(state) {
            case 'initial': {
                // Dynamically create and show initial state message
                const initialDiv = document.createElement('div');
                initialDiv.id = 'initialState';
                initialDiv.className = 'table-state';
                initialDiv.innerHTML = `
                    <p>Search for a game to get started.</p>
                    <p>(e.g. GTA V, Red Dead Redemption 2, Cyberpunk 2077, etc.)</p>
                `;
                this.els.resultsContainer.appendChild(initialDiv);
                break;
            }
            case 'loading': {
                // Dynamically create and show loading state
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'loadingState';
                loadingDiv.className = 'table-state';
                loadingDiv.innerHTML = `
                    <div class="spinner"></div>
                    <p>${loadingText || 'Searching...'}</p>
                `;
                this.els.resultsContainer.appendChild(loadingDiv);
                break;
            }
            case 'no-results': {
                // Dynamically create and show no-results state
                const noResultsDiv = document.createElement('div');
                noResultsDiv.id = 'noResultsState';
                noResultsDiv.className = 'table-state';
                noResultsDiv.innerHTML = `<p>No results found.</p>`;
                this.els.resultsContainer.appendChild(noResultsDiv);
                break;
            }
            case 'results':
                if (this.els.resultsTable) this.els.resultsTable.classList.remove('hidden');
                break;
        }
    }

    toggleSourceFilter() {
        this.els.sourceFilterDropdown.classList.toggle('hidden');
    }
    
    showAutocomplete(items, query) {
        const dropdown = this.els.autocompleteDropdown;
        if (items.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        dropdown.innerHTML = '';
        const regex = new RegExp(`(${query})`, 'gi');
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = item.replace(regex, '<strong>$1</strong>');
            div.addEventListener('click', () => {
                this.els.searchInput.value = item;
                this.performSearch(item);
            });
            dropdown.appendChild(div);
        });

        dropdown.classList.remove('hidden');
        this.selectedAutocompleteIndex = -1;
    }

    updateAutocompleteSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('highlighted', index === this.selectedAutocompleteIndex);
        });
    }

    hideAutocomplete() {
        this.els.autocompleteDropdown.classList.add('hidden');
        this.selectedAutocompleteIndex = -1;
    }

    // --- Theme Management ---
    
    initializeTheme() {
        this.themes = ['violet', 'green', 'purple', 'seaGreen', 'magenta', 'gold', 'red', 'orange', 'teal', 'sky', 'blue', 'lime', 'pink'];
        const storedTheme = localStorage.getItem('bettorr_theme') || this.themes[0];
        this.setTheme(storedTheme);
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bettorr_theme', theme);
    }
    
    cycleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const currentIndex = this.themes.indexOf(currentTheme);
        const nextTheme = this.themes[(currentIndex + 1) % this.themes.length];
        this.setTheme(nextTheme);
    }

    // --- Helpers ---

    copyToClipboard(text, element) {
        navigator.clipboard.writeText(text).then(() => {
            element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
            element.classList.add('copied');
            element.title = "Copied!";

            // Show toast notification
            this.showToast('Magnet link copied!');

            setTimeout(() => {
                element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
                element.classList.remove('copied');
                element.title = "Copy Magnet Link";
            }, 2000);
        });
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        toast.classList.remove('hidden');
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hidden');
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    updateSortableHeaders() {
        if (this.currentQuery) {
            this.sortableHeaders.forEach(th => th.classList.remove('disabled'));
        } else {
            this.sortableHeaders.forEach(th => th.classList.add('disabled'));
        }
    }

    showFeaturedGames() {
        // Only show if there is no search query
        if (this.els.searchInput.value.trim() !== '') return;
        const featuredTitles = [
            'Red Dead Redemption 2',
            'Cyberpunk 2077',
            'Ghost of Tsushima',
            'The Last of Us Part II',
            'God of War: Ragnarök',
            'Alan Wake 2',
            'Clair Obscur: Expedition 33',
            'Metaphor: ReFantazio',
            "Baldur's Gate 3",
            'The Witcher 3: Wild Hunt',
            'Balatro',
            'GTA V',
        ];
        const featuredGames = [];
        for (const title of featuredTitles) {
            const match = this.allGames.find(game => game.title.toLowerCase().includes(title.toLowerCase()));
            if (match && !featuredGames.some(g => g.title === match.title && g.source === match.source)) {
                featuredGames.push(match);
            }
        }
        if (featuredGames.length > 0) {
            this.setResultsTitle('🔥 Hot Games Right Now');
            this.displayResults(featuredGames);
        } else {
            this.setResultsTitle('');
            this.showState('initial');
        }
    }

    setResultsTitle(title) {
        const titleEl = document.getElementById('resultsTitle');
        if (titleEl) {
            titleEl.textContent = title;
            titleEl.style.display = title ? '' : 'none';
            if (window.gsap && title) {
                gsap.fromTo(titleEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' });
            }
        }
    }

    toggleViewMode() {
        const currentIndex = this.viewModes.indexOf(this.viewMode);
        const nextIndex = (currentIndex + 1) % this.viewModes.length;
        this.viewMode = this.viewModes[nextIndex];
        localStorage.setItem(this.viewModeKey, this.viewMode);
        this.updateViewToggleIcon();
        // Re-render results
        if (this.currentQuery) {
            this.performSearch(this.currentQuery);
        } else {
            this.showFeaturedGames();
        }
    }

    updateViewToggleIcon() {
        const iconMap = {
            'table': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table-icon lucide-table"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`,
            'grid-3': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid3x2-icon lucide-grid-3x2"><path d="M15 3v18"/><path d="M3 12h18"/><path d="M9 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
            'grid-4': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table-cells-merge-icon lucide-table-cells-merge"><path d="M12 21v-6"/><path d="M12 9V3"/><path d="M3 15h18"/><path d="M3 9h18"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`
        };
        if (this.els.viewToggleIcon) {
            const currentIndex = this.viewModes.indexOf(this.viewMode);
            const nextIndex = (currentIndex + 1) % this.viewModes.length;
            this.els.viewToggleIcon.innerHTML = iconMap[this.viewModes[nextIndex]] || '';
        }
    }

    createResultRow(game) {
        const tr = document.createElement('tr');
        const uploadDate = new Date(game.uploadDate).toLocaleDateString('en-IN'); // DD-MM-YYYY format
        tr.innerHTML = `
            <td class="col-name"><div class="result-name">${this.escapeHtml(game.title)}</div></td>
            <td class="col-date"><span class="result-date">${uploadDate}</span></td>
            <td class="col-size"><span class="result-size">${game.fileSize}</span></td>
            <td class="col-source"><span class="result-source">${game.source}</span></td>
            <td class="col-actions">
                <div class="result-actions">
                    <a href="${game.uris[0]}" class="magnet-btn" title="Download Magnet">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/></svg>
                        <span>Download magnet</span>
                    </a>
                    <button class="copy-btn" title="Copy Magnet Link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                </div>
            </td>
        `;
        const copyBtn = tr.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => this.copyToClipboard(game.uris[0], copyBtn));
        return tr;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BettorApp();
});
