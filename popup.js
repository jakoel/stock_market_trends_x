// Popup script for Twitter Ticker Extractor

// Browser API compatibility for Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const pairCountEl = document.getElementById('pairCount');
const csvTextArea = document.getElementById('csvText');
const loadCsvBtn = document.getElementById('loadCsvBtn');
const loadExistingBtn = document.getElementById('loadExistingBtn');
const toggleCsvBtn = document.getElementById('toggleCsvBtn');
const csvSection = document.getElementById('csvSection');
const timeFilter = document.getElementById('timeFilter');
const showTopBtn = document.getElementById('showTopBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');
const messageEl = document.getElementById('message');
const resultsDiv = document.getElementById('results');
const resultsContent = document.getElementById('resultsContent');
const autoScrollBtn = document.getElementById('autoScrollBtn');
const scrollStatus = document.getElementById('scrollStatus');
const csvFileInput = document.getElementById('csvFileInput');

console.log('Popup script loaded');
console.log('Elements found:', {
    pairCountEl: !!pairCountEl,
    csvTextArea: !!csvTextArea,
    loadCsvBtn: !!loadCsvBtn,
    loadExistingBtn: !!loadExistingBtn,
    toggleCsvBtn: !!toggleCsvBtn,
    csvSection: !!csvSection,
    timeFilter: !!timeFilter,
    showTopBtn: !!showTopBtn,
    exportBtn: !!exportBtn,
    clearBtn: !!clearBtn
});

// Update pair count display
function updatePairCount() {
    browserAPI.storage.local.get('tickerPairs').then(result => {
        if (result.tickerPairs) {
            const count = Object.keys(result.tickerPairs).length;
            pairCountEl.textContent = `${count} ticker pairs`;
            pairCountEl.className = 'status info';
        } else {
            pairCountEl.textContent = 'No data stored';
            pairCountEl.className = 'status info';
        }
    });
}

// Show message
function showMessage(text, type = 'info') {
    messageEl.textContent = text;
    messageEl.className = `status ${type}`;
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
    }, 3000);
}

// Simple logging function
function log(message) {
    console.log(message);
}

// Parse CSV content and return array of {ticker, url, timestamp} objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const pairs = [];

    log(`CSV parsing - total lines: ${lines.length}`);

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line) {
            continue;
        }

        // Parse CSV line - split by comma but handle URLs with commas
        const parts = line.split(',');

        if (parts.length >= 2) {
            const ticker = parts[0].replace(/^\$/, '').trim().toUpperCase();
            const url = parts[1].trim().replace(/^["']|["']$/g, '');
            const timestamp = parts.length >= 3 ? parts[2].trim() : new Date().toISOString();

            if (ticker && url) {
                pairs.push({ ticker, url, timestamp });
            }
        }
    }

    log(`Total pairs parsed: ${pairs.length}`);
    return pairs;
}

// Function to process CSV data
async function processCsvData(csvText) {
    try {
        log(`Processing CSV data, length: ${csvText.length}`);

        const newPairs = parseCSV(csvText);

        if (newPairs.length === 0) {
            showMessage('No valid pairs found in CSV', 'error');
            return;
        }

        // Get existing pairs and merge
        const result = await browserAPI.storage.local.get('tickerPairs');
        const existingPairs = result.tickerPairs || {};
        let addedCount = 0;

        newPairs.forEach(pair => {
            const key = `${pair.ticker}|${pair.url}`;
            if (!existingPairs[key]) {
                existingPairs[key] = pair;
                addedCount++;
            }
        });

        // Save merged data
        await browserAPI.storage.local.set({ tickerPairs: existingPairs });

        // Notify background script to reload data
        try {
            await browserAPI.runtime.sendMessage({ type: 'RELOAD_DATA' });
        } catch (msgErr) {
            log(`Failed to send RELOAD_DATA message: ${msgErr.message}`);
        }

        showMessage(`Added ${addedCount} new pairs (${newPairs.length - addedCount} duplicates skipped)`, 'success');
        updatePairCount();
        csvTextArea.value = ''; // Clear text area

    } catch (err) {
        log(`Error during CSV processing: ${err.message}`);
        showMessage('Error: ' + err.message, 'error');
    }
}

// Load CSV button click handler
loadCsvBtn.addEventListener('click', async () => {
    const csvText = csvTextArea.value.trim();
    if (!csvText) {
        showMessage('Please enter CSV data', 'error');
        return;
    }
    
    showMessage('Loading CSV...', 'info');
    await processCsvData(csvText);
});

// File input handler
csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
        showMessage('Please select a CSV file', 'error');
        return;
    }

    log(`File selected: ${file.name}, Size: ${file.size}`);
    showMessage('Loading CSV...', 'info');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvText = e.target.result;
        await processCsvData(csvText);
        // Reset file input
        csvFileInput.value = '';
    };

    reader.onerror = (err) => {
        log(`FileReader error: ${err.message}`);
        showMessage('Error reading file', 'error');
        csvFileInput.value = '';
    };

    reader.readAsText(file);
});

