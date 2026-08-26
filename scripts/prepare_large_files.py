"""One-time helper: shrink the 541MB IMF chokepoint CSV so it fits a git push.

The GitHub hard limit is 100MB per file. This script keeps only the columns the
project needs (dates, port identity, port calls by vessel type, trade estimates,
period), writes a slim CSV, zips it, and — only if the zip is still >95MB —
splits it into .part files that the agent reassembles.

Usage (from the repo root, with the raw file already in data/raw/):
    python scripts/prepare_large_files.py

Output: data/processed/port_activity_slim.zip (+ .part-N files if needed)
Then push it together with the raw DataCo CSV (see data/raw/README.md).
"""

from __future__ import annotations

import csv
import sys
import zipfile
from pathlib import Path

RAW = Path("data/raw/Daily_Port_Activity_Data_and_Trade_Estimates.csv")
OUT_DIR = Path("data/processed")
OUT_CSV = OUT_DIR / "port_activity_slim.csv"
OUT_ZIP = OUT_DIR / "port_activity_slim.zip"
SPLIT_LIMIT = 95 * 1024 * 1024  # stay safely below GitHub's 100MB/file
CHUNK = 90 * 1024 * 1024

# Keep columns matching any of these prefixes/keywords (case-insensitive).
KEEP_KEYWORDS = ("date", "portid", "portname", "country", "iso", "portcalls",
                 "trade", "period")


def keep(col: str) -> bool:
    c = col.strip().lower().replace(" ", "_").replace("-", "_")
    return any(k in c for k in KEEP_KEYWORDS)


def main() -> int:
    if not RAW.exists():
        print(f"ERROR: {RAW} not found. Put the raw CSV there first.")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    kept_cols: list[str] = []
    rows = 0
    with open(RAW, newline="", encoding="utf-8", errors="replace") as fin, \
            open(OUT_CSV, "w", newline="", encoding="utf-8") as fout:
        reader = csv.reader(fin)
        writer = csv.writer(fout)
        header = next(reader)
        idx = [i for i, col in enumerate(header) if keep(col)]
        kept_cols = [header[i] for i in idx]
        dropped = [c for c in header if c not in kept_cols]
        writer.writerow(kept_cols)
        for row in reader:
            writer.writerow([row[i] for i in idx])
            rows += 1

    print(f"Rows written : {rows:,}")
    print(f"Columns kept : {len(kept_cols)}/{len(header)}  -> {kept_cols}")
    print(f"Columns drop : {dropped}")

    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(OUT_CSV)

    slim_size = OUT_CSV.stat().st_size
    zip_size = OUT_ZIP.stat().st_size
    print(f"Slim CSV     : {slim_size/1e6:.1f} MB")
    print(f"Zipped       : {zip_size/1e6:.1f} MB")

    OUT_CSV.unlink()  # keep only the zip in the repo

    if zip_size <= SPLIT_LIMIT:
        print("OK: single file, ready to push:")
        print(f"    git add -f {OUT_ZIP.as_posix()}")
        return 0

    # Split into parts (agent reassembles with: cat port_activity_slim.zip.part-* > port_activity_slim.zip)
    parts = []
    with open(OUT_ZIP, "rb") as f:
        n = 0
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            p = OUT_DIR / f"port_activity_slim.zip.part-{n:02d}"
            p.write_bytes(chunk)
            parts.append(p)
            n += 1
    OUT_ZIP.unlink()
    print(f"Split into {len(parts)} parts. Push them all:")
    print("    git add -f data/processed/port_activity_slim.zip.part-*")
    return 0


if __name__ == "__main__":
    sys.exit(main())
