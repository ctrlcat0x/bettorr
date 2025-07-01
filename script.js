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

        // DOM Elements
        this.cacheDOMElements();
        
        // Initialization
        this.init();
    }

    cacheDOMElements() {
        this.els = {
            searchInput: document.getElementById('searchInput'),
            autocompleteDropdown: document.getElementById('autocomplete'),
            viewBtn: document.getElementById('viewBtn'),
            sourceFilterDropdown: document.getElementById('sourceFilterDropdown'),
            sourceCheckboxes: document.querySelectorAll('.source-filter-dropdown input[type="checkbox"]'),
            resultsTable: document.querySelector('.results-table'),
            resultsBody: document.getElementById('resultsBody'),
            initialState: document.getElementById('initialState'),
            loadingState: document.getElementById('loadingState'),
            noResultsState: document.getElementById('noResultsState'),
            themeToggleBtn: document.querySelector('[data-theme-btn]'),
        };
    }

    async init() {
        this.setupEventListeners();
        this.initializeTheme();
        
        await this.loadGameData();
        
        // After data is loaded, create a unique list of titles for autocomplete
        this.autocompleteItems = [...new Set(this.allGames.map(game => game.title))];
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
        this.els.viewBtn.addEventListener('click', () => this.toggleSourceFilter());
        this.els.sourceCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.handleSourceChange());
        });

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
    }
    
    performSearch(query) {
        this.currentQuery = query.toLowerCase().trim();
        this.hideAutocomplete();
        this.updateSortableHeaders();
        if (!this.currentQuery) {
            this.showState('initial');
            return;
        }
        this.showState('loading');
        setTimeout(() => {
            let results = this.allGames.filter(game => 
                this.activeSources.includes(game.source.toLowerCase()) &&
                game.title.toLowerCase().includes(this.currentQuery)
            );
            results = this.getSortedResults(results);
            this.displayResults(results);
        }, 300);
    }

    displayResults(results) {
        results = this.getSortedResults(results);
        this.els.resultsBody.innerHTML = '';

        if (results.length === 0) {
            this.showState('no-results');
            return;
        }
        
        this.showState('results');
        results.forEach(game => {
            const row = this.createResultRow(game);
            this.els.resultsBody.appendChild(row);
        });
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

    showState(state) {
        this.els.initialState.classList.add('hidden');
        this.els.loadingState.classList.add('hidden');
        this.els.noResultsState.classList.add('hidden');
        this.els.resultsTable.classList.add('hidden');

        switch(state) {
            case 'initial':
                this.els.initialState.classList.remove('hidden');
                break;
            case 'loading':
                this.els.loadingState.classList.remove('hidden');
                break;
            case 'no-results':
                this.els.noResultsState.classList.remove('hidden');
                break;
            case 'results':
                this.els.resultsTable.classList.remove('hidden');
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
            element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
            element.classList.add('copied');
            element.title = "Copied!";

            setTimeout(() => {
                element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
                element.classList.remove('copied');
                element.title = "Copy Magnet Link";
            }, 2000);
        });
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
}

document.addEventListener('DOMContentLoaded', () => {
    new BettorApp();
});