// Drag and drop functionality
csvTextArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvTextArea.style.borderColor = '#1da1f2';
});

csvTextArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    csvTextArea.style.borderColor = '#ccc';
});

csvTextArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    csvTextArea.style.borderColor = '#ccc';

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showMessage('Please drop a CSV file', 'error');
        return;
    }

    log(`File dropped: ${file.name}, Size: ${file.size}`);
    showMessage('Loading CSV...', 'info');

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvText = e.target.result;
        await processCsvData(csvText);
    };

    reader.onerror = (err) => {
        log(`FileReader error: ${err.message}`);
        showMessage('Error reading file', 'error');
    };

    reader.readAsText(file);
});

// Toggle CSV section visibility
toggleCsvBtn.addEventListener('click', () => {
    if (csvSection.style.display === 'none') {
        csvSection.style.display = 'block';
        toggleCsvBtn.textContent = '📁 Hide CSV Data';
    } else {
        csvSection.style.display = 'none';
        toggleCsvBtn.textContent = '📁 Load CSV Data';
    }
});

// Auto-load existing CSV file only once on extension start
let hasAutoLoaded = false;
async function autoLoadExistingCSV() {
    if (hasAutoLoaded) return;
    
    try {
        log('Auto-loading existing CSV file...');
        
        // Try to fetch the existing CSV file
        const response = await fetch('twitter_tickers_cache.csv');
        if (!response.ok) {
            log(`Could not load CSV file: HTTP ${response.status}`);
            return;
        }
        
        const csvText = await response.text();
        log(`Auto-loaded existing CSV file, length: ${csvText.length}`);
        
        // Process the CSV data directly
        await processCsvData(csvText);
        hasAutoLoaded = true;
        
    } catch (err) {
        log(`Auto-load failed: ${err.message}`);
        // Silently fail - user can manually load if needed
    }
}

// Load existing CSV file button
loadExistingBtn.addEventListener('click', async () => {
    try {
        showMessage('Loading existing CSV file...', 'info');
        
        // Try to fetch the existing CSV file
        const response = await fetch('twitter_tickers_cache.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        log(`Loaded existing CSV file, length: ${csvText.length}`);
        
        // Process the CSV data directly
        await processCsvData(csvText);
        
    } catch (err) {
        log(`Error loading existing CSV: ${err.message}`);
        showMessage(`Error loading CSV file: ${err.message}`, 'error');
        
        // Fallback: show instructions
        showMessage('Could not load CSV file. Please copy and paste the content manually.', 'info');
    }
});

// Show top mentions with time filtering
showTopBtn.addEventListener('click', async () => {
    try {
        showMessage('Running analysis...', 'info');

        const result = await browserAPI.storage.local.get('tickerPairs');
        if (!result.tickerPairs) {
            showMessage('No data to analyze', 'error');
            return;
        }

        // Get time filter value
        const daysBack = parseInt(timeFilter.value);
        const cutoffDate = daysBack > 0 ? new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000)) : null;

        // Count tickers and track timestamps with time filtering
        const tickerData = {};
        Object.values(result.tickerPairs).forEach(pair => {
            const ticker = pair.ticker.toUpperCase();
            
            // Apply time filter
            if (cutoffDate && pair.timestamp) {
                const pairDate = new Date(pair.timestamp);
                if (pairDate < cutoffDate) {
                    return; // Skip this pair if it's older than the filter
                }
            }
            
            if (!tickerData[ticker]) {
                tickerData[ticker] = {
                    count: 0,
                    timestamps: []
                };
            }
            tickerData[ticker].count++;
            if (pair.timestamp) {
                tickerData[ticker].timestamps.push(new Date(pair.timestamp));
            }
        });

        // Sort by count
        const sorted = Object.entries(tickerData)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

        // Display results
        if (sorted.length === 0) {
            resultsContent.textContent = 'No tickers found for the selected time range.';
        } else {
            const timeRangeText = daysBack === 0 ? 'All time' : `Last ${daysBack} day${daysBack > 1 ? 's' : ''}`;
            resultsContent.innerHTML = `<div style="margin-bottom: 10px; font-weight: bold; color: #00ffff;">📊 Top Mentions (${timeRangeText})</div>` +
                sorted.map(([ticker, data]) => {
                    const latestTime = data.timestamps.length > 0
                        ? new Date(Math.max(...data.timestamps))
                        : null;
                    const timeStr = latestTime
                        ? `<span class="mention-time">Latest: ${latestTime.toLocaleString()}</span>`
                        : '';
                    return `<div class="mention-item">
                        <span class="ticker-name">$${ticker}</span>
                        <span class="mention-count">(${data.count} mentions)</span>
                        ${timeStr}
                    </div>`;
                }).join('');
        }

        resultsDiv.style.display = 'block';

    } catch (err) {
        showMessage('Error: ' + err.message, 'error');
    }
});

