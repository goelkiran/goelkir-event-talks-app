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

# Mock data for additional release note sources
PYSPARK_RELEASES = [
    {
        "id": "ps_01",
        "date": "June 15, 2026",
        "updated_iso": "2026-06-15T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>Arrow-Optimized Python UDFs</h3>\n<p>PySpark has introduced performance enhancements for Python User-Defined Functions (UDFs) by optimizing Apache Arrow serialization. This results in up to 5x faster processing for complex analytical and machine learning workloads.</p>",
        "content_text": "PySpark has introduced performance enhancements for Python User-Defined Functions (UDFs) by optimizing Apache Arrow serialization. This results in up to 5x faster processing for complex analytical workloads.",
        "link": "https://spark.apache.org/docs/latest/api/python/index.html",
        "source": "PySpark"
    },
    {
        "id": "ps_02",
        "date": "May 28, 2026",
        "updated_iso": "2026-05-28T00:00:00-07:00",
        "category": "Changed",
        "content_html": "<h3>Spark Connect Default Client</h3>\n<p>In PySpark 4.0, Spark Connect is now enabled by default for remote client connections. Users can connect to Spark clusters using thin clients, improving debugging and application isolation.</p>",
        "content_text": "In PySpark 4.0, Spark Connect is now enabled by default for remote client connections. Users can connect to Spark clusters using thin clients, improving debugging and application isolation.",
        "link": "https://spark.apache.org/docs/latest/spark-connect.html",
        "source": "PySpark"
    },
    {
        "id": "ps_03",
        "date": "April 10, 2026",
        "updated_iso": "2026-04-10T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>Structured Streaming Python Stateful Processing</h3>\n<p>Added general availability for python stateful processing in Structured Streaming. Developers can now implement arbitrary stateful operations using PySpark without delegating to Scala JVM APIs.</p>",
        "content_text": "Added general availability for python stateful processing in Structured Streaming. Developers can now implement arbitrary stateful operations using PySpark without delegating to Scala JVM APIs.",
        "link": "https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html",
        "source": "PySpark"
    }
]

SNOWFLAKE_RELEASES = [
    {
        "id": "sf_01",
        "date": "June 12, 2026",
        "updated_iso": "2026-06-12T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>Cortex Analyst GA</h3>\n<p>Snowflake Cortex Analyst is now generally available, enabling developers to build LLM-powered interfaces over relational tables. Users can query data using natural language SQL synthesis with 95%+ precision metrics.</p>",
        "content_text": "Snowflake Cortex Analyst is now generally available, enabling developers to build LLM-powered interfaces over relational tables. Users can query data using natural language SQL synthesis with 95%+ precision metrics.",
        "link": "https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst",
        "source": "Snowflake"
    },
    {
        "id": "sf_02",
        "date": "May 20, 2026",
        "updated_iso": "2026-05-20T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>Snowpark Container Services (SPCS) GA</h3>\n<p>Snowpark Container Services is generally available on AWS and Azure regions. Users can deploy containerized applications, machine learning training workflows, and APIs directly within Snowflake's secure boundary.</p>",
        "content_text": "Snowpark Container Services is generally available on AWS and Azure regions. Users can deploy containerized applications, machine learning training workflows, and APIs directly within Snowflake's secure boundary.",
        "link": "https://docs.snowflake.com/en/developer-guide/snowpark-container-services/overview",
        "source": "Snowflake"
    },
    {
        "id": "sf_03",
        "date": "April 15, 2026",
        "updated_iso": "2026-04-15T00:00:00-07:00",
        "category": "Changed",
        "content_html": "<h3>Iceberg Tables External Catalog Integration</h3>\n<p>Iceberg tables now support direct external catalog integrations with Polaris Catalog and AWS Glue. This allows Snowflake to query external object stores using shared iceberg format standards.</p>",
        "content_text": "Iceberg tables now support direct external catalog integrations with Polaris Catalog and AWS Glue. This allows Snowflake to query external object stores using shared iceberg format standards.",
        "link": "https://docs.snowflake.com/en/user-guide/tables-iceberg",
        "source": "Snowflake"
    }
]

