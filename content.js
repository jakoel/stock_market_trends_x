// Twitter Stock Ticker Extractor - Content Script
// Runs on x.com pages and extracts ticker-post pairs

// Browser API compatibility for Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const seenPairs = new Set(); // Track unique ticker-post combinations
let updateTimer = null;

// Check if article is a repost or reply
function isRepostOrReply(article) {
    // Check for "Reposted" text indicator
    const repostedIndicator = article.querySelector('[data-testid="socialContext"]');
    if (repostedIndicator) {
        const text = repostedIndicator.textContent.toLowerCase();
        if (text.includes('reposted') || text.includes('repost')) {
            return true;
        }
    }

    // Check for "Replying to" indicator
    const replyIndicator = article.textContent;
    if (replyIndicator.includes('Replying to @')) {
        return true;
    }

    return false;
}

// Function to extract ticker-post pairs from the current DOM
function extractTickerPairs() {
    const pairs = [];

    // Find all links containing =%24 (URL-encoded $)
    const allLinks = document.querySelectorAll('a[href*="=%24"]');

    allLinks.forEach(link => {
        const href = link.getAttribute('href');

        // Extract ticker from URL like /search?q=%24OSCR
        if (href && href.includes('q=%24')) {
            const tickerMatch = href.match(/q=%24([A-Z]+)/i);
            if (tickerMatch) {
                const ticker = tickerMatch[1].toUpperCase();

                // Find the closest article (tweet container)
                const article = link.closest('article');
                if (article) {
                    // Skip reposts and replies
                    if (isRepostOrReply(article)) {
                        return; // Skip this one
                    }
                    // Find the status link in this article
                    const statusLink = article.querySelector('a[href*="/status/"]');
                    if (statusLink) {
                        const statusHref = statusLink.getAttribute('href');
                        // Convert relative URL to absolute
                        let fullUrl = statusHref.startsWith('http')
                            ? statusHref
                            : 'https://x.com' + statusHref;

                        // Clean up URL: remove query params and trailing paths like /photo/1, /video/1, /analytics
                        fullUrl = fullUrl.split('?')[0]; // Remove query params
                        fullUrl = fullUrl.replace(/\/(photo|video|analytics|likes|retweets)\/\d+$/, ''); // Remove /photo/1 etc.
                        fullUrl = fullUrl.replace(/\/(photo|video|analytics)$/, ''); // Remove trailing /photo etc.

                        // Extract timestamp from <time> element
                        const timeElement = article.querySelector('time[datetime]');
                        const timestamp = timeElement ? timeElement.getAttribute('datetime') : new Date().toISOString();

                        // Create unique pair identifier
                        const pairKey = `${ticker}|${fullUrl}`;

                        // Only add if we haven't seen this combination before
                        if (!seenPairs.has(pairKey)) {
                            seenPairs.add(pairKey);
                            pairs.push({
                                ticker: ticker,
                                url: fullUrl,
                                timestamp: timestamp
                            });
                        }
                    }
                }
            }
        }
    });

    return pairs;
}

// Function to send new pairs to background script
function sendNewPairs(pairs) {
    if (pairs.length > 0) {
        browserAPI.runtime.sendMessage({
            type: 'NEW_TICKER_PAIRS',
            pairs: pairs
        }).catch(err => {
            console.log('Extension context invalidated, reloading...');
        });
    }
}

// Observe DOM changes (for dynamic content loading during scroll)
const observer = new MutationObserver(() => {
    // Debounce: wait 500ms after last change before extracting
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        const newPairs = extractTickerPairs();
        sendNewPairs(newPairs);
    }, 500);
});

