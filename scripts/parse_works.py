import re, json
html = open("/tmp/ao3_test.html").read()
chunks = re.split(r'<li id="work_\d+"', html)[1:]
works = []
for ch in chunks:
    tm = re.search(r'<h4 class="heading">\s*<a href="(/works/\d+)">(.*?)</a>', ch, re.S)
    if not tm:
        continue
    work_url = tm.group(1)
    title = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', tm.group(2))).strip()
    wm = re.search(r'<dd class="words">\s*([\d,]+)\s*</dd>', ch)
    words = int(wm.group(1).replace(",", "")) if wm else 0
    cm = re.search(r'<dd class="chapters">\s*([^<]+?)\s*</dd>', ch)
    chapters = cm.group(1).strip() if cm else "?"
    dm = re.findall(r'<p class="datetime">([^<]+)</p>', ch)
    date = dm[-1].strip() if dm else "?"
    fm = re.search(r'<h5 class="fandoms heading">(.*?)</h5>', ch, re.S)
    fandom = ""
    if fm:
        tags = re.findall(r'<a class="tag"[^>]*>(.*?)</a>', fm.group(1))
        fandom = "; ".join(tags[:2])
    # rating
    rm = re.search(r'<span class="rating-(\w+) rating"', ch)
    rating = rm.group(1) if rm else "?"
    works.append({"url": work_url, "title": title, "words": words, "chapters": chapters, "date": date, "fandom": fandom[:70], "rating": rating})
works.sort(key=lambda w: w["words"], reverse=True)
print("found works:", len(works), "| total words:", f"{sum(w['words'] for w in works):,}")
for w in works:
    print(f'{w["words"]:>8} | ch {w["chapters"]:>6} | {w["date"]:<11} | {w["rating"]:<8} | {w["title"][:52]:<52} | {w["url"]}')
json.dump(works, open("/home/hatch/workspace/black-mirror/corpus/works.json", "w"), indent=1)
