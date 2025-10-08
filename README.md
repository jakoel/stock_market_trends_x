# Twitter Stock Ticker Extractor - Firefox Extension

## Overview
This Firefox extension automatically extracts stock ticker symbols and their associated post URLs from Twitter/X as you scroll. It saves the data to a CSV file that updates continuously.

## Features
- ✅ Continuously monitors Twitter/X pages for stock tickers
- ✅ Extracts tickers from links containing `=%24` (URL-encoded `$`)
- ✅ Associates each ticker with its post URL
- ✅ Prevents duplicates (same ticker-post combination only appears once)
- ✅ Auto-exports to single CSV cache file every time new data is found
- ✅ Always uses the same filename: `twitter_tickers_cache.csv`
- ✅ No UI interruptions - runs silently in the background
- ✅ Saves state across browser sessions

## Installation

### Method 1: Temporary Installation (for testing)
1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the extension folder and select `manifest.json`
5. The extension is now active!

### Method 2: Permanent Installation (requires signing)
1. Zip the extension folder contents (manifest.json, content.js, background.js, icon.png)
2. Go to https://addons.mozilla.org/developers/
3. Submit your extension for signing
4. Once approved, install the signed .xpi file

## Usage

1. **Install the extension** using one of the methods above
2. **Navigate to https://x.com** or any Twitter page
3. **Start scrolling** - the extension automatically monitors the page
4. **CSV file is auto-updated** in your Downloads folder every time new ticker-post pairs are found
5. The file is always named: `twitter_tickers_cache.csv` (overwrites itself with updates)

## CSV Format

```csv
Ticker,Post URL
$OSCR,https://x.com/username/status/1234567890
$HIMS,https://x.com/username/status/9876543210
```

## Manual Export

Click the extension icon in the toolbar to manually trigger an export (optional).

## File Storage

- CSV file is saved to your default Downloads folder as `twitter_tickers_cache.csv`
- File is automatically overwritten with updates (always the same file)
- Extension remembers all seen ticker-post pairs across browser sessions
- The cache file grows as you discover new ticker-post combinations

## Permissions

- `https://x.com/*` - Monitor Twitter pages
- `storage` - Remember ticker pairs between sessions
- `downloads` - Auto-save CSV files

## Troubleshooting

**Extension not working:**
1. Check that you're on x.com or twitter.com
2. Open Browser Console (Ctrl+Shift+J) and look for messages starting with "Twitter Ticker Extractor"
3. Reload the page

**No CSV file appearing:**
1. Check your Firefox Downloads folder for `twitter_tickers_cache.csv`
2. Make sure Firefox has permission to download files
3. Check Firefox's download settings (should be set to auto-save)

**File not updating:**
- Check the Browser Console for messages
- Make sure you're scrolling on x.com and new ticker posts are appearing
- The file updates 2 seconds after the last new ticker is detected

## How It Works

1. **Content Script** (`content.js`) runs on all Twitter pages
2. Monitors the page for DOM changes (new tweets loading as you scroll)
3. Finds all links containing `=%24` (stock ticker links)
4. Extracts ticker symbol and associated post URL
5. Sends new pairs to background script
6. **Background Script** (`background.js`) collects all pairs
7. Removes duplicates
8. Exports to CSV file automatically after 2 seconds of inactivity

## Privacy

- All data is processed locally in your browser
- No data is sent to external servers
- Data is only saved to your local Downloads folder

## Development

To modify the extension:
1. Edit the source files
2. Reload the extension in `about:debugging`
3. Refresh the Twitter page to see changes

## License

Free to use and modify.
