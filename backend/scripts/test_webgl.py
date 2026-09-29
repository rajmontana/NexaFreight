import asyncio
import json
import subprocess
import tempfile
import urllib.request
import websockets

async def test_webgl():
    temp_profile = tempfile.mkdtemp(prefix="chrome_gl_")
    proc = subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "--remote-debugging-port=9228",
        f"--user-data-dir={temp_profile}",
        "--headless=new",
        "about:blank"
    ])
    await asyncio.sleep(1.0)
    req = urllib.request.Request("http://localhost:9228/json/new?about:blank", method="PUT")
    with urllib.request.urlopen(req) as resp:
        page = json.loads(resp.read().decode())
    
    ws = await websockets.connect(page["webSocketDebuggerUrl"])
    await ws.send(json.dumps({
        "id": 100,
        "method": "Runtime.evaluate",
        "params": {
            "expression": "(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl'); return gl ? gl.getParameter(gl.RENDERER) : 'NO_WEBGL'; })()",
            "returnByValue": True
        }
    }))
    while True:
        msg = json.loads(await ws.recv())
        if msg.get("id") == 100:
            print("GL Result:", msg.get("result", {}).get("value"))
            break
            
    await ws.close()
    proc.terminate()
    proc.wait()

if __name__ == "__main__":
    asyncio.run(test_webgl())
