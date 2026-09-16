"""Optional browser audit: requires Python Playwright and installed Google Chrome.
Run with the production preview server listening on port 4175.
"""
import json
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parents[1]
REPORT = SITE.parent / "docs/audit/runtime-validation.json"
BASE = "http://127.0.0.1:4175"
result = {"pages": [], "navigation": {}, "pageErrors": [], "localHttpErrors": []}

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page()
    # Isolate layout/history tests from third-party tracking frames.
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE)
               else route.fulfill(status=200, body="", content_type="application/javascript"
                                  if route.request.resource_type == "script" else "text/html"))
    page.on("pageerror", lambda error: result["pageErrors"].append(str(error)))
    page.on("response", lambda response: result["localHttpErrors"].append(
        {"url": response.url, "status": response.status})
        if response.status >= 400 and response.url.startswith(BASE) else None)

    for width, height in [(1440, 900), (390, 844)]:
        page.set_viewport_size({"width": width, "height": height})
        for file in [*SITE.glob("*.html"), *SITE.glob("debt/*.html")]:
            route = "/" + file.relative_to(SITE).as_posix()
            response = page.goto(BASE + route, wait_until="domcontentloaded")
            page.locator("img").evaluate_all("imgs => imgs.forEach(i => i.loading = 'eager')")
            page.wait_for_function("Array.from(document.images).every(i => i.complete)")
            state = page.evaluate("""() => ({
                title: document.title,
                language: document.documentElement.lang,
                overflow: document.documentElement.scrollWidth > innerWidth,
                brokenImages: [...document.images].filter(i => !i.naturalWidth).map(i => i.src),
                adSlots: document.querySelectorAll('[id^="gpt-passback"]').length
            })""")
            result["pages"].append({"route": route, "width": width,
                                    "status": response.status, **state})
    REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(BASE + "/")
    destination = page.locator(".ban-box").first.get_attribute("href")
    page.locator(".ban-box").first.click()
    page.wait_for_url("**" + destination)
    result["navigation"]["articleClick"] = page.url.endswith(destination)
    page.go_back(wait_until="domcontentloaded")
    result["navigation"]["back"] = page.url == BASE + "/"
    page.go_forward(wait_until="domcontentloaded")
    result["navigation"]["forward"] = page.url.endswith(destination)
    page.reload(wait_until="domcontentloaded")
    result["navigation"]["refresh"] = page.url.endswith(destination)
    page.locator(".menu a").nth(1).click()
    page.wait_for_url("**/#list1")
    result["navigation"]["categoryAnchor"] = page.locator("#list1").count() == 1

    # Observe real network requests separately; never click ads or tracking frames.
    live = browser.new_page()
    requests, failures = [], []
    live.on("request", lambda request: requests.append(request.url))
    live.on("requestfailed", lambda request: failures.append(
        {"url": request.url, "error": request.failure}))
    live.goto(BASE + "/", wait_until="domcontentloaded")
    live.wait_for_timeout(4000)
    result["network"] = {
        "hosts": sorted({urlsplit(url).hostname for url in requests}),
        "forbiddenRequests": [url for url in requests if any(
            name in url.lower() for name in ["fynudge", "finudge", "finvexa"])],
        "failures": failures,
    }
    result["liveAds"] = live.evaluate("""() => ({
        apiReady: Boolean(window.googletag?.apiReady),
        slots: window.googletag?.apiReady ? window.googletag.pubads().getSlots().map(slot => ({
            id: slot.getSlotElementId(), unit: slot.getAdUnitPath(),
            responseReceived: Boolean(slot.getResponseInformation())
        })) : []
    })""")
    browser.close()

REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
bad_pages = [page for page in result["pages"] if page["status"] != 200
             or page["brokenImages"] or page["overflow"]]
assert not bad_pages, bad_pages
assert all(result["navigation"].values()), result["navigation"]
assert not result["pageErrors"], result["pageErrors"]
assert not result["localHttpErrors"], result["localHttpErrors"]
assert not result["network"]["forbiddenRequests"], result["network"]
print(json.dumps({"checkedViews": len(result["pages"]),
                  "navigation": result["navigation"], "network": result["network"]}))
