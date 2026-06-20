// State Manager
const state = {
    releases: [],
    filteredReleases: [],
    selectedRelease: null,
    simulatedTweets: [],
    currentCategoryFilter: 'all',
    currentSourceFilter: 'all',
    searchQuery: '',
    isLoading: false
};

// SVG progress ring configuration
const CIRCLE_RADIUS = 9;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~56.54

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    refreshIcon: document.getElementById('refresh-icon'),
    lastUpdated: document.getElementById('last-updated'),
    notesList: document.getElementById('notes-list'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    categoryFilters: document.getElementById('category-filters'),
    sourceFilters: document.getElementById('source-filters'),
    btnExport: document.getElementById('btn-export'),
    themeCheckbox: document.getElementById('theme-checkbox'),
    
    // Preview & Workspace Panel
    previewPanel: document.getElementById('preview-panel'),
    previewEmpty: document.getElementById('preview-empty'),
    previewActiveContent: document.getElementById('preview-active-content'),
    selectedDate: document.getElementById('selected-date'),
    selectedSourceBadge: document.getElementById('selected-source-badge'),
    selectedBadge: document.getElementById('selected-badge'),
    selectedTitle: document.getElementById('selected-title'),
    selectedBody: document.getElementById('selected-body'),
    btnCopyLink: document.getElementById('btn-copy-link'),
    
    // Workspace Composers Tabs
    wTabMicroblog: document.getElementById('w-tab-microblog'),
    wTabBlog: document.getElementById('w-tab-blog'),
    microblogSection: document.getElementById('microblog-composer-section'),
    blogSection: document.getElementById('blog-composer-section'),
    
    // Microblog Composer
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    progressCircle: document.querySelector('.progress-ring__circle'),
    btnCopyText: document.getElementById('btn-copy-text'),
    btnSimulateTweet: document.getElementById('btn-simulate-tweet'),
    btnPostTwitter: document.getElementById('btn-post-twitter'),
    
    // 200-Word Blog Composer
    blogTextarea: document.getElementById('blog-textarea'),
    blogWordCount: document.getElementById('blog-word-count'),
    btnCopyBlog: document.getElementById('btn-copy-blog'),
    
    // Tabs & Navigation
    navItems: document.querySelectorAll('.nav-item'),
    tabFeed: document.getElementById('tab-feed'),
    tabSimulation: document.getElementById('tab-simulation'),
    simCount: document.getElementById('sim-count'),
    simulatedTweetsFeed: document.getElementById('simulated-tweets-feed'),
    simEmpty: document.getElementById('sim-empty'),
    
    // Status Indicator
    syncStatus: document.getElementById('sync-status'),
    toastContainer: document.getElementById('toast-container')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupProgressRing();
    initTheme();
    fetchReleaseNotes(false);
});

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    elements.btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Theme toggle switch
    elements.themeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            showToast("Switched to Light Mode", "info");
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            showToast("Switched to Dark Mode", "info");
        }
    });

    // Export to CSV button
    elements.btnExport.addEventListener('click', exportToCSV);

    // Search input with debounce
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            filterAndRenderNotes();
        }, 250);
    });
    
    // Category filter pills
    elements.categoryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active class from all pills
            elements.categoryFilters.querySelectorAll('.filter-pill').forEach(pill => {
                pill.classList.remove('active');
            });
            
            // Add active class to clicked pill
            e.target.classList.add('active');
            state.currentCategoryFilter = e.target.dataset.category;
            filterAndRenderNotes();
        }
    });
    
    // Source filter pills
    elements.sourceFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active class from all pills
            elements.sourceFilters.querySelectorAll('.filter-pill').forEach(pill => {
                pill.classList.remove('active');
            });
            
            // Add active class to clicked pill
            e.target.classList.add('active');
            state.currentSourceFilter = e.target.dataset.source;
            filterAndRenderNotes();
        }
    });
    
    // Tweet composer input
    elements.tweetTextarea.addEventListener('input', handleComposerInput);
    
    // Action Buttons in Workspace
    elements.btnCopyLink.addEventListener('click', copyOriginalLink);
    elements.btnCopyText.addEventListener('click', copyTweetText);
    elements.btnSimulateTweet.addEventListener('click', simulateTweet);
    elements.btnPostTwitter.addEventListener('click', postToTwitter);
    
    // Workspace tab switcher listeners
    elements.wTabMicroblog.addEventListener('click', () => {
        elements.wTabMicroblog.classList.add('active');
        elements.wTabBlog.classList.remove('active');
        elements.microblogSection.classList.remove('hidden');
        elements.blogSection.classList.add('hidden');
    });

    elements.wTabBlog.addEventListener('click', () => {
        elements.wTabBlog.classList.add('active');
        elements.wTabMicroblog.classList.remove('active');
        elements.blogSection.classList.remove('hidden');
        elements.microblogSection.classList.add('hidden');
    });

    // 200-Word Blog copy button listener
    elements.btnCopyBlog.addEventListener('click', () => {
        const text = elements.blogTextarea.value;
        if (!text.trim()) return;
        
        navigator.clipboard.writeText(text)
            .then(() => showToast("Blog post copied to clipboard!", "success"))
            .catch(err => showToast("Failed to copy blog post: " + err, "error"));
    });

    // 200-Word Blog textarea word counter
    elements.blogTextarea.addEventListener('input', () => {
        const text = elements.blogTextarea.value;
        const words = text.split(/\s+/).filter(Boolean).length;
        elements.blogWordCount.textContent = words;
    });
    
    // Sidebar navigation tabs
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const navBtn = e.currentTarget;
            const targetTab = navBtn.dataset.tab;
            
            // Toggle active sidebar items
            elements.navItems.forEach(n => n.classList.remove('active'));
            navBtn.classList.add('active');
            
            // Toggle visible content panels
            if (targetTab === 'feed') {
                elements.tabFeed.classList.remove('hidden');
                elements.tabSimulation.classList.add('hidden');
            } else if (targetTab === 'simulation') {
                elements.tabFeed.classList.add('hidden');
                elements.tabSimulation.classList.remove('hidden');
                renderSimulatedFeed();
            }
        });
    });
}

