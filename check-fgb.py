"""Monitor official publications. Never infer or overwrite wage amounts from OCR."""
import hashlib
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

SOURCE = 'https://fgb.org.ar/category/acuerdos/'
VERIFIED = 'https://fgb.org.ar/escala-julio-septiembre-2026/'
IMAGE = 'https://fgb.org.ar/wp-content/uploads/2026/07/ESCALA-JULIO-SEPTIEMBRE-26.png'
VERIFIED_IMAGE_HASH = 'ffd1b16d40e36d1b79fc39380687778a858807fcd3c7025a0c28172aa7505f72'

class ScaleLinks(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.current = None
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            href = dict(attrs).get('href', '')
            url = urljoin(SOURCE, href)
            if urlparse(url).hostname == 'fgb.org.ar' and '/escala-' in url:
                self.current = {'url': url, 'title': ''}
    def handle_data(self, text):
        if self.current is not None: self.current['title'] += text
    def handle_endtag(self, tag):
        if tag == 'a' and self.current is not None:
            self.current['title'] = ' '.join(self.current['title'].split())
            if self.current['title'] and self.current['url'] not in [x['url'] for x in self.links]: self.links.append(self.current)
            self.current = None

def read(url):
    with urlopen(Request(url, headers={'User-Agent': 'DeMas-public-wage-monitor/1.0'}), timeout=30) as response:
        if urlparse(response.url).hostname != 'fgb.org.ar': raise ValueError('Unexpected source host')
        data = response.read(5_000_001)
        if len(data) > 5_000_000: raise ValueError('Source exceeds size limit')
        return data

def main():
    parser = ScaleLinks(); parser.feed(read(SOURCE).decode('utf-8'))
    if not parser.links or not any(x['url'] == VERIFIED for x in parser.links): raise ValueError('Unable to recognize official publication list')
    latest = parser.links[0]
    changed = hashlib.sha256(read(IMAGE)).hexdigest() != VERIFIED_IMAGE_HASH
    status = {'checkedAt': datetime.now(timezone.utc).date().isoformat(), 'latest': latest, 'needsVerification': latest['url'] != VERIFIED or changed, 'verifiedScale': VERIFIED}
    Path(__file__).with_name('docs').joinpath('fgb-status.json').write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(status, ensure_ascii=False))

if __name__ == '__main__': main()
