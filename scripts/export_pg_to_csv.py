#!/usr/bin/env python3
r"""
Export every user table in a Postgres DB to one CSV per table (public + other
non-system schemas).

Requires `psql` on PATH (same major as the server is fine for \copy).

1) Restore your dump into a local empty database (Postgres 18+ if the dump is from 18):

   createdb cooked_restore
   pg_restore --no-owner --no-acl -d cooked_restore /path/to/backup.dump

2) Run this script:

   python3 scripts/export_pg_to_csv.py "postgresql://user:pass@localhost:5432/cooked_restore" ./csv_export

Do not commit CSV output or URLs with passwords.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


def _safe_ident(part: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_$]*", part):
        return '"' + part.replace('"', '""') + '"'
    return part


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("database_url", help="Postgres URL of a DB that already has the data loaded")
    p.add_argument("out_dir", type=Path, help="Directory to write *.csv files into")
    args = p.parse_args()
    out_dir: Path = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    url = args.database_url

    list_sql = """
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
"""
    proc = subprocess.run(
        ["psql", url, "-Atc", list_sql],
        check=True,
        capture_output=True,
        text=True,
    )
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    if not lines:
        print("No user tables found.", file=sys.stderr)
        return 1

    for line in lines:
        schema, table = line.split("\t", 1)
        ident = f'{_safe_ident(schema)}.{_safe_ident(table)}'
        fn = f"{schema}__{table}.csv"
        dest = out_dir / fn
        sql = f"\\copy {ident} TO '{dest.as_posix()}' CSV HEADER"
        print(f"export {ident} -> {fn}")
        subprocess.run(["psql", url, "-v", "ON_ERROR_STOP=1", "-c", sql], check=True)

    print(f"Done. Wrote {len(lines)} files under {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