// Setup circular character count progress ring
function setupProgressRing() {
    if (elements.progressCircle) {
        elements.progressCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE} ${CIRCLE_CIRCUMFERENCE}`;
        elements.progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    }
}

// Show Toast message
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Fade out and remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}

// Set loading state
function setLoading(loading) {
    state.isLoading = loading;
    if (loading) {
        elements.refreshIcon.classList.add('spinning');
        elements.btnRefresh.disabled = true;
        elements.syncStatus.textContent = 'Syncing...';
        
        // Show loading template skeleton
        elements.notesList.innerHTML = '';
        elements.loadingState.classList.remove('hidden');
        elements.emptyState.classList.add('hidden');
    } else {
        elements.refreshIcon.classList.remove('spinning');
        elements.btnRefresh.disabled = false;
        elements.syncStatus.textContent = 'Ready';
        elements.loadingState.classList.add('hidden');
    }
}

// Fetch notes from Flask backend
async function fetchReleaseNotes(forceRefresh = false) {
    if (state.isLoading) return;
    
    setLoading(true);
    const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned HTTP status ${response.status}`);
        }
        
        const res = await response.json();
        
        if (res.status === 'success' || res.status === 'partial_success') {
            state.releases = res.data;
            
            // Format Last Updated Text
            const dateObj = new Date(res.last_updated * 1000);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
            elements.lastUpdated.textContent = `Last Checked: ${dateStr} at ${timeStr}`;
            
            if (res.status === 'partial_success') {
                showToast("Served from cache due to network update issues", "error");
            } else {
                showToast(forceRefresh ? "Feed refreshed successfully!" : "Release notes loaded.", "success");
            }
            
            filterAndRenderNotes();
        } else {
            throw new Error(res.message || "Unknown API response");
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        elements.lastUpdated.textContent = "Last Checked: Connection Failed";
        showToast(`Failed to update release notes: ${err.message}`, "error");
        
        // Render empty state if no details are available
        if (state.releases.length === 0) {
            elements.emptyState.classList.remove('hidden');
        }
    } finally {
        setLoading(false);
    }
}

