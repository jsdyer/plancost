"""Exercise the built starter at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "example-tool")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.environ.get("CHROME_BIN"))
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/example-tool/")
                page.locator("#monthly0").fill("100")
                assert "Switch internet plans saves" in page.locator("#headline").inner_text()
                page.locator("#add").click()
                assert page.locator("#ranked li").count() == 3
                page.get_by_role("button",name="Remove this offer").click()
                page.locator("#save").click()
                assert page.locator("#load").is_visible()
                page.get_by_role("link",name="Mobile Device Financing vs BYOD Calculator").click()
                assert "BYOD" in page.locator("h1").inner_text()
                assert page.locator("#name0").input_value() == "Bring your own phone"
                page.locator("#load").click()
                assert page.locator("#monthly0").input_value() == "100"
                page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
                page.set_viewport_size({"width": 390, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"), full_page=True)
                assert not errors, errors
                browser.close()
            print("Browser checks passed for root, preset and mobile layout")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
