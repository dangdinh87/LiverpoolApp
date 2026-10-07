#!/usr/bin/env python3
"""Concurrency-safe i18n editor for LiverpoolApp (src/messages/{vi,en}.json).

Usage: python3 i18n-set.py patch.json
patch.json = {"vi": {"Namespace.sub.key": "text", ...}, "en": {...}}
Keys are dotted paths; missing levels are created; existing key order is kept,
new keys are appended. Both locales MUST get the same key set (parity test).
Holds an exclusive file lock so parallel agents never clobber each other.
"""
import fcntl, json, sys

ROOT = "/Users/nguyendangdinh/LiverpoolApp/src/messages"
patch = json.load(open(sys.argv[1]))
if set(patch.get("vi", {})) != set(patch.get("en", {})):
    sys.exit("vi and en must patch the same keys")
with open("/tmp/lfc-i18n.lock", "w") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    for loc, kv in patch.items():
        p = f"{ROOT}/{loc}.json"
        data = json.load(open(p))
        for dotted, val in kv.items():
            node = data
            *parents, leaf = dotted.split(".")
            for k in parents:
                node = node.setdefault(k, {})
            node[leaf] = val
        open(p, "w").write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print("ok", {l: len(kv) for l, kv in patch.items()})