// Start observing when page loads
function startObserving() {
    // Initial extraction
    const initialPairs = extractTickerPairs();
    sendNewPairs(initialPairs);

    // Observe future changes
    const targetNode = document.body;
    if (targetNode) {
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
        console.log('Twitter Ticker Extractor: Active and monitoring...');
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
} else {
    startObserving();
}

// Auto-scroll functionality
let isAutoScrolling = false;
let autoScrollInterval = null;
let knownPostUrls = new Set(); // Track URLs we've already seen

// Initialize known posts from storage
async function initializeKnownPosts() {
    knownPostUrls.clear();

    try {
        // Load from storage (includes CSV data)
        const result = await browserAPI.storage.local.get('tickerPairs');

        if (result.tickerPairs) {
            // Extract all URLs from stored pairs
            Object.keys(result.tickerPairs).forEach(pairKey => {
                const url = pairKey.split('|')[1];
                if (url) {
                    knownPostUrls.add(url);
                }
            });
        }

        // Also add from current session
        seenPairs.forEach(pairKey => {
            const url = pairKey.split('|')[1];
            if (url) {
                knownPostUrls.add(url);
            }
        });

        console.log('Initialized known posts from storage:', knownPostUrls.size);
    } catch (err) {
        console.error('Error loading known posts:', err);
    }
}

// Check if we've encountered a known post in the current viewport
function hasKnownPostInView() {
    const articles = document.querySelectorAll('article');

    for (const article of articles) {
        const statusLink = article.querySelector('a[href*="/status/"]');
        if (statusLink) {
            const statusHref = statusLink.getAttribute('href');
            let fullUrl = statusHref.startsWith('http')
                ? statusHref
                : 'https://x.com' + statusHref;

            // Clean up URL (same logic as extraction)
            fullUrl = fullUrl.split('?')[0];
            fullUrl = fullUrl.replace(/\/(photo|video|analytics|likes|retweets)\/\d+$/, '');
            fullUrl = fullUrl.replace(/\/(photo|video|analytics)$/, '');

            if (knownPostUrls.has(fullUrl)) {
                console.log('Found known post in view:', fullUrl);
                return true;
            }
        }
    }

    return false;
}

// Human-like scroll function
// Human-like scroll function
function humanLikeScroll() {
    if (!isAutoScrolling) return;

    // 1. THIS CONTROLS SCROLL DISTANCE (currently 50-150 pixels)
    const scrollDistance = Math.floor(Math.random() * 100) + 300;

    // Smooth scroll
    window.scrollBy({
        top: scrollDistance,
        behavior: 'smooth'
    });

    // 2. THIS CONTROLS THE DELAY (currently 600-1500ms)
    const nextDelay = Math.floor(Math.random() * 900) + 200;

    autoScrollInterval = setTimeout(humanLikeScroll, nextDelay);
}

// Start auto-scrolling
async function startAutoScroll() {
    if (isAutoScrolling) return;

    console.log('Starting auto-scroll...');
    isAutoScrolling = true;

    // Wait for known posts to be loaded from storage
    await initializeKnownPosts();

    // Send message to popup
    browserAPI.runtime.sendMessage({
        type: 'AUTO_SCROLL_STATUS',
        isScrolling: true
    }).catch(() => {});

    humanLikeScroll();
}

// Stop auto-scrolling
function stopAutoScroll() {
    if (!isAutoScrolling) return;

    console.log('Stopping auto-scroll...');
    isAutoScrolling = false;

    if (autoScrollInterval) {
        clearTimeout(autoScrollInterval);
        autoScrollInterval = null;
    }

    // Send message to popup
    browserAPI.runtime.sendMessage({
        type: 'AUTO_SCROLL_STATUS',
        isScrolling: false
    }).catch(() => {});
}

// Listen for messages from background script and popup
browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === 'CLEAR_CACHE') {
        seenPairs.clear();
        console.log('Twitter Ticker Extractor: Cache cleared');
    } else if (message.type === 'START_AUTO_SCROLL') {
        startAutoScroll();
    } else if (message.type === 'STOP_AUTO_SCROLL') {
        stopAutoScroll();
    } else if (message.type === 'GET_AUTO_SCROLL_STATUS') {
        return Promise.resolve({ isScrolling: isAutoScrolling });
    }
});
