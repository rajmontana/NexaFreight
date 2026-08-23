import asyncio
import websockets
import json

async def connect_ais_stream():
    uri = "wss://stream.aisstream.io/v0/stream"
    print("Connecting to AISstream WebSocket...")
    
    try:
        async with websockets.connect(uri) as websocket:
            subscribe_message = {
                "APIKey": os.getenv("AISSTREAM_API_KEY", ""),
                "BoundingBoxes": [[[-90, -180], [90, 180]]],
                "FilterMessageTypes": ["PositionReport"]
            }
            
            await websocket.send(json.dumps(subscribe_message))
            print("Subscribed successfully! Receiving live global satellite transponder packets...")
            
            count = 0
            async for message_json in websocket:
                data = json.loads(message_json)
                meta = data.get("MetaData", {})
                pos = data.get("Message", {}).get("PositionReport", {})
                ship_name = meta.get("ShipName", "UNKNOWN").strip()
                mmsi = meta.get("MMSI")
                lat = pos.get("Latitude")
                lon = pos.get("Longitude")
                speed = pos.get("Sog", 0)
                cog = pos.get("Cog", 0)
                
                if lat is not None and lon is not None and ship_name:
                    count += 1
                    print(f"[{count}] 🚢 LIVE SHIP: '{ship_name}' | MMSI: {mmsi} | Lat: {lat:.4f}, Lon: {lon:.4f} | Speed: {speed} kts | Course: {cog}°")
                
                if count >= 10:
                    print("[OK] Successfully captured 10 live vessels from ocean transponders!")
                    break
    except Exception as e:
        print(f"Stream error: {e}")

if __name__ == "__main__":
    asyncio.run(connect_ais_stream())
