#!/usr/bin/env python3
"""Stamp index.html's asset URLs with a hash of the assets themselves.

Two things publish this site: the workflow in .github/workflows, and GitHub's
own pages-build-deployment, which serves the branch exactly as committed. They
race, and the built-in one usually wins. So the version cannot be applied at
deploy time — whatever the workflow does to its copy is thrown away. It has to
be committed, which is what this does.

Hashing the file contents rather than the commit means the URL changes only
when the asset actually changes, so browsers keep their caches across commits
that do not touch the front end.

    python3 tools/stamp.py           rewrite index.html
    python3 tools/stamp.py --check   exit 1 if it is out of date
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ("script.js", "style.css")


def stamped(html):
    for name in ASSETS:
        digest = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:8]
        html = re.sub(re.escape(name) + r"\?v=[A-Za-z0-9]*",
                      name + "?v=" + digest, html)
    return html


def main():
    index = ROOT / "index.html"
    current = index.read_text(encoding="utf-8")
    wanted = stamped(current)
    lines = [l for l in wanted.splitlines() if "?v=" in l]

    if "--check" in sys.argv:
        if current != wanted:
            print("index.html asset stamps are stale — run: python3 tools/stamp.py")
            sys.exit(1)
        print("asset stamps current:")
        print("\n".join("  " + l.strip() for l in lines))
        return

    index.write_text(wanted, encoding="utf-8")
    print("stamped:")
    print("\n".join("  " + l.strip() for l in lines))


if __name__ == "__main__":
    main()
