import sqlite3

conn = sqlite3.connect('data/nexafreight.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]

stats = {}
for t in tables:
    if not t.startswith('sqlite') and not t.startswith('alembic'):
        try:
            count = c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            stats[t] = count
        except Exception as e:
            stats[t] = str(e)

for k, v in sorted(stats.items()):
    print(f"  {k}: {v}")
