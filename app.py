import os
import time
import hashlib
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": 0,
    "ttl": 900  # 15 minutes cache
}

def parse_release_notes():
    try:
        # Fetch the feed
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        req = urllib.request.Request(FEED_URL, headers=headers)
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        
        # Parse XML
        root = ET.fromstring(xml_data)
        
        # Namespace map for Atom
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries_data = []
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text
            updated_str = entry.find('atom:updated', ns).text
            
            # Fetch alt link if present
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            if link_elem is not None:
                link = link_elem.attrib.get('href')
            else:
                link_elem = entry.find("atom:link", ns)
                link = link_elem.attrib.get('href') if link_elem is not None else ""
                
            content_elem = entry.find('atom:content', ns)
            if content_elem is None or not content_elem.text:
                continue
                
            content_html = content_elem.text
            soup = BeautifulSoup(content_html, 'html.parser')
            
            # Check if there are h2/h3/h4 headings to split on
            headings = soup.find_all(['h2', 'h3', 'h4'])
            
            updates = []
            if not headings:
                # Fallback: whole content is one update
                text_content = soup.get_text(separator=' ', strip=True)
                updates.append({
                    'category': 'General',
                    'content_html': content_html,
                    'content_text': text_content
                })
            else:
                # Group by heading
                current_category = "General"
                current_elements = []
                for element in soup.contents:
                    # Ignore comment nodes or empty strings
                    if element.name in ['h2', 'h3', 'h4']:
                        if current_elements:
                            html_str = "".join(str(e) for e in current_elements)
                            # Remove surrounding tags/whitespace
                            text_str = BeautifulSoup(html_str, 'html.parser').get_text(separator=' ', strip=True)
                            if text_str.strip() or html_str.strip():
                                updates.append({
                                    'category': current_category,
                                    'content_html': html_str,
                                    'content_text': text_str
                                })
                            current_elements = []
                        current_category = element.get_text(strip=True)
                    else:
                        current_elements.append(element)
                        
                # Append final block
                if current_elements:
                    html_str = "".join(str(e) for e in current_elements)
                    text_str = BeautifulSoup(html_str, 'html.parser').get_text(separator=' ', strip=True)
                    if text_str.strip() or html_str.strip():
                        updates.append({
                            'category': current_category,
                            'content_html': html_str,
                            'content_text': text_str
                        })
            
            # Now format and store each individual update item
            for idx, update in enumerate(updates):
                cat = update['category']
                html = update['content_html']
                text = update['content_text']
                
                # Generate stable unique ID
                input_str = f"{date_str}_{cat}_{text[:100]}"
                item_id = hashlib.sha256(input_str.encode('utf-8')).hexdigest()[:12]
                
                # Clean up category name (e.g. capitalize)
                cat_clean = cat.capitalize() if cat else "Update"
                
                # Create default tweet text template
                # Keep text truncated so it fits Twitter's 280 limits easily (leave space for link)
                # Twitter limit is 280. Date (approx 15 chars) + Cat (approx 10) + "BigQuery Update" (approx 20) + Link (approx 23 for t.co)
                # We can truncate content to ~180 chars.
                truncated_text = text
                if len(truncated_text) > 180:
                    truncated_text = truncated_text[:177] + "..."
                
                tweet_text = f"BigQuery Update ({date_str}) • {cat_clean}\n\n{truncated_text}\n\nRead more: {link}"
                
                entries_data.append({
                    'id': item_id,
                    'date': date_str,
                    'updated_iso': updated_str,
                    'category': cat_clean,
                    'content_html': html,
                    'content_text': text,
                    'link': link,
                    'tweet_text': tweet_text
                })
                
        return entries_data, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Return cache if valid and refresh not forced
    if cache["data"] is not None and not force_refresh and (now - cache["last_updated"] < cache["ttl"]):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_updated": cache["last_updated"],
            "data": cache["data"]
        })
        
    # Otherwise fetch and parse
    data, error = parse_release_notes()
    if error:
        # If fetch fails but we have stale cache, fall back to it
        if cache["data"] is not None:
            return jsonify({
                "status": "partial_success",
                "source": "stale_cache_fallback",
                "error": error,
                "last_updated": cache["last_updated"],
                "data": cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch or parse release notes: {error}"
        }), 500
        
    cache["data"] = data
    cache["last_updated"] = now
    
    return jsonify({
        "status": "success",
        "source": "network",
        "last_updated": now,
        "data": data
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