ORACLE_RELEASES = [
    {
        "id": "or_01",
        "date": "June 16, 2026",
        "updated_iso": "2026-06-16T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>AI Vector Search in Oracle Database 23ai/26ai</h3>\n<p>Oracle Database has introduced AI Vector Search. It features a native <code>VECTOR</code> data type, vector distance functions (Cosine, Euclidean, Dot Product), and vector indexes (HNSW and IVF) to execute fast semantic search directly inside SQL queries.</p>",
        "content_text": "Oracle Database has introduced AI Vector Search. It features a native VECTOR data type, vector distance functions (Cosine, Euclidean, Dot Product), and vector indexes (HNSW and IVF) to execute fast semantic search directly inside SQL queries.",
        "link": "https://docs.oracle.com/en/database/oracle/oracle-database/23/vecse/index.html",
        "source": "Oracle 26ai"
    },
    {
        "id": "or_02",
        "date": "May 15, 2026",
        "updated_iso": "2026-05-15T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>JSON Relational Duality Views</h3>\n<p>JSON Relational Duality views are generally available. Developers can query and update relational data as structured JSON documents, combining the simplicity of Document databases with the validation of Relational databases.</p>",
        "content_text": "JSON Relational Duality views are generally available. Developers can query and update relational data as structured JSON documents, combining the simplicity of Document databases with the validation of Relational databases.",
        "link": "https://docs.oracle.com/en/database/oracle/oracle-database/23/jsnqr/json-relational-duality-views.html",
        "source": "Oracle 26ai"
    },
    {
        "id": "or_03",
        "date": "April 05, 2026",
        "updated_iso": "2026-04-05T00:00:00-07:00",
        "category": "Feature",
        "content_html": "<h3>Select AI - LLM Integration in SQL</h3>\n<p>Select AI integrates Oracle SQL directly with large language models (LLMs) like OpenAI, Cohere, and OCI Generative AI. Users can write queries like <code>SELECT AI query customers in New York</code> to automatically compile relational SQL and fetch results.</p>",
        "content_text": "Select AI integrates Oracle SQL directly with large language models (LLMs) like OpenAI, Cohere, and OCI Generative AI. Users can write queries like SELECT AI query customers in New York to automatically compile relational SQL and fetch results.",
        "link": "https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/select-ai.html",
        "source": "Oracle 26ai"
    }
]

def parse_release_notes():
    try:
        # Fetch the BigQuery feed
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        req = urllib.request.Request(FEED_URL, headers=headers)
        
        bq_entries = []
        try:
            with urllib.request.urlopen(req) as response:
                xml_data = response.read()
            
            # Parse XML
            root = ET.fromstring(xml_data)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
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
                        if element.name in ['h2', 'h3', 'h4']:
                            if current_elements:
                                html_str = "".join(str(e) for e in current_elements)
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
                    
                    cat_clean = cat.capitalize() if cat else "Update"
                    
                    truncated_text = text
                    if len(truncated_text) > 180:
                        truncated_text = truncated_text[:177] + "..."
                    
                    tweet_text = f"BigQuery Update ({date_str}) • {cat_clean}\n\n{truncated_text}\n\nRead more: {link}"
                    
                    bq_entries.append({
                        'id': item_id,
                        'date': date_str,
                        'updated_iso': updated_str,
                        'category': cat_clean,
                        'content_html': html,
                        'content_text': text,
                        'link': link,
                        'tweet_text': tweet_text,
                        'source': 'BigQuery'
                    })
        except Exception as e_xml:
            print(f"XML Parsing Error: {e_xml}")
            # If BQ RSS fails to parse, it will stay empty and continue with other sources

        # Format additional mock sources
        additional_entries = []
        for mock_source in [PYSPARK_RELEASES, SNOWFLAKE_RELEASES, ORACLE_RELEASES]:
            for item in mock_source:
                text = item["content_text"]
                truncated_text = text
                if len(truncated_text) > 180:
                    truncated_text = truncated_text[:177] + "..."
                
                tweet_text = f"{item['source']} Update ({item['date']}) • {item['category']}\n\n{truncated_text}\n\nRead more: {item['link']}"
                
                additional_entries.append({
                    'id': item['id'],
                    'date': item['date'],
                    'updated_iso': item['updated_iso'],
                    'category': item['category'],
                    'content_html': item['content_html'],
                    'content_text': item['content_text'],
                    'link': item['link'],
                    'tweet_text': tweet_text,
                    'source': item['source']
                })
        
        # Merge datasets
        all_entries = bq_entries + additional_entries
        
        # Sort chronologically by updated_iso (newest first)
        all_entries.sort(key=lambda x: x['updated_iso'], reverse=True)
        
        return all_entries, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if cache["data"] is not None and not force_refresh and (now - cache["last_updated"] < cache["ttl"]):
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_updated": cache["last_updated"],
            "data": cache["data"]
        })
        
    data, error = parse_release_notes()
    if error:
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