// Filter and render release notes
function filterAndRenderNotes() {
    // Apply filters
    state.filteredReleases = state.releases.filter(item => {
        // Search text matching
        const matchSearch = state.searchQuery === '' || 
            item.date.toLowerCase().includes(state.searchQuery) ||
            item.category.toLowerCase().includes(state.searchQuery) ||
            item.source.toLowerCase().includes(state.searchQuery) ||
            item.content_text.toLowerCase().includes(state.searchQuery);
            
        // Category pill filter matching
        let matchCategory = true;
        if (state.currentCategoryFilter !== 'all') {
            matchCategory = item.category.toLowerCase() === state.currentCategoryFilter;
        }
        
        // Source pill filter matching
        let matchSource = true;
        if (state.currentSourceFilter !== 'all') {
            matchSource = item.source === state.currentSourceFilter;
        }
        
        return matchSearch && matchCategory && matchSource;
    });
    
    // Render list
    elements.notesList.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    
    // Display cards
    state.filteredReleases.forEach(item => {
        const card = document.createElement('div');
        card.className = `note-card ${state.selectedRelease && state.selectedRelease.id === item.id ? 'selected' : ''}`;
        card.dataset.id = item.id;
        
        // Category specific tag class
        let tagClass = 'badge-general';
        const cat = item.category.toLowerCase();
        if (cat.includes('feature')) tagClass = 'badge-feature';
        else if (cat.includes('changed')) tagClass = 'badge-changed';
        else if (cat.includes('deprecat') || cat.includes('remove')) tagClass = 'badge-deprecated';
        
        // Source specific tag class
        let sourceTagClass = 'badge-source-bq';
        const src = item.source.toLowerCase();
        if (src.includes('pyspark')) sourceTagClass = 'badge-source-pyspark';
        else if (src.includes('snowflake')) sourceTagClass = 'badge-source-snowflake';
        else if (src.includes('oracle')) sourceTagClass = 'badge-source-oracle';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="badge ${sourceTagClass}">${item.source}</span>
                    <span class="badge ${tagClass}">${item.category}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <div class="card-header-actions">
                    <button class="card-action-btn btn-copy-card" title="Copy update text">
                        <i class="fa-regular fa-copy"></i>
                    </button>
                    <button class="card-action-btn btn-tweet-card" title="Tweet this update">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${item.content_html}
            </div>
        `;
        
        // Event listeners for card click and action buttons
        card.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.btn-copy-card');
            const tweetBtn = e.target.closest('.btn-tweet-card');
            
            if (copyBtn) {
                e.stopPropagation();
                navigator.clipboard.writeText(item.content_text)
                    .then(() => showToast("Release notes copied to clipboard!", "success"))
                    .catch(err => showToast("Failed to copy text: " + err, "error"));
            } else if (tweetBtn) {
                e.stopPropagation();
                selectRelease(item, true); // Select and focus the composer input
            } else {
                selectRelease(item, false);
            }
        });
        
        elements.notesList.appendChild(card);
    });
}

// Select a release note and activate workspace
function selectRelease(release, focusComposer = false) {
    state.selectedRelease = release;
    
    // Toggle active selected classes in lists
    document.querySelectorAll('.note-card').forEach(card => {
        if (card.dataset.id === release.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Enable active workspace layout
    elements.previewEmpty.classList.add('hidden');
    elements.previewActiveContent.classList.remove('hidden');
    
    // Fill detailed view elements
    elements.selectedDate.textContent = release.date;
    
    // Style workspace details category badge
    elements.selectedBadge.className = 'badge';
    const cat = release.category.toLowerCase();
    let badgeClass = 'badge-general';
    if (cat.includes('feature')) badgeClass = 'badge-feature';
    else if (cat.includes('changed')) badgeClass = 'badge-changed';
    else if (cat.includes('deprecat') || cat.includes('remove')) badgeClass = 'badge-deprecated';
    elements.selectedBadge.classList.add(badgeClass);
    elements.selectedBadge.textContent = release.category;
    
    // Style workspace details source badge
    elements.selectedSourceBadge.className = 'badge';
    let sourceTagClass = 'badge-source-bq';
    const src = release.source.toLowerCase();
    if (src.includes('pyspark')) sourceTagClass = 'badge-source-pyspark';
    else if (src.includes('snowflake')) sourceTagClass = 'badge-source-snowflake';
    else if (src.includes('oracle')) sourceTagClass = 'badge-source-oracle';
    elements.selectedSourceBadge.classList.add(sourceTagClass);
    elements.selectedSourceBadge.textContent = release.source;
    
    elements.selectedTitle.textContent = `${release.source} • ${release.category}`;
    elements.selectedBody.innerHTML = release.content_html;
    
    // Set text to Microblog Text Area
    elements.tweetTextarea.value = release.tweet_text;
    
    // Generate UK English Blog Post
    const blogText = generateBlogPostText(release);
    elements.blogTextarea.value = blogText;
    
    // Count blog post words
    const wordCount = blogText.split(/\s+/).filter(Boolean).length;
    elements.blogWordCount.textContent = wordCount;
    
    // Run validation count metrics
    handleComposerInput();
    
    // If tablet/mobile grid view is active, scroll layout workspace into view smoothly
    if (window.innerWidth <= 1100) {
        elements.previewPanel.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (focusComposer) {
        setTimeout(() => {
            elements.tweetTextarea.focus();
            // Highlight text area borders
            elements.tweetTextarea.style.animation = 'glow-border 1.5s ease-in-out';
            elements.tweetTextarea.addEventListener('animationend', () => {
                elements.tweetTextarea.style.animation = '';
            });
        }, 400);
    }
}

// Character counter validation & circle rendering
function handleComposerInput() {
    const text = elements.tweetTextarea.value;
    
    // Calculate length matching Twitter's URL counting behavior (all URLs count as 23 chars)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    const lengthWithoutUrls = text.replace(urlRegex, '').length;
    const count = lengthWithoutUrls + (urls.length * 23);
    
    const charsRemaining = 280 - count;
    
    elements.charCount.textContent = charsRemaining;
    
    // Compute circle dash offset
    const progress = Math.min(count / 280, 1);
    const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
    
    if (elements.progressCircle) {
        elements.progressCircle.style.strokeDashoffset = offset;
        
        // Progress colors based on warnings
        if (charsRemaining <= 0) {
            elements.progressCircle.style.stroke = '#ef4444'; // Red
            elements.charCount.style.color = '#ef4444';
        } else if (charsRemaining <= 40) {
            elements.progressCircle.style.stroke = '#f59e0b'; // Amber warning
            elements.charCount.style.color = '#f59e0b';
        } else {
            elements.progressCircle.style.stroke = '#1d9bf0'; // Twitter blue
            elements.charCount.style.color = '#71767b';
        }
    }
    
    // Enable/Disable Action buttons based on content lengths
    const isValid = count > 0 && count <= 280;
    elements.btnSimulateTweet.disabled = !isValid;
    elements.btnPostTwitter.disabled = !isValid;
}

// Copy original link to clipboard
function copyOriginalLink() {
    if (!state.selectedRelease) return;
    
    navigator.clipboard.writeText(state.selectedRelease.link)
        .then(() => showToast("Release URL copied to clipboard!", "success"))
        .catch(err => showToast("Failed to copy URL: " + err, "error"));
}

// Copy draft tweet to clipboard
function copyTweetText() {
    const text = elements.tweetTextarea.value;
    if (!text.trim()) return;
    
    navigator.clipboard.writeText(text)
        .then(() => showToast("Draft tweet copied to clipboard!", "success"))
        .catch(err => showToast("Failed to copy text: " + err, "error"));
}

// Open X web share intent
function postToTwitter() {
    const text = elements.tweetTextarea.value;
    if (!text.trim()) return;
    
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    const lengthWithoutUrls = text.replace(urlRegex, '').length;
    const count = lengthWithoutUrls + (urls.length * 23);
    
    if (count > 280) {
        showToast("Cannot post. Draft exceeds 280 character limit.", "error");
        return;
    }
    
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterIntentUrl, '_blank', 'width=550,height=420');
    showToast("Launching Twitter Composer intent...", "success");
}

// Local mock Twitter share simulation
function simulateTweet() {
    const text = elements.tweetTextarea.value;
    if (!text.trim()) return;
    
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    const lengthWithoutUrls = text.replace(urlRegex, '').length;
    const count = lengthWithoutUrls + (urls.length * 23);
    
    if (count > 280) {
        showToast("Cannot simulate. Draft exceeds 280 character limit.", "error");
        return;
    }
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const mockTweet = {
        id: 'sim_' + Date.now(),
        text: text,
        time: `${timeStr} • ${dateStr}`,
        timestamp: now.getTime()
    };
    
    state.simulatedTweets.unshift(mockTweet); // Add to beginning of array
    elements.simCount.textContent = state.simulatedTweets.length;
    elements.simCount.classList.add('pulse');
    setTimeout(() => {
        elements.simCount.classList.remove('pulse');
    }, 500);
    
    showToast("Tweet simulation created! View in the side tab.", "success");
    
    // Switch tab to simulation if user wants to see it, or keep them here but notify.
    // Let's keep them here, but update the tab list in case they click.
}

// Render simulation feed layout
function renderSimulatedFeed() {
    elements.simulatedTweetsFeed.innerHTML = '';
    
    if (state.simulatedTweets.length === 0) {
        elements.simEmpty.classList.remove('hidden');
        return;
    }
    
    elements.simEmpty.classList.add('hidden');
    
    state.simulatedTweets.forEach(tweet => {
        const item = document.createElement('div');
        item.className = 'mock-tweet-post';
        
        // Linkify URLs inside the simulated text for realistic effects
        let linkifiedText = tweet.text.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        item.innerHTML = `
            <div class="tweet-header">
                <div class="tweet-profile">
                    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=80" alt="Avatar" class="profile-avatar">
                    <div class="profile-names">
                        <span class="display-name">Cloud Architect</span>
                        <span class="handle">@bq_navigator</span>
                    </div>
                </div>
                <div class="twitter-x-logo">
                    <i class="fa-brands fa-x-twitter"></i>
                </div>
            </div>
            <div class="tweet-post-body">
                ${linkifiedText}
            </div>
            <div class="tweet-post-meta">
                <span>${tweet.time}</span>
                <span>•</span>
                <span>Antigravity Simulator</span>
            </div>
        `;
        
        elements.simulatedTweetsFeed.appendChild(item);
    });
}

// Initialize Theme from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        elements.themeCheckbox.checked = true;
        document.body.classList.add('light-theme');
    }
}

// Export filtered release notes to CSV
function exportToCSV() {
    if (state.filteredReleases.length === 0) {
        showToast("No release notes available to export.", "error");
        return;
    }
    
    // CSV Header row
    const csvRows = [['Date', 'Category', 'Link', 'Content']];
    
    state.filteredReleases.forEach(item => {
        // Double up existing double-quotes to escape them in CSV standard
        const cleanText = item.content_text.replace(/"/g, '""');
        const cleanDate = item.date.replace(/"/g, '""');
        const cleanCategory = item.category.replace(/"/g, '""');
        const cleanLink = item.link.replace(/"/g, '""');
        
        csvRows.push([
            `"${cleanDate}"`,
            `"${cleanCategory}"`,
            `"${cleanLink}"`,
            `"${cleanText}"`
        ]);
    });
    
    const csvString = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Exported ${state.filteredReleases.length} entries to CSV!`, "success");
}

// Convert US English text to UK English spelling
function toUKEnglish(text) {
    const dict = {
        "optimized": "optimised",
        "optimizing": "optimising",
        "optimization": "optimisation",
        "optimizations": "optimisations",
        "synthesized": "synthesised",
        "synthesizing": "synthesising",
        "synthesis": "synthesisation",
        "modeling": "modelling",
        "color": "colour",
        "colors": "colours",
        "customization": "customisation",
        "customizations": "customisations",
        "program": "programme",
        "programs": "programmes",
        "analyzing": "analysing",
        "behavior": "behaviour",
        "behaviors": "behaviours",
        "centralized": "centralised"
    };
    let clean = text;
    Object.keys(dict).forEach(key => {
        const regex = new RegExp(key, 'gi');
        clean = clean.replace(regex, (match) => {
            // Keep capitalisation format
            if (match[0] === match[0].toUpperCase()) {
                return dict[key][0].toUpperCase() + dict[key].slice(1);
            }
            return dict[key];
        });
    });
    return clean;
}

// Generate a professional ~200-word engineering blog post draft in UK English
function generateBlogPostText(release) {
    const date = release.date;
    const source = release.source;
    const category = release.category;
    
    const title = `New ${category} Update Released for ${source} (${date})`;
    
    const intro = `The modern data engineering landscape has seen another significant advancement with the official announcement of a new ${category} update for ${source} on ${date}. This release introduces key capabilities designed to streamline analytical development, enhance schema execution performance, and optimise computational workloads across distributed setups.`;
    
    // Translate the release summary content to UK English spelling
    const bodySnippet = toUKEnglish(release.content_text);
    
    const conclusion = `For data engineers and database administrators, integrating these latest enhancements is highly recommended to maintain peak operational efficiency and align with modern deployment best practices.`;
    
    const sourceQuote = `Source: Official ${source} Release Notes — ${release.link}`;
    
    // Compile hashtags based on source & category
    let hashtags = '#DataEngineering #CloudData #Analytics';
    if (source === 'BigQuery') hashtags = '#BigQuery #GoogleCloud #DataWarehousing #Analytics';
    else if (source === 'PySpark') hashtags = '#PySpark #ApacheSpark #BigData #Python';
    else if (source === 'Snowflake') hashtags = '#Snowflake #CloudData #Database #Analytics';
    else if (source === 'Oracle 26ai') hashtags = '#Oracle #Database #AIVectorSearch #DatabaseAdmin';
    
    if (category === 'Feature') hashtags += ' #FeatureRelease';
    else if (category === 'Changed') hashtags += ' #PlatformUpdate';
    
    const fullPost = `${title}\n\n${intro}\n\n${bodySnippet}\n\n${conclusion}\n\n${sourceQuote}\n\n${hashtags}`;
    return fullPost;
}
