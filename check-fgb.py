"""Monitor official publications. Never infer or overwrite wage amounts from OCR."""
import hashlib
import json
import subprocess
import tempfile
import re
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

class ScaleImages(HTMLParser):
    def __init__(self):
        super().__init__(); self.images = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('href', 'src', 'data-src'):
            url = urljoin(SOURCE, attrs.get(key, ''))
            parsed = urlparse(url)
            if parsed.hostname == 'fgb.org.ar' and '/wp-content/uploads/' in parsed.path and 'escala' in parsed.path.lower() and parsed.path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')) and not re.search(r'-\d+x\d+\.', parsed.path) and url not in self.images:
                self.images.append(url)

def read(url):
    with urlopen(Request(url, headers={'User-Agent': 'DeMas-public-wage-monitor/1.0'}), timeout=30) as response:
        if urlparse(response.url).hostname != 'fgb.org.ar': raise ValueError('Unexpected source host')
        data = response.read(5_000_001)
        if len(data) > 5_000_000: raise ValueError('Source exceeds size limit')
        return data

def main():
    docs = Path(__file__).with_name('docs')
    parser = ScaleLinks(); parser.feed(read(SOURCE).decode('utf-8'))
    if not parser.links or not any(x['url'] == VERIFIED for x in parser.links): raise ValueError('Unable to recognize official publication list')
    latest = parser.links[0]
    status = {'checkedAt': datetime.now(timezone.utc).date().isoformat(), 'latest': latest, 'needsVerification': False, 'verifiedScale': VERIFIED}
    try:
        page = ScaleImages(); page.feed(read(latest['url']).decode('utf-8'))
        if len(page.images) != 1: raise ValueError('No se encontró un único cuadro salarial legible')
        image_url = page.images[0]; image_bytes = read(image_url); image_hash = hashlib.sha256(image_bytes).hexdigest()
        existing = json.loads(docs.joinpath('wages.json').read_text(encoding='utf-8'))
        if existing.get('imageHash') != image_hash or '--force' in __import__('sys').argv:
            with tempfile.TemporaryDirectory() as temp:
                image_path = Path(temp) / 'scale.png'; image_path.write_bytes(image_bytes)
                result = subprocess.run(['node', str(Path(__file__).with_name('read-fgb-image.mjs')), str(image_path)], capture_output=True, text=True, check=True, timeout=180)
                incoming = json.loads(result.stdout)
            if not incoming or len(incoming)>12: raise ValueError('Cantidad de meses inválida')
            merged = {item['month']: item for item in existing['scales']}
            for item in incoming:
                item.update(source=latest['url'], image=image_url, method='ocr-validated')
                merged[item['month']] = item
            payload = {'checkedAt': status['checkedAt'], 'imageHash': image_hash, 'scales': sorted(merged.values(), key=lambda item: item['month'])}
            docs.joinpath('wages.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        status['verifiedScale'] = latest['url']
    except Exception as error:
        status['needsVerification'] = True
        status['message'] = 'No se pudo leer el nuevo cuadro. Adjuntá una foto de la tabla de paritarias para revisarla.'
        print(str(error), file=__import__('sys').stderr)
    docs.joinpath('fgb-status.json').write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(status, ensure_ascii=False))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        status_path = Path(__file__).with_name('docs').joinpath('fgb-status.json')
        status = json.loads(status_path.read_text(encoding='utf-8')) if status_path.exists() else {'latest': {'url': SOURCE, 'title': 'FGB'}}
        status.update(checkedAt=datetime.now(timezone.utc).date().isoformat(), needsVerification=True, message='Falló la lectura de FGB. Adjuntá o pegá una foto del cuadro salarial.')
        status_path.write_text(json.dumps(status, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        print(str(error), file=__import__('sys').stderr)
