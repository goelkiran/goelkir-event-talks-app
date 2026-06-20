# DataDock Release Hub

A high-fidelity, responsive web application that aggregates release updates from Google Cloud BigQuery, Apache Spark/PySpark, Snowflake, and Oracle 26ai, featuring an interactive social sharing workspace. Built with a lightweight **Python Flask** backend and a custom, premium **Vanilla HTML/JS/CSS** frontend.

---

## ✨ Features

- **🚀 Smart Heading Splitter**: Google's feed clusters multiple announcements under a single date entry. Our parser slices daily notes by `<h3>` heading tags, creating individual, selectable update cards (e.g. *Feature*, *Changed*, *Deprecated*).
- **⏱️ In-Memory Cache (TTL: 15m)**: Prevents redundant round-trips to Google's XML feed, ensuring instant load times. User-forced cache bypass is available via the **Refresh** button.
- **🐦 X-Compliant (t.co) Character Composers**: URL links are parsed and counted as exactly **23 characters** (matching Twitter/X's official URL-shortening policy) to reflect precise limits.
- **🌀 Dynamic Visual Feedback**: Features custom scrollbars, toast notification systems, skeleton loaders, and an SVG character progress ring that shifts colors (Blue ➡️ Yellow ➡️ Red).
- **🧪 Local Social Simulator**: Posts drafts to an in-memory session timeline, allowing you to preview how updates render in a realistic feed.
- **📢 Twitter Web Intent**: Launch direct composer intents with one click, pre-populated with customized templates.

---

## 📂 Codebase File Structure

```
.
├── app.py                      # Flask server, caching system, and RSS parser
├── requirements.txt            # Python dependencies (Flask, BeautifulSoup4, requests)
├── .gitignore                  # Git tracking exclusion filters
├── project_summary.md          # Project design notes
├── system_architecture.md      # Detailed server/client details and sequence flows
├── implementation_plan.md      # Phase and task tracker logs
├── templates/
│   └── index.html              # High-fidelity layout structure
└── static/
    ├── css/
    │   └── style.css           # Premium dark-theme stylesheet
    └── js/
        └── app.js              # Client state, SVG meters, API hooks, and filter scripts
```

---

## ⚡ Quick Start

### 1. Prerequisite Requirements
Ensure you have Python 3.8+ installed on your system.

### 2. Environment Setup & Dependency Installation
Initialize a virtual environment and install the required modules:

```bash
# Create a local virtual environment
python3 -m venv venv

# Activate virtual environment (Linux/macOS)
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Run the Development Server
Launch the Flask server in development mode:

```bash
python app.py
```
The server will run on:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📖 Usage Instructions

1. **Refresh Feed**: Click the **Refresh Feed** button in the header. The spinner will rotate as it bypasses local cache to fetch the latest Atom XML notes.
2. **Search and Filter**: Type keywords into the search bar, or toggle category pills (*Features*, *Changes*, *Deprecated*, *General*) to filter notes dynamically.
3. **Select Update**: Click on a release card to activate the **Social Workspace** on the right side. The details will populate, and a draft tweet containing metadata and links will load into the composer.
4. **Draft & Customize**: Edit the text in the Twitter composer. Observe the character progress circle adjusting real-time based on Twitter's counting rules.
5. **Share & Log**:
   - Click **Post** to open Twitter/X's web share intent in a new tab.
   - Click **Simulate** to log the tweet to your local timeline feed in the **Simulated Tweets** navigation tab.
   - Click **Copy** (in header or footer actions) to copy release links or draft texts to your clipboard.
