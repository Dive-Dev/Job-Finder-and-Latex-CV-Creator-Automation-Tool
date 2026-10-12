import re
import time
import random
import urllib.parse
from bs4 import BeautifulSoup
import requests
from scraper.company_scraper import find_company_career_site, COMPANY_LOOKUP_REGISTRY

# Pool of realistic modern human desktop user-agents
HUMAN_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
]

COMMON_CLIENT_PATTERNS = [
    re.compile(r"customer|client|trusted by|our partners|case stud|used by|who uses|companies that trust", re.I),
    re.compile(r"portfolio|testimonials|success stor|enterprise client", re.I),
]

COMMON_PRODUCT_PATTERNS = [
    re.compile(r"product|platform|solution|feature|offering|service|technology|capability", re.I),
]

COMMON_ABOUT_PATTERNS = [
    re.compile(r"about|about us|who we are|our story|company|mission|overview", re.I),
]

COMMON_TECH_PATTERNS = [
    re.compile(r"engineering|tech blog|architecture|developers|api|documentation|open source", re.I),
]

class HumanWebCrawler:
    """
    Crawls company websites with human-like browsing behavior:
    - Randomized human delays (1.0s - 2.5s)
    - Realistic browser headers with User-Agent rotation
    - Natural navigation link exploration (Home -> About -> Products -> Clients)
    - Image alt-tag parsing for customer/client logo detection
    - Search engine fallback augmentation for protected or JS-heavy sites
    """

    def __init__(self, human_pacing=True):
        self.human_pacing = human_pacing
        self.session = requests.Session()
        self.user_agent = random.choice(HUMAN_USER_AGENTS)
        self.session.headers.update({
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
        })
        self.visited_urls = set()
        self.crawl_logs = []

    def log(self, message):
        timestamp = time.strftime("%H:%M:%S")
        entry = f"[{timestamp}] {message}"
        self.crawl_logs.append(entry)
        print(entry)

    def _human_pause(self, min_sec=0.8, max_sec=2.2):
        if self.human_pacing:
            pause = random.uniform(min_sec, max_sec)
            time.sleep(pause)

    def fetch_page(self, url, referer=None):
        if not url or url in self.visited_urls:
            return None
        self.visited_urls.add(url)

        headers = {}
        if referer:
            headers["Referer"] = referer
            headers["Sec-Fetch-Site"] = "same-origin"

        try:
            self._human_pause()
            resp = self.session.get(url, headers=headers, timeout=12, allow_redirects=True)
            if resp.status_code == 200:
                return resp.text
            else:
                self.log(f"HTTP {resp.status_code} when navigating to {url}")
                return None
        except Exception as e:
            self.log(f"Navigation error for {url}: {str(e)}")
            return None

    def clean_text(self, text):
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def extract_page_signals(self, html, page_url):
        soup = BeautifulSoup(html, "html.parser")

        # Strip scripts, styles, iframes, svgs
        for tag in soup(["script", "style", "noscript", "iframe", "svg"]):
            tag.decompose()

        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": re.compile(r"description", re.I)}) or \
                   soup.find("meta", attrs={"property": re.compile(r"og:description", re.I)})
        if meta_tag and meta_tag.get("content"):
            meta_desc = meta_tag["content"].strip()

        # Headings
        h1s = [self.clean_text(h.get_text()) for h in soup.find_all("h1") if self.clean_text(h.get_text())][:4]
        h2s = [self.clean_text(h.get_text()) for h in soup.find_all("h2") if self.clean_text(h.get_text())][:8]

        # Paragraphs & Key Sections
        paragraphs = []
        for p in soup.find_all(["p", "li"]):
            txt = self.clean_text(p.get_text())
            if len(txt) > 35 and not any(skip in txt.lower() for skip in ["cookie", "privacy policy", "terms of use", "all rights reserved"]):
                paragraphs.append(txt)
            if len(paragraphs) >= 20:
                break

        # Client / Customer Logo ALT text inspection (A human eye trick!)
        client_logo_candidates = []
        for img in soup.find_all("img"):
            alt = img.get("alt", "").strip()
            src = img.get("src", "").lower()
            if alt and len(alt) < 40 and any(kw in src or kw in img.get("class", []) for kw in ["logo", "client", "customer", "partner"]):
                if not any(skip in alt.lower() for skip in ["logo", "icon", "arrow", "menu", "close"]):
                    client_logo_candidates.append(alt)

        # Internal Navigation Links
        discovered_links = []
        base_domain = urllib.parse.urlparse(page_url).netloc
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            anchor_text = self.clean_text(a.get_text())
            full_url = urllib.parse.urljoin(page_url, href)
            parsed_href = urllib.parse.urlparse(full_url)
            
            # Stay within same company domain
            if parsed_href.netloc.endswith(base_domain) and parsed_href.scheme in ["http", "https"]:
                clean_full = f"{parsed_href.scheme}://{parsed_href.netloc}{parsed_href.path}".rstrip('/')
                if clean_full != page_url.rstrip('/') and clean_full not in self.visited_urls:
                    discovered_links.append({
                        "url": clean_full,
                        "text": anchor_text,
                        "path": parsed_href.path.lower()
                    })

        return {
            "url": page_url,
            "title": title,
            "meta_description": meta_desc,
            "headings": {"h1": h1s, "h2": h2s},
            "content_snippets": paragraphs[:15],
            "client_logos": list(set(client_logo_candidates))[:10],
            "discovered_links": discovered_links
        }

    def categorize_links(self, links):
        """
        Classifies discovered links into Human Exploration categories:
        - about: Mission, company story
        - products: Solutions, platform, features
        - clients: Customers, case studies, trusted by
        - tech: Tech blog, engineering
        """
        categories = {
            "about": [],
            "products": [],
            "clients": [],
            "tech": []
        }

        for link in links:
            url_lower = link["url"].lower()
            text_lower = link["text"].lower()
            combined = f"{url_lower} {text_lower}"

            # Skip common noise links
            if any(noise in url_lower for noise in ["login", "signup", "register", "cart", "terms", "privacy", "contact", "careers", "jobs"]):
                continue

            if any(p.search(combined) for p in COMMON_CLIENT_PATTERNS):
                categories["clients"].append(link)
            elif any(p.search(combined) for p in COMMON_PRODUCT_PATTERNS):
                categories["products"].append(link)
            elif any(p.search(combined) for p in COMMON_ABOUT_PATTERNS):
                categories["about"].append(link)
            elif any(p.search(combined) for p in COMMON_TECH_PATTERNS):
                categories["tech"].append(link)

        return categories

    def crawl_company_website(self, company_name, official_url=None):
        """
        Performs full human-like website investigation for a target company:
        1. Identifies official domain.
        2. Lands on Home Page (`/`), extracts hero messaging & meta tags.
        3. Identifies navigation menu like a human.
        4. Visits top About Us page.
        5. Visits top Products / Platform page.
        6. Visits top Customers / Case Studies page.
        7. Returns compiled website intelligence payload.
        """
        self.crawl_logs = []
        self.visited_urls = set()

        # Step 1: Resolve Company Website
        if not official_url:
            norm_name = company_name.lower().strip()
            if norm_name in COMPANY_LOOKUP_REGISTRY:
                official_url = COMPANY_LOOKUP_REGISTRY[norm_name].get("official_site")

        if not official_url:
            self.log(f"Discovering official website for '{company_name}'...")
            site_info = find_company_career_site(company_name)
            official_url = site_info.get("official_site")

        if not official_url:
            # Fallback to standard URL construction
            slug = re.sub(r'[^a-zA-Z0-9]', '', company_name.lower())
            official_url = f"https://www.{slug}.com"
            self.log(f"Assuming domain: {official_url}")

        self.log(f"👤 Human Agent initialized with user-agent: {self.user_agent.split(')')[0]})...")
        self.log(f"🌐 Step 1/4: Landing on official homepage: {official_url}")

        home_html = self.fetch_page(official_url)
        if not home_html:
            self.log(f"Could not reach {official_url} directly. Attempting search-assisted fallback...")
            return self._search_assisted_fallback(company_name, official_url)

        home_data = self.extract_page_signals(home_html, official_url)
        self.log(f"✓ Homepage scanned: '{home_data.get('title')}'")

        # Classify navigation links
        categories = self.categorize_links(home_data.get("discovered_links", []))
        self.log(f"👀 Navigation links discovered: {len(categories['about'])} About, {len(categories['products'])} Product, {len(categories['clients'])} Client, {len(categories['tech'])} Tech")

        crawled_subpages = []

        # Step 2: Human navigates to About / Mission page
        if categories["about"]:
            target = categories["about"][0]
            self.log(f"📖 Step 2/4: Reading company story & mission at {target['url']} ('{target['text']}')")
            about_html = self.fetch_page(target["url"], referer=official_url)
            if about_html:
                about_data = self.extract_page_signals(about_html, target["url"])
                crawled_subpages.append({"type": "about", "data": about_data})
                self.log(f"✓ About page read ({len(about_data['content_snippets'])} insights extracted)")

        # Step 3: Human navigates to Products / Platform page
        if categories["products"]:
            target = categories["products"][0]
            self.log(f"📦 Step 3/4: Inspecting core products & offerings at {target['url']} ('{target['text']}')")
            prod_html = self.fetch_page(target["url"], referer=official_url)
            if prod_html:
                prod_data = self.extract_page_signals(prod_html, target["url"])
                crawled_subpages.append({"type": "products", "data": prod_data})
                self.log(f"✓ Products analyzed ({len(prod_data['headings']['h2'])} modules/features identified)")

        # Step 4: Human navigates to Clients / Customers page
        if categories["clients"]:
            target = categories["clients"][0]
            self.log(f"🤝 Step 4/4: Examining customers, case studies & clients at {target['url']} ('{target['text']}')")
            client_html = self.fetch_page(target["url"], referer=official_url)
            if client_html:
                client_data = self.extract_page_signals(client_html, target["url"])
                crawled_subpages.append({"type": "clients", "data": client_data})
                self.log(f"✓ Client page verified ({len(client_data['client_logos'])} logos & case study references detected)")
        elif home_data.get("client_logos"):
            self.log(f"Found {len(home_data['client_logos'])} partner/client logos directly on homepage.")

        # Step 5: (Bonus) Tech / Architecture page if present
        if categories["tech"]:
            target = categories["tech"][0]
            self.log(f"💻 Bonus: Inspecting engineering blog at {target['url']}")
            tech_html = self.fetch_page(target["url"], referer=official_url)
            if tech_html:
                tech_data = self.extract_page_signals(tech_html, target["url"])
                crawled_subpages.append({"type": "tech", "data": tech_data})

        return {
            "company_name": company_name,
            "official_url": official_url,
            "home": home_data,
            "subpages": crawled_subpages,
            "crawl_logs": self.crawl_logs,
            "visited_count": len(self.visited_urls),
            "source": "human_crawler"
        }

    def _search_assisted_fallback(self, company_name, official_url):
        """
        Fallback search dorking when direct website requests encounter WAFs or heavy client-side JavaScript.
        Queries DuckDuckGo HTML for about, products, and customer signals.
        """
        self.log(f"🔍 Launching human-mimicking search dorking for '{company_name}'...")
        headers = {"User-Agent": self.user_agent, "Accept-Language": "en-US,en;q=0.9"}
        snippets = []

        queries = [
            f"{company_name} official company products solutions overview",
            f"{company_name} customers clients case studies enterprise",
            f"{company_name} engineering tech stack architecture"
        ]

        for q in queries:
            try:
                self._human_pause(0.5, 1.5)
                search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(q)}"
                resp = requests.get(search_url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    for res in soup.find_all("div", class_="result__body")[:4]:
                        snippet = res.find("a", class_="result__snippet")
                        title = res.find("a", class_="result__url")
                        if snippet and snippet.get_text():
                            snippets.append(self.clean_text(snippet.get_text()))
            except Exception as e:
                self.log(f"Search fallback notice: {e}")

        return {
            "company_name": company_name,
            "official_url": official_url or f"https://www.{re.sub(r'[^a-zA-Z0-9]', '', company_name.lower())}.com",
            "home": {
                "url": official_url,
                "title": f"{company_name} Company Intelligence",
                "meta_description": snippets[0] if snippets else f"{company_name} technology company profile",
                "headings": {"h1": [company_name], "h2": ["Products & Architecture", "Client Ecosystem"]},
                "content_snippets": snippets,
                "client_logos": [],
                "discovered_links": []
            },
            "subpages": [],
            "crawl_logs": self.crawl_logs,
            "visited_count": len(snippets),
            "source": "search_assisted_fallback"
        }
