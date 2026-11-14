import requests, re, time, json

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) research-hobby-project contact: hobby research, low volume"}
s = requests.Session()
s.headers.update(UA)

url = "https://archiveofourown.org/users/Naminesfriend/works"
r = s.get(url, timeout=30)
print("works page status:", r.status_code, "bytes:", len(r.text))
open("/home/hatch/workspace/black-mirror/corpus/works_list.html", "w").write(r.text)

# AO3 work blurbs: <li ... class="... work blurb group ..."> ... <h4 class="heading"><a href="/works/NNNN">Title</a>
works = []
for m in re.finditer(r'<li[^>]*class="[^"]*work blurb group[^"]*"[^>]*>(.*?)</li>', r.text, re.S):
    block = m.group(1)
    tm = re.search(r'<h4 class="heading">\s*<a href="(/works/\d+)">(.*?)</a>', block, re.S)
    if not tm:
        continue
    work_url, title = tm.group(1), re.sub(r'<[^>]+>', '', tm.group(2)).strip()
    # word count: <dd class="words">12,345</dd>
    wm = re.search(r'<dd class="words">([\d,]+)</dd>', block)
    words = int(wm.group(1).replace(",", "")) if wm else 0
    # chapters: <dd class="chapters">3/5</dd>
    cm = re.search(r'<dd class="chapters">([^<]+)</dd>', block)
    chapters = cm.group(1).strip() if cm else "?"
    # date: <p class="datetime">01 Jan 2024</p> (last updated)
    dm = re.search(r'<p class="datetime">([^<]+)</p>', block)
    date = dm.group(1).strip() if dm else "?"
    # rating/tags quick grab
    works.append({"url": work_url, "title": title, "words": words, "chapters": chapters, "date": date})

works.sort(key=lambda w: w["words"], reverse=True)
print("found works:", len(works))
for w in works:
    print(f'{w["words"]:>8} words | ch {w["chapters"]:>6} | {w["date"]:<12} | {w["title"][:70]} | {w["url"]}')
json.dump(works, open("/home/hatch/workspace/black-mirror/corpus/works.json", "w"), indent=1)
