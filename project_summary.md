# Modern Data Engineering Release Explorer

A premium, modern web application built using a Python Flask backend and a responsive vanilla HTML, CSS, and JS frontend. It aggregates, parses, and displays release notes from multiple data platforms—Google Cloud BigQuery, Apache Spark/PySpark, Snowflake, and Oracle 26ai—supporting custom microblog drafting, 200-word UK English blog generation, Clipboard copying, X sharing, and simulated local social logging.

## 📂 Project Architecture

```
/mnt/c/kkLab/kaggle-ai-agents/agy-cli-projects/
├── app.py                     # Flask server, RSS feed fetchers, PySpark HTML scrapers
├── requirements.txt           # Python library dependencies
├── templates/
│   └── index.html             # HTML5 structure (responsive panels, toggle switch, tabs)
└── static/
    ├── css/
    │   └── style.css          # Slate dark & light theme styles and visual indicators
    └── js/
        └── app.js             # Client state, filters, copy events, and composers
```

## 🛠️ Key Implementation Details

### 1. Multi-Source Parser Engine (`app.py`)
* **BigQuery XML Parser**: Fetches Google Cloud's Atom XML feed and splits grouped daily logs by `<h3>` heading tags to extract individual updates.
* **PySpark Live Scraper**: Queries `https://spark.apache.org/news/index.html` on demand. Scrapes article title elements, release dates, and HTML contents to structure official PySpark announcements.
* **Enterprise Fallback Caches**: Provides structured offline release lists for Snowflake and Oracle 26ai that link directly to official pages, preventing Cloudflare-related retrieval blocks.
* **Chronological Sorter**: Merges all sources and sorts them by ISO-8601 timestamps so the newest releases appear first.
* **In-Memory Cache (TTL: 15m)**: Retains query lists locally to prevent feed rate-limiting.

### 2. Dual Composer Sharing Workspace (`app.js`)
* **Microblog Card**: pre-populates a character-validated composer (max 280) for X. Shortens all URLs to a fixed 23 characters (matching X's `t.co` logic) to calculate accurate remaining limits. Animates a circular SVG progress gauge that shifts color based on warnings.
* **200-Word Blog Card**: Generates a professional data engineering blog post in **UK English** spelling (e.g. *optimised*, *modelling*, *programme*). It automatically appends targeted database hashtags (e.g. `#AIVectorSearch`, `#PolarisCatalog`, `#Snowpark`) and appends direct source hyperlinks.
* **Simulated Social Feed**: Logs drafts to a local, session-bound social timeline tab to preview posts in a real feed.

### 3. Utility Integrations
* **Light/Dark Toggle**: A sliding header switch toggles the `light-theme` class on the document body, swapping root variables for backgrounds, cards, lists, badges, and composer layouts.
* **Export CSV**: Triggers a browser download of a compiled CSV blob containing the Date, Category, Source, and Text Content of the **currently filtered/searched list**.
* **One-Click Card Copies**: Clickboard icons on each feed card enable copying of release contents without opening the side panels.

---

## ⚡ Running the Application

### Setup virtual environment and dependencies
```bash
# Create virtual environment
python3 -m venv venv

# Install required parsing and server dependencies
./venv/bin/pip install -r requirements.txt
```

### Run the Dev Server
```bash
./venv/bin/python app.py
```
The server will bind to `http://127.0.0.1:5000`.
