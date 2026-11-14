import re, html as htmllib, json

def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    s = htmllib.unescape(s)
    return re.sub(r'\s+', ' ', s).strip()

def extract(work_id):
    raw = open(f"/home/hatch/workspace/black-mirror/corpus/work_{work_id}.html").read()
    tm = re.search(r'<h2 class="title heading">(.*?)</h2>', raw, re.S)
    title = clean(tm.group(1)) if tm else work_id
    sm = re.search(r'<div class="summary module".*?<blockquote class="userstuff">(.*?)</blockquote>', raw, re.S)
    summary = clean(sm.group(1))[:800] if sm else ""
    tags = sorted(set(clean(t) for t in re.findall(r'<a class="tag"[^>]*>(.*?)</a>', raw)))[:40]
    start = raw.find('id="chapters"')
    region = raw[start:]
    end = region.find('id="feedback"')
    if end > 0:
        region = region[:end]
    paras = [clean(p) for p in re.findall(r'<p>(.*?)</p>', region, re.S)]
    paras = [p for p in paras if p]
    text = "\n\n".join(paras)
    return {"id": work_id, "title": title, "summary": summary, "tags": tags, "text": text, "words": len(text.split())}

works = json.load(open("/home/hatch/workspace/black-mirror/corpus/works.json"))
byurl = {w["url"].split("/")[-1]: w for w in works}
meta_out = {}
for wid in ["51000076", "64326610", "70176211"]:
    d = extract(wid)
    meta = byurl.get(wid, {})
    print(f'{wid} | {d["title"][:45]:<45} | extracted: {d["words"]:>7,} (listed: {meta.get("words",0):>7,})')
    open(f"/home/hatch/workspace/black-mirror/corpus/work_{wid}.txt", "w").write(
        f'TITLE: {d["title"]}\nSUMMARY: {d["summary"]}\nTAGS: {", ".join(d["tags"][:15])}\n\n{d["text"]}')
    meta_out[wid] = {"id": wid, "title": d["title"], "summary": d["summary"], "tags": d["tags"], "words": d["words"]}
json.dump(meta_out, open("/home/hatch/workspace/black-mirror/corpus/sample_meta.json", "w"), indent=1)
print("saved.")
