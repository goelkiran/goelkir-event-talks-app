# BigQuery Release Notes Navigator

A premium, modern web application built using a Python Flask backend and a responsive vanilla HTML, CSS, and JS frontend. It fetches the BigQuery Release Notes Atom Feed, organizes individual updates, and enables custom tweet composer previews, Clipboard copying, Twitter/X intent sharing, and simulation logs.

## 📂 Project Architecture

```
/mnt/c/kkLab/kaggle-ai-agents/agy-cli-projects/
├── app.py                     # Flask server, Atom XML parser, and in-memory cache
├── requirements.txt           # Python library dependencies
├── templates/
│   └── index.html             # High-fidelity layout, spinner, filters, and composer
└── static/
    ├── css/
    │   └── style.css          # Modern dark-theme stylesheet with glassmorphism
    └── js/
        └── app.js             # API interaction, category pill filtering, and character counters
```

## 🛠️ Key Implementation Details

### 1. Robust Feed Parser & Splitter (`app.py`)
Google's BigQuery Release Notes feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) groups release announcements by date inside `<entry>` elements.
* To make it easy to select and share individual details, the backend extracts the CDATA HTML from each entry.
* It uses **BeautifulSoup** to group sibling elements under headings (`<h3>`, `<h4>`, `h2`), splitting daily blocks into distinct structural updates.
* If headings are not found, the parser safely falls back to treating the block as a `General` update.
* Stable unique IDs are calculated for every update card by hashing the contents, ensuring select states persist reliably across loads.

### 2. High-Fidelity Social Composer & X URL Behavior (`app.js`)
* **Real-time Draft Editor**: When any update card is clicked, the Social Workspace panel unlocks and pre-populates a simulated X (Twitter) Card with character counters and profile templates.
* **X-Compliant Length Meter**: Standard string lengths do not represent true X/Twitter character usage because X's parser automatically shortens all URLs to a `t.co` format counting as exactly **23 characters**.
  * The frontend JavaScript calculates the length using this rule, preventing incorrect warnings or restrictions on links:
    ```javascript
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    const lengthWithoutUrls = text.replace(urlRegex, '').length;
    const count = lengthWithoutUrls + (urls.length * 23);
    ```
  * An animated circular SVG progress ring dynamically changes color (Blue ➡️ Amber ➡️ Red) as limits approach.

### 3. Share & Simulation Actions
* **Refresh with Spinner**: Clicking "Refresh Feed" forces a network refresh with `?refresh=true` while displaying a rotating loader spinner.
* **Copy Text / Link**: Fast one-click clipboards copies the tweet text or official release page link.
* **Simulate Tweet**: Posts the tweet locally into a separate, beautifully rendered feed page, which tracks user submissions in memory.
* **Post on X**: Directly loads the official Web Intent window to share on public profiles.

---

## ⚡ Running the Application

### Setup virtual environment and dependencies
```bash
# Verify Python version & create virtual environment
python3 -m venv venv

# Install required parsing and server dependencies
./venv/bin/pip install -r requirements.txt
```

### Run the Dev Server
```bash
./venv/bin/python app.py
```
The server will bind to `http://127.0.0.1:5000` and start rendering.