// Export CSV only
exportBtn.addEventListener('click', () => {
    browserAPI.runtime.sendMessage({ type: 'EXPORT_NOW' }).then(() => {
        showMessage('CSV exported to Downloads', 'success');
    }).catch(() => {
        showMessage('Export failed', 'error');
    });
});

// Clear all data
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all stored ticker pairs?')) {
        browserAPI.storage.local.remove('tickerPairs').then(() => {
            browserAPI.runtime.sendMessage({ type: 'RELOAD_DATA' });
            showMessage('All data cleared', 'success');
            updatePairCount();
        });
    }
});


// Auto-scroll button functionality
let isAutoScrollActive = false;

async function updateAutoScrollButton() {
    try {
        // Query the active tab
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        // Get scroll status from content script
        const response = await browserAPI.tabs.sendMessage(tabs[0].id, { type: 'GET_AUTO_SCROLL_STATUS' });

        if (response && response.isScrolling) {
            isAutoScrollActive = true;
            autoScrollBtn.textContent = 'Stop Auto-Scroll';
            autoScrollBtn.classList.remove('primary');
            autoScrollBtn.classList.add('danger');
            scrollStatus.textContent = 'Auto-scrolling...';
            scrollStatus.style.display = 'block';
            scrollStatus.className = 'status success';
        } else {
            isAutoScrollActive = false;
            autoScrollBtn.textContent = 'Start Auto-Scroll';
            autoScrollBtn.classList.remove('danger');
            autoScrollBtn.classList.add('primary');
            scrollStatus.style.display = 'none';
        }
    } catch (err) {
        console.log('Could not get auto-scroll status:', err.message);
        // Reset to default state
        isAutoScrollActive = false;
        autoScrollBtn.textContent = 'Start Auto-Scroll';
        autoScrollBtn.classList.remove('danger');
        autoScrollBtn.classList.add('primary');
        scrollStatus.style.display = 'none';
    }
}

autoScrollBtn.addEventListener('click', async () => {
    try {
        // Query the active tab
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            showMessage('No active tab found', 'error');
            return;
        }

        const tab = tabs[0];

        // Check if we're on x.com
        if (!tab.url || !tab.url.includes('x.com')) {
            showMessage('Please navigate to x.com first', 'error');
            return;
        }

        if (isAutoScrollActive) {
            // Stop scrolling
            await browserAPI.tabs.sendMessage(tab.id, { type: 'STOP_AUTO_SCROLL' });
            isAutoScrollActive = false;
            autoScrollBtn.textContent = 'Start Auto-Scroll';
            autoScrollBtn.classList.remove('danger');
            autoScrollBtn.classList.add('primary');
            scrollStatus.style.display = 'none';
        } else {
            // Start scrolling
            await browserAPI.tabs.sendMessage(tab.id, { type: 'START_AUTO_SCROLL' });
            isAutoScrollActive = true;
            autoScrollBtn.textContent = 'Stop Auto-Scroll';
            autoScrollBtn.classList.remove('primary');
            autoScrollBtn.classList.add('danger');
            scrollStatus.textContent = 'Auto-scrolling...';
            scrollStatus.style.display = 'block';
            scrollStatus.className = 'status success';
        }
    } catch (err) {
        console.log('Error toggling auto-scroll:', err);
        showMessage('Error: Make sure you are on x.com', 'error');
    }
});

// Listen for auto-scroll status updates from content script
browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUTO_SCROLL_STATUS') {
        if (message.isScrolling) {
            isAutoScrollActive = true;
            autoScrollBtn.textContent = 'Stop Auto-Scroll';
            autoScrollBtn.classList.remove('primary');
            autoScrollBtn.classList.add('danger');
            scrollStatus.textContent = 'Auto-scrolling...';
            scrollStatus.style.display = 'block';
            scrollStatus.className = 'status success';
        } else {
            isAutoScrollActive = false;
            autoScrollBtn.textContent = 'Start Auto-Scroll';
            autoScrollBtn.classList.remove('danger');
            autoScrollBtn.classList.add('primary');
            scrollStatus.textContent = 'Stopped - found known post';
            scrollStatus.className = 'status info';
            // Hide status after 3 seconds
            setTimeout(() => {
                scrollStatus.style.display = 'none';
            }, 3000);
        }
    }
});

// Initial load
updatePairCount();
updateAutoScrollButton();

// Auto-load existing CSV data when popup opens
autoLoadExistingCSV();
