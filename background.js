// Twitter Stock Ticker Extractor - Background Script
// Manages data storage and CSV export

// Browser API compatibility for Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let allPairs = new Map(); // Map of "ticker|url" -> {ticker, url}
let newPairsCount = 0; // Track new pairs added since last auto-save

// Handle messages from content script and popup
browserAPI.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'NEW_TICKER_PAIRS') {
        // Add new pairs to our collection
        let newPairsAdded = false;

        message.pairs.forEach(pair => {
            const key = `${pair.ticker}|${pair.url}`;
            if (!allPairs.has(key)) {
                allPairs.set(key, pair);
                newPairsAdded = true;
                newPairsCount++;
            }
        });

        // If new pairs were added, save to storage
        if (newPairsAdded) {
            saveToStorage();
            
            // Auto-save CSV after every 20 new pairs
            if (newPairsCount >= 20) {
                console.log(`Auto-saving CSV after ${newPairsCount} new pairs detected`);
                exportToCSV();
                newPairsCount = 0; // Reset counter
            }
        }
    } else if (message.type === 'RELOAD_DATA') {
        // Reload data from storage (after CSV upload or clear)
        loadFromStorage();
        newPairsCount = 0; // Reset counter when data is reloaded
    } else if (message.type === 'EXPORT_NOW') {
        // Manual export trigger
        exportToCSV();
        newPairsCount = 0; // Reset counter after manual export
    }
});

// Export data to CSV file (manual export only)
function exportToCSV() {
    if (allPairs.size === 0) {
        return; // Nothing to export
    }

    // Create CSV content
    let csvContent = 'Ticker,Post URL,Timestamp\n';

    // Convert to array (most recent first - FIFO)
    const pairsArray = Array.from(allPairs.values()).reverse();

    pairsArray.forEach(pair => {
        const timestamp = pair.timestamp || '';
        csvContent += `$${pair.ticker},${pair.url},${timestamp}\n`;
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Fixed filename - always the same file
    const filename = 'twitter_tickers_cache.csv';

    // Download the file
    browserAPI.downloads.download({
        url: url,
        filename: filename,
        saveAs: false,
        conflictAction: 'overwrite'
    }).then(() => {
        console.log(`Exported ${filename} with ${allPairs.size} ticker-post pairs`);
        // Clean up blob URL after download
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }).catch(err => {
        console.error('Export failed:', err);
    });
}

// Function to load data from storage
function loadFromStorage() {
    console.log('Loading data from storage...');
    browserAPI.storage.local.get('tickerPairs').then(result => {
        console.log('Storage get result:', result);
        if (result.tickerPairs) {
            allPairs = new Map(Object.entries(result.tickerPairs));
            console.log(`Loaded ${allPairs.size} ticker pairs from storage`);
        } else {
            allPairs = new Map();
            console.log('No stored data found');
        }
    }).catch(err => {
        console.error('Error loading from storage:', err);
        allPairs = new Map();
    });
}

// Save data to storage immediately after changes
function saveToStorage() {
    if (allPairs.size > 0) {
        const pairsObj = Object.fromEntries(allPairs);
        console.log('Saving to storage:', allPairs.size, 'pairs');
        browserAPI.storage.local.set({ tickerPairs: pairsObj }).then(() => {
            console.log(`Saved ${allPairs.size} pairs to storage`);
        }).catch(err => {
            console.error('Error saving to storage:', err);
        });
    }
}

// Load saved data when extension starts
loadFromStorage();

// Save data periodically (but don't auto-download)
setInterval(() => {
    saveToStorage();
}, 30000); // Save every 30 seconds
