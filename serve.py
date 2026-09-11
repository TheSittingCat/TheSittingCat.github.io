#!/usr/bin/env python3
"""
Local testing server for Jekyll-based academic website.
Simulates Jekyll compilation for Windows environments without Ruby/Jekyll installed.

Usage:
    python serve.py
"""

import os
import sys
import time
import shutil
import re
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer

try:
    import yaml
except ImportError:
    print("PyYAML not found. Installing...")
    os.system(f'"{sys.executable}" -m pip install pyyaml')
    import yaml

try:
    import markdown
except ImportError:
    print("markdown package not found. Installing...")
    os.system(f'"{sys.executable}" -m pip install markdown')
    import markdown

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.path.join(ROOT_DIR, "_site")
PORT = 4000


def build_site():
    os.makedirs(SITE_DIR, exist_ok=True)

    # 1. Load _config.yml
    config = {}
    config_path = os.path.join(ROOT_DIR, "_config.yml")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    # 2. Parse index.md
    index_path = os.path.join(ROOT_DIR, "index.md")
    if not os.path.exists(index_path):
        print(f"Error: {index_path} not found.")
        return

    with open(index_path, "r", encoding="utf-8") as f:
        content_raw = f.read()

    # Split YAML front matter
    parts = content_raw.split("---", 2)
    md_body = parts[2] if len(parts) >= 3 else content_raw

    # Convert markdown to HTML
    html_body = markdown.markdown(
        md_body,
        extensions=["extra", "codehilite", "nl2br", "sane_lists"]
    )

    # 3. Process layout (_layouts/default.html)
    layout_path = os.path.join(ROOT_DIR, "_layouts", "default.html")
    if os.path.exists(layout_path):
        with open(layout_path, "r", encoding="utf-8") as f:
            template = f.read()
    else:
        template = "<!DOCTYPE html><html><body>{{ content }}</body></html>"

    rendered = template
    rendered = rendered.replace("{{ page.title | default: site.title }}", "Home")
    rendered = rendered.replace("{{ site.full_name | default: site.title }}", str(config.get("full_name", config.get("title", "Kaveh Eskandari"))))
    rendered = rendered.replace("{{ site.description | default: site.summary }}", str(config.get("description", "")))
    rendered = rendered.replace("{{ site.title }}", str(config.get("title", "Kaveh Eskandari")))
    rendered = rendered.replace("{{ site.logo | relative_url }}", "/assets/images/logo.jpg")
    rendered = rendered.replace("{{ site.logo | relative_url }}", "assets/images/logo.jpg")
    rendered = rendered.replace("{{ site.role | default: \"PhD Student in Computer Science\" }}", str(config.get("role", "PhD Student in Computer Science")))
    rendered = rendered.replace("{{ site.affiliation_url | default: 'https://www.tufts.edu/' }}", str(config.get("affiliation_url", "https://www.tufts.edu/")))
    rendered = rendered.replace("{{ site.affiliation | default: 'Tufts University' }}", str(config.get("affiliation", "Tufts University")))
    rendered = rendered.replace("{{ site.advisor_url | default: 'https://vsarathy.com/' }}", str(config.get("advisor_url", "https://vsarathy.com/")))
    rendered = rendered.replace("{{ site.advisor | default: 'Dr. Vasanth Sarathy' }}", str(config.get("advisor", "Dr. Vasanth Sarathy")))
    rendered = rendered.replace("{{ site.scholar }}", str(config.get("scholar", "")))
    rendered = rendered.replace("{{ site.github }}", str(config.get("github", "")))
    rendered = rendered.replace("{{ site.linkedin }}", str(config.get("linkedin", "")))
    rendered = rendered.replace("{{ site.email }}", str(config.get("email", "")))
    rendered = rendered.replace("{{ '/assets/css/style.css' | relative_url }}", "/assets/css/style.css")
    rendered = rendered.replace("{{ '/assets/js/main.js' | relative_url }}", "/assets/js/main.js")
    rendered = rendered.replace("{{ '/assets/css/style.css' | relative_url }}", "assets/css/style.css")
    rendered = rendered.replace("{{ '/assets/js/main.js' | relative_url }}", "assets/js/main.js")
    rendered = rendered.replace("{{ 'now' | date: '%Y' }}", str(time.strftime("%Y")))
    rendered = rendered.replace("{{ content }}", html_body)

    # Clean leftover liquid tags
    rendered = re.sub(r"\{\{.*?\}\}", "", rendered)
    rendered = re.sub(r"\{%.*?%\}", "", rendered)

    # Write output index.html
    out_html = os.path.join(SITE_DIR, "index.html")
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(rendered)

    # 4. Copy assets
    src_assets = os.path.join(ROOT_DIR, "assets")
    dst_assets = os.path.join(SITE_DIR, "assets")
    if os.path.exists(src_assets):
        if os.path.exists(dst_assets):
            shutil.rmtree(dst_assets)
        shutil.copytree(src_assets, dst_assets)

    # 5. Compile SCSS to CSS
    scss_file = os.path.join(dst_assets, "css", "style.scss")
    css_file = os.path.join(dst_assets, "css", "style.css")
    if os.path.exists(scss_file):
        with open(scss_file, "r", encoding="utf-8") as f:
            raw_scss = f.read()
        clean_css = re.sub(r"^---.*?---\s*", "", raw_scss, flags=re.DOTALL)
        with open(css_file, "w", encoding="utf-8") as f:
            f.write(clean_css)


def watch_and_rebuild():
    watched_files = [
        os.path.join(ROOT_DIR, "index.md"),
        os.path.join(ROOT_DIR, "_config.yml"),
        os.path.join(ROOT_DIR, "_layouts", "default.html"),
        os.path.join(ROOT_DIR, "assets", "css", "style.scss"),
        os.path.join(ROOT_DIR, "assets", "js", "main.js")
    ]
    mtimes = {}
    for path in watched_files:
        if os.path.exists(path):
            mtimes[path] = os.path.getmtime(path)

    while True:
        time.sleep(1.0)
        changed = False
        for path in watched_files:
            if os.path.exists(path):
                curr_mtime = os.path.getmtime(path)
                if path not in mtimes or curr_mtime != mtimes[path]:
                    mtimes[path] = curr_mtime
                    changed = True
        if changed:
            print("[Auto-Rebuilder] File change detected. Rebuilding _site/...")
            try:
                build_site()
                print("[Auto-Rebuilder] Rebuilt successfully!")
            except Exception as e:
                print(f"[Auto-Rebuilder] Error during build: {e}")


class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Silence routine static asset requests for clean console
        pass


def main():
    print("=" * 60)
    print("  Kaveh Eskandari - Academic Portfolio Local Server")
    print("=" * 60)
    print("Building site into _site/...")
    build_site()
    print("Site built successfully.")

    # Start watcher thread
    watcher_thread = threading.Thread(target=watch_and_rebuild, daemon=True)
    watcher_thread.start()

    server_address = ("", PORT)
    httpd = HTTPServer(server_address, CustomHandler)
    url = f"http://localhost:{PORT}"
    print(f"\nServing at: {url}")
    print("Auto-rebuilding on changes to index.md, default.html, style.scss, main.js")
    print("Press Ctrl+C to stop the server.\n")

    # Open browser automatically
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()
        print("Server stopped.")


if __name__ == "__main__":
    main()
