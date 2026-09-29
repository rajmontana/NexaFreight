import asyncio
import json
import subprocess
import tempfile
import urllib.request
import websockets

async def inspect():
    temp_profile = tempfile.mkdtemp(prefix="chrome_insp_")
    proc = subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "--headless=new",
        "--remote-debugging-port=9226",
        f"--user-data-dir={temp_profile}",
        "--window-size=1440,900",
        "--disable-gpu",
        "about:blank"
    ])
    await asyncio.sleep(1.0)
    req = urllib.request.Request("http://localhost:9226/json/new?about:blank", method="PUT")
    with urllib.request.urlopen(req) as resp:
        page = json.loads(resp.read().decode())
    
    ws = await websockets.connect(page["webSocketDebuggerUrl"])
    await ws.send(json.dumps({"id": 1, "method": "Page.enable"}))
    await ws.send(json.dumps({"id": 2, "method": "Runtime.enable"}))
    await ws.send(json.dumps({"id": 3, "method": "Console.enable"}))
    await ws.send(json.dumps({"id": 4, "method": "Page.navigate", "params": {"url": "http://localhost:3000/login"}}))
    await asyncio.sleep(1.5)
    
    # Click authenticate
    await ws.send(json.dumps({"id": 5, "method": "Runtime.evaluate", "params": {"expression": "document.getElementById('nf-submit').click()"} }))
    
    for _ in range(30):
        try:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=0.5))
            if "console" in msg.get("method", "").lower():
                print("LOG:", msg)
        except asyncio.TimeoutError:
            pass

    # Check url & body
    await ws.send(json.dumps({"id": 6, "method": "Runtime.evaluate", "params": {"expression": "window.location.href", "returnByValue": True}}))
    url_res = json.loads(await ws.recv())
    while url_res.get("id") != 6:
        url_res = json.loads(await ws.recv())
    print("CURRENT URL:", url_res.get("result", {}).get("value"))

    await ws.send(json.dumps({"id": 7, "method": "Runtime.evaluate", "params": {"expression": "document.body.innerText.slice(0, 300)", "returnByValue": True}}))
    text_res = json.loads(await ws.recv())
    while text_res.get("id") != 7:
        text_res = json.loads(await ws.recv())
    print("BODY TEXT:", repr(text_res.get("result", {}).get("value")))

    await ws.close()
    proc.terminate()

if __name__ == "__main__":
    asyncio.run(inspect())
