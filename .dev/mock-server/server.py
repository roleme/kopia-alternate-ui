#!/usr/bin/env python3
"""Static server for the built kopia-alternate-ui with a mocked Kopia API.

Demo data for the snapshot-compare view. No real repository is touched.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("MOCK_PORT", "8790"))
DIST = os.environ.get("MOCK_DIST") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "dist")

MB = 1_000_000


def summ(size, files, dirs=0):
    return {"size": size, "files": files, "symlinks": 0, "dirs": dirs,
            "maxTime": "2026-10-03T14:00:00Z", "numFailed": 0}


def f(name, obj, size, mode="0644", mtime="2026-10-03T14:00:00Z", uid=None, gid=None):
    e = {"name": name, "type": "f", "mode": mode, "mtime": mtime,
         "obj": obj, "size": size}
    if uid is not None:
        e["uid"] = uid
    if gid is not None:
        e["gid"] = gid
    return e


def d(name, obj, s=None, mode="0700"):
    return {"name": name, "type": "d", "mode": mode, "mtime": "2026-10-03T14:00:00Z",
            "obj": obj, **({"summ": s} if s else {})}


LIB_A = [
    d("thumbs", "THUMBS", summ(402 * MB, 4104, 12)),
    d("clip", "CLIPA", summ(1081 * MB, 1)),
    d("profile", "PROFA", summ(240_100, 1)),
]
LIB_B = [
    d("thumbs", "THUMBS", summ(402 * MB, 4104, 12)),          # identical subtree
    d("clip", "CLIPB", summ(1210 * MB, 2)),
    d("profile", "PROFB", summ(236_500, 1)),
]
CLIP_A = [f("model-v1.bin", "MV1", 1081 * MB)]
CLIP_B = [f("model-v2.bin", "MV2", 1210 * MB), f("config.json", "CFG", 2114)]
PROF_A = [f("avatar.jpg", "AV1", 240_100)]
PROF_B = [f("avatar.jpg", "AV2", 236_500)]
M09_A = [f("IMG_4801.HEIC", "I4801", 3_800_000)]
M09_B = [f("IMG_4821.HEIC", "I4821", 3_400_000), f("IMG_4822.HEIC", "I4822", 2_900_000),
         f("IMG_4823.HEIC", "I4823", 4_100_000)]

MANIFESTS = {
    # R2: older state (pair-1 A side)
    "R2": [
        f("immich-db-backup.sql.gz", "DB1", 847 * MB + 200_000),
        f("settings.json", "SJ1", 148),
        f("storage.yml", "SY", 2120),
        f(".kopia-ignore", "IG", 128),
        d("library", "LIBA", summ(1492 * MB, 4106, 3)),
        d("upload", "UPLA", summ(3_800_000, 1, 3)),
        d("encoded-video", "EVA", summ(1310 * MB, 1, 1)),
    ],
    "LIBA": LIB_A, "CLIPA": CLIP_A, "PROFA": PROF_A,
    "UPLA": [d("2026", "Y26A", summ(3_800_000, 1, 2))],
    "Y26A": [d("09", "M09A", summ(3_800_000, 1, 1))],
    "M09A": M09_A,
    "EVA": [f("2026-09-18.mp4", "EVF1", 1310 * MB)],

    # R1: newest state (pair-1 B side)
    "R1": [
        f("immich-db-backup.sql.gz", "DB2", 851 * MB),
        f("settings.json", "SJ2", 183, mtime="2026-10-03T15:30:00Z"),
        f("storage.yml", "SY", 2120),
        f(".kopia-ignore", "IG", 128, mode="0664"),           # metadata-only change
        d("library", "LIBB", summ(1613 * MB, 4107, 3)),
        d("upload", "UPLB", summ(10_400_000, 3, 3)),
        d("encoded-video", "EVB", summ(1460 * MB, 1, 1)),
    ],
    "LIBB": LIB_B, "CLIPB": CLIP_B, "PROFB": PROF_B,
    "UPLB": [d("2026", "Y26B", summ(10_400_000, 3, 2))],
    "Y26B": [d("09", "M09B", summ(10_400_000, 3, 1))],
    "M09B": M09_B,
    "EVB": [f("2026-09-18.mp4", "EVF2", 1460 * MB)],

    # R3: tripwire demo — library folder gone entirely
    "R3": [
        f("immich-db-backup.sql.gz", "DB2", 851 * MB),
        f("storage.yml", "SY", 2120),
        d("upload", "UPLB", summ(10_400_000, 3, 3)),
        d("encoded-video", "EVB", summ(1460 * MB, 1, 1)),
    ],

    # R4: partial-walk demo — quarantine differs and its B-side object fails
    "R4": [
        f("immich-db-backup.sql.gz", "DB2", 851 * MB),
        f("storage.yml", "SY", 2120),
        d("library", "LIBB", summ(1613 * MB, 4107, 3)),
        d("upload", "UPLB", summ(10_400_000, 3, 3)),
        d("quarantine", "FAILOBJ", summ(48 * MB, 2, 1)),
    ],
    # R2P: like R2 but with a quarantine folder (pairs with R4)
    "R2P": [
        f("immich-db-backup.sql.gz", "DB1", 847 * MB + 200_000),
        f("storage.yml", "SY", 2120),
        f(".kopia-ignore", "IG", 128),
        d("library", "LIBA", summ(1492 * MB, 4106, 3)),
        d("upload", "UPLA", summ(3_800_000, 1, 3)),
        d("encoded-video", "EVA", summ(1310 * MB, 1, 1)),
        d("quarantine", "QA", summ(50 * MB, 3, 1)),
    ],
    "QA": [f("old.bin", "QF1", 50 * MB), f("note.txt", "QN1", 300)],
}

def _n(t):
    return dict(mtime=t)

import struct as _struct
import zlib as _zlib


def make_png(w, h, base):
    rows = []
    for y in range(h):
        row = bytearray(b"\x00")
        for x in range(w):
            row += bytes(((base[0] + x * 2) % 256, (base[1] + y * 3) % 256, base[2]))
        rows.append(bytes(row))
    def chunk(tag, data):
        return _struct.pack(">I", len(data)) + tag + data + _struct.pack(">I", _zlib.crc32(tag + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", _struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", _zlib.compress(b"".join(rows))) + chunk(b"IEND", b""))


PNG_ADDED = make_png(96, 64, (30, 160, 90))
PNG_REMOVED = make_png(96, 64, (200, 50, 60))
PNG_BEFORE = make_png(96, 64, (40, 90, 200))
PNG_AFTER = make_png(96, 64, (230, 140, 30))

NEWT = "2026-10-03T09:00:00Z"
MANIFESTS.update({
    "N_OLD": [
        f("compose.yaml", "CMP1", 2400),
        f(".env.bak", "ENVB", 900),
        f("token.txt", "TK1", 32, mtime="2026-10-02T09:00:00Z"),
        f("old-logo.png", "IMG_R", len(PNG_REMOVED), mtime="2026-10-02T09:00:00Z"),
        f("avatar.png", "IMG_B", len(PNG_BEFORE), mtime="2026-10-02T09:00:00Z"),
        f("keys.pem", "KEY1", 1700, mode="0600", mtime="2026-10-02T09:00:00Z", uid=1000, gid=1000),
        f("paseo.pid", "PID1", 6, mtime="2026-10-02T09:00:00Z"),
        f("snapshot.bin", "DB1", 75, mtime="2026-10-02T09:00:00Z"),
        f("dump.dat", "DB1", 75, mtime="2026-10-02T09:00:00Z"),
        f("big.db", "BIG1", 996_000, mtime="2026-10-02T09:00:00Z"),
        d("uptime-kuma", "KUMA_O", summ(9 * MB, 3, 1)),
        d("kurwa_bot", "BOT_O", summ(2 * MB, 2, 0)),
        d("adguard", "ADG_O", summ(1 * MB, 3, 1)),
        d("syncthing", "SYN_O", summ(5 * MB, 4, 2)),
        d("old-registry", "REG_O", summ(3 * MB, 2, 0)),
    ],
    "N_NEW": [
        f("compose.yaml", "CMP2", 2650, mtime=NEWT),
        f("docker-compose.override.yml", "OVR", 410, mtime=NEWT),
        f("token.txt", "TK2", 32, mtime="2026-10-02T09:00:00Z"),
        f("photo.png", "IMG_A", len(PNG_ADDED), mtime=NEWT),
        f("avatar.png", "IMG_C", len(PNG_AFTER), mtime=NEWT),
        f("keys.pem", "KEY1", 1700, mode="0600", mtime="2026-10-02T09:00:00Z", uid=0, gid=0),
        f("paseo.pid", "PID1", 6, mtime=NEWT),
        f("snapshot.bin", "DB2", 75, mtime="2026-10-02T09:00:00Z"),
        f("dump.dat", "DB2", 75, mtime="2026-10-02T09:00:00Z"),
        f("big.db", "BIG2", 996_500, mtime=NEWT),
        {**d("uptime-kuma", "KUMA_N", summ(9 * MB, 3, 1)), "mtime": NEWT},
        {**d("kurwa_bot", "BOT_N", summ(2 * MB, 2, 0)), "mtime": NEWT},
        {**d("adguard", "ADG_N", summ(1 * MB, 3, 1)), "mtime": NEWT},
        {**d("syncthing", "SYN_N", summ(5 * MB, 5, 2)), "mtime": NEWT},
        d("grafana", "GRA_N", summ(12 * MB, 3, 1)),
    ],
    "KUMA_O": [f("kuma.db", "KDB", 8 * MB), f("kuma.db-wal", "KWAL1", 1 * MB, mtime="2026-10-02T09:00:00Z"), d("upload", "KUP_O")],
    "KUMA_N": [f("kuma.db", "KDB", 8 * MB, mtime=NEWT), f("kuma.db-wal", "KWAL1", 1 * MB, mtime=NEWT), {**d("upload", "KUP_N"), "mtime": NEWT}],
    "KUP_O": [f("icon.png", "KICON", 4000)],
    "KUP_N": [f("icon.png", "KICON", 4000, mtime=NEWT)],
    "BOT_O": [f("state.json", "BST", 2 * MB)],
    "BOT_N": [f("state.json", "BST", 2 * MB, mtime=NEWT)],
    "ADG_O": [f("AdGuardHome.yaml", "ADGY1", 1 * MB - 4000), f("AdGuardHome.yaml.bak", "ADGB", 3900), d("data", "ADGD_O")],
    "ADG_N": [f("AdGuardHome.yaml", "ADGY2", 1 * MB - 3500, mtime=NEWT), f("filters.json", "FLT", 1800, mtime=NEWT), {**d("data", "ADGD_N"), "mtime": NEWT}],
    "ADGD_O": [f("stats.db", "ADGS", 4000)],
    "ADGD_N": [f("stats.db", "ADGS", 4000, mtime=NEWT), f("querylog.json", "QLOG", 52_000, mtime=NEWT)],
    "SYN_O": [f("config.xml", "SXML", 5 * MB, mode="0600", mtime="2026-10-03T14:00:00Z")],
    "SYN_N": [f("config.xml", "SXML", 5 * MB, mode="0644", mtime="2026-10-03T14:00:00Z"), f("index-v2.db", "SIDX", 220_000, mtime=NEWT)],
    "REG_O": [f("registry.db", "REGDB", 2 * MB), f("config.yml", "REGCFG", 1000)],
    "GRA_N": [f("grafana.db", "GRDB", 9 * MB), f("grafana.ini", "GRINI", 3000), d("plugins", "GRP", summ(3 * MB, 1, 0))],
    "GRP": [f("plugin.js", "GRPJ", 3 * MB)],
})
FILE_OBJECTS_EXTRA = {
    "ADGY1": b"dns:\n  port: 53\n  upstream: 1.1.1.1\n",
    "ADGY2": b"dns:\n  port: 53\n  upstream: 9.9.9.9\n",
    "ADGB": b"dns:\n  port: 53\n  upstream: 8.8.8.8\n",
    "FLT": b"{\n  \"filters\": [\"ads\", \"trackers\"]\n}\n",
    "QLOG": b"{\"q\": \"example.com\", \"a\": \"93.184.216.34\"}\n",
    "CMP1": b"services:\n  app:\n    image: app:1.0\n",
    "CMP2": b"services:\n  app:\n    image: app:1.1\n  cache:\n    image: valkey:8\n",
    "OVR": b"services:\n  app:\n    ports:\n      - 8080:80\n",
    "ENVB": b"TOKEN=redacted\nMODE=prod\n",
    "REGCFG": b"storage: filesystem\n",
    "GRINI": b"[server]\nhttp_port = 3000\n",
    "TK1": b"token=aaaaaaaaaaaaaaaaaaaaaaaa\n  \n",
    "TK2": b"token=bbbbbbbbbbbbbbbbbbbbbbbb\n  \n",
}

SNAPSHOTS = [
    {"id": "s10", "rootID": "N_NEW", "startTime": "2026-10-03T09:00:00Z", "endTime": "2026-10-03T09:00:20Z",
     "summary": summ(18 * MB, 11, 4), "retention": ["latest-1", "hourly-1"], "pins": [], "description": "docker-data noise demo (after)"},
    {"id": "s11", "rootID": "N_OLD", "startTime": "2026-10-02T09:00:00Z", "endTime": "2026-10-02T09:00:20Z",
     "summary": summ(18 * MB, 11, 4), "retention": ["latest-2", "daily-1"], "pins": [], "description": "docker-data noise demo (before)"},
    {"id": "s1", "rootID": "R1", "startTime": "2026-10-03T14:00:00Z", "endTime": "2026-10-03T14:00:31Z",
     "summary": summ(3797 * MB, 4112, 8), "retention": ["latest-3", "hourly-2"], "pins": [], "description": ""},
    {"id": "s2", "rootID": "R2", "startTime": "2026-10-03T11:00:00Z", "endTime": "2026-10-03T11:00:28Z",
     "summary": summ(3660 * MB, 4109, 8), "retention": ["latest-4", "hourly-3"], "pins": [], "description": "pre-migration"},
    {"id": "s3", "rootID": "R3", "startTime": "2026-10-03T08:00:00Z", "endTime": "2026-10-03T08:00:22Z",
     "summary": summ(2184 * MB, 8, 5), "retention": ["latest-5", "hourly-4"], "pins": [], "description": "after library cleanup"},
    {"id": "s4", "rootID": "R4", "startTime": "2026-10-02T23:00:00Z", "endTime": "2026-10-02T23:00:33Z",
     "summary": summ(3712 * MB, 4110, 9), "retention": ["latest-6", "hourly-5"], "pins": [], "description": ""},
    {"id": "s5", "rootID": "R2P", "startTime": "2026-10-02T20:00:00Z", "endTime": "2026-10-02T20:00:27Z",
     "summary": summ(3660 * MB, 4109, 8), "retention": ["latest-7", "hourly-6"], "pins": [], "description": ""},
    {"id": "s6", "rootID": "R6", "startTime": "2026-10-02T17:00:00Z", "endTime": "2026-10-02T17:00:26Z",
     "summary": summ(3658 * MB, 4107, 8), "retention": ["latest-8", "hourly-7"], "pins": [], "description": ""},
    {"id": "s7", "rootID": "R7", "startTime": "2026-10-02T14:00:00Z", "endTime": "2026-10-02T14:00:25Z",
     "summary": summ(3655 * MB, 4104, 8), "retention": ["latest-9", "daily-2"], "pins": [], "description": ""},
    {"id": "s8", "rootID": "R8", "startTime": "2026-10-02T11:00:00Z", "endTime": "2026-10-02T11:00:24Z",
     "summary": summ(3652 * MB, 4102, 8), "retention": ["latest-10", "daily-3", "weekly-1"], "pins": [], "description": ""},
]
for alias, src in [("R6", "R2"), ("R7", "R2"), ("R8", "R2")]:
    MANIFESTS[alias] = MANIFESTS[src]

FILE_OBJECTS = {
    "SJ1": b"""{
  "machine-learning": {
    "url": "http://immich-ml-metal:3003",
    "enabled": true
  },
  "logging": {
    "level": "log"
  },
  "trash": {
    "days": 30
  }
}
""",
    "SJ2": b"""{
  "machine-learning": {
    "url": "http://immich-ml-metal:3003",
    "enabled": true,
    "concurrency": 2
  },
  "logging": {
    "level": "debug"
  },
  "trash": {
    "days": 30
  }
}
""",
    "DB1": b"\x00PGBACKUP\x7f" + b"x" * 64,
    "DB2": b"\x00PGBACKUP\x7f" + b"y" * 64,
}

FILE_OBJECTS_EXTRA.update({"IMG_A": PNG_ADDED, "IMG_R": PNG_REMOVED, "IMG_B": PNG_BEFORE, "IMG_C": PNG_AFTER})
FILE_OBJECTS.update(FILE_OBJECTS_EXTRA)

SOURCE = {"host": "mininas", "userName": "root", "path": "/volume1/photo/immich"}



# ---------- WHOLE-APP DEMO FIXTURES (sources, history, tasks, policies, repo, prefs) ----------
import datetime as _dt
import hashlib as _hl
import random as _rnd
from urllib.parse import parse_qs as _pqs, urlparse as _up

GB = 1_000_000_000


def _now():
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0)


def _iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _oid(seed, prefix="k"):
    return prefix + _hl.sha1(seed.encode()).hexdigest()[:32]


HOST, USER = "mininas", "root"


def _src(path, host=HOST, user=USER):
    return {"host": host, "userName": user, "path": path}


# Browse fixtures: one realistic tree reused by every generated snapshot root.
BROWSE_ROOT = _oid("browse-root")
_K_LIB, _K_UP, _K_THUMB, _K_EV = _oid("lib"), _oid("upload"), _oid("thumbs"), _oid("ev")
_IK_BIG = _oid("big-indirect", "Ik")          # large dir stored as an indirect object (real Kopia shape)


def _fe(name, size, mtime="2026-09-28T07:12:44Z", seed=None):
    return {"name": name, "type": "f", "mode": "0644", "mtime": mtime, "uid": 1026, "gid": 100,
            "obj": _hl.sha1((seed or name).encode()).hexdigest()[:32], "size": size}


def _de(name, obj, size, files, dirs, mtime="2026-10-03T13:58:02Z", failed=0):
    return {"name": name, "type": "d", "mode": "0755", "mtime": mtime, "uid": 1026, "gid": 100, "obj": obj,
            "summ": {"size": size, "files": files, "symlinks": 0, "dirs": dirs, "maxTime": mtime,
                     "numFailed": failed}}


MANIFESTS.update({
    BROWSE_ROOT: [
        _de("library", _K_LIB, 412 * GB, 118_204, 1_930),
        _de("upload", _K_UP, 3_400 * MB, 212, 31),
        _de("thumbs", _IK_BIG, 38 * GB, 236_118, 4_012),
        _de("encoded-video", _K_EV, 61 * GB, 2_311, 140),
        _fe("immich-db-backup.sql.gz", 851 * MB, "2026-10-03T02:00:11Z"),
        _fe("settings.json", 183, "2026-10-01T18:40:03Z"),
        _fe(".kopiaignore", 64, "2026-06-11T09:00:00Z"),
        _fe("IMG_4821.HEIC", 3_400_000, "2026-09-30T16:22:10Z"),
        _fe("README.md", 1_204, "2026-05-02T10:00:00Z"),
    ],
    _K_LIB: [_de(str(y), _oid(f"lib{y}"), (y - 2009) * 18 * GB, (y - 2009) * 5_300, 12) for y in range(2014, 2027)],
    _K_UP: [_de("2026", _oid("up2026"), 3_400 * MB, 212, 30)],
    _IK_BIG: [_fe(f"{i:02x}.webp", 160_000 + i * 731, seed=f"t{i}") for i in range(24)],
    _K_EV: [_fe(f"VID_2026-09-{d:02d}.mp4", 380 * MB + d * MB, f"2026-09-{d:02d}T11:00:00Z") for d in range(1, 13)],
})
for _y in range(2014, 2027):
    MANIFESTS[_oid(f"lib{_y}")] = [_fe(f"IMG_{_y}_{i:04d}.HEIC", 2_800_000 + i * 997, f"{_y}-07-1{i % 9}T10:00:00Z")
                                   for i in range(15)]
MANIFESTS[_oid("up2026")] = [_fe(f"IMG_48{i:02d}.HEIC", 3_100_000 + i * 1000, "2026-09-30T16:22:10Z") for i in range(20)]

MOUNTED = {BROWSE_ROOT: "/tmp/kopia-mount/" + BROWSE_ROOT}

# Per-source history generator: (path, hours between runs, base size, growth/run, files, special flags)
SOURCE_SPECS = [
    # path,                         status,     schedule,                         last_ago_h, every_h, size,        files,   extra
    ("/volume1/photo/immich",       "IDLE",      {"intervalSeconds": 10800},      0.7,  3,   516 * GB, 357_000, {}),
    ("/volume1/docker",             "UPLOADING", {"intervalSeconds": 3600},       1.05, 1,   18 * GB,  92_000,  {}),
    ("/volume1/homes/roman",        "IDLE",      {"intervalSeconds": 86400},      74,   24,  212 * GB, 640_000, {"overdue": True}),
    ("/volume1/video_archive",      "PAUSED",    {"intervalSeconds": 604800},     214,  168, 1_310 * GB, 9_100, {}),
    ("/volume1/storage-media",      "IDLE",      {"manual": True},                480,  0,   2_050 * GB, 41_000, {}),
    ("/volume1/db_dumps",           "IDLE",      {"intervalSeconds": 21600},      2.5,  6,   1_565 * MB, 410,   {"errors": 3}),
    ("/volume1/photo/icloud_backup","IDLE",      {"timeOfDay": [{"hour": 3, "min": 30}]}, None, 24, 0, 0,  {}),
    ("/volume1/photo/takeout",      "PENDING",   {"intervalSeconds": 43200},      12.2, 12,  288 * GB, 151_000, {}),
]
REMOTE_SOURCES = [("/home/ubuntu/docker-volumes", "vps", "ubuntu", 5.5, 1_200 * MB, 23_000)]

HISTORY = {}
SOURCES_JSON = []


def _fentry(name, obj, size, mtime):
    return {"name": name, "type": "f", "mode": "0644", "mtime": mtime, "uid": 1026, "gid": 100,
            "obj": obj, "size": size}


def _vroot(path, v, size, files):
    key = f"{path}#{v}"
    root = _oid("vroot-" + key)
    if root in MANIFESTS:
        return root
    day = f"2026-09-{(v % 27) + 1:02d}T10:00:00Z"
    cfg_rev = v // 3
    cfg = _oid(f"cfg-{path}-{cfg_rev}")
    FILE_OBJECTS[cfg] = (json.dumps({"path": path, "revision": cfg_rev, "retention": {"daily": 7}}, indent=2) + "\n").encode()
    note = _oid(f"notes-{key}")
    FILE_OBJECTS[note] = ("# notes\n" + "".join(f"- entry {i}\n" for i in range(v % 9 + 2))).encode()
    lock = _oid(f"lock-{key}")
    FILE_OBJECTS[lock] = b"locked\n"
    heartbeat = _oid(f"hb-{path}")
    FILE_OBJECTS[heartbeat] = b"4242\n"
    data_dir, cache_dir, logs_dir = _oid(f"data-{key}"), _oid(f"cache-{path}"), _oid(f"logs-{path}-{v // 2}")
    db_size = int(size * 0.55) + v * 8192
    MANIFESTS[data_dir] = [_fe("state.db", db_size, day, seed=f"db-{key}"),
                           _fe("index.json", 2_000 + v * 31, day, seed=f"idx-{key}")]
    MANIFESTS[cache_dir] = [_fe("warm.cache", 1_048_576, "2026-09-01T00:00:00Z", seed=f"warm-{path}")]
    MANIFESTS[logs_dir] = [_fe(f"app-{v // 2}.log", 90_000 + (v // 2) * 7, day, seed=f"log-{path}-{v // 2}")]
    MANIFESTS[root] = [
        _de("data", data_dir, db_size + 2_000 + v * 31, 2, 0, day),
        _de("cache", cache_dir, 1_048_576, 1, 0, "2026-09-01T00:00:00Z"),
        _de("logs", logs_dir, 90_000 + (v // 2) * 7, 1, 0, day),
        _fentry("settings.json", cfg, len(FILE_OBJECTS[cfg]), f"2026-09-0{(cfg_rev % 9) + 1}T10:00:00Z"),
        _fentry("notes.md", note, len(FILE_OBJECTS[note]), day),
        _fentry(f"job-{v % 4}.lock", lock, 7, day),
        _fentry("heartbeat.pid", heartbeat, 5, day),
    ]
    return root


def _snap_list(path, every_h, size, files, last_ago_h, errors=0, seed=0):
    rnd = _rnd.Random(seed)
    out = []
    now = _now()
    n = 32 if every_h else 4
    step = every_h if every_h and every_h <= 24 else (every_h or 120)
    if every_h and every_h < 24:
        step = 24  # retention keeps ~1/day beyond the newest few; keep a month of points
    cur = size
    vers = [0] * n
    version = 0
    for i in range(n - 1, -1, -1):
        if i == n - 1 or i % 6 != 3:
            version += 1
        vers[i] = version
    version_summary = {}
    for i in range(n):
        ago = last_ago_h + (i * step if i else 0) + (0 if i < 1 else rnd.random() * 2)
        st = now - _dt.timedelta(hours=ago)
        dur = 40 + rnd.randint(0, 600) if size > 10 * GB else 8 + rnd.randint(0, 40)
        failed = errors if i == 0 else (2 if i == 9 and errors else 0)
        summary = version_summary.setdefault(vers[i], {
            "size": int(cur),
            "files": max(int(files * (1 - i * 0.0008)) - rnd.randint(0, max(files // 500, 1)), 1),
            "symlinks": 3, "dirs": int(files / 60), "maxTime": _iso(st), "numFailed": failed})
        s = {"id": _hl.sha1(f"{path}{i}".encode()).hexdigest()[:32],
             "rootID": _vroot(path, vers[i], summary["size"], summary["files"]),
             "startTime": _iso(st), "endTime": _iso(st + _dt.timedelta(seconds=dur)),
             "summary": dict(summary),
             "retention": [], "pins": [], "description": ""}
        if i == 6 and every_h:
            s["incomplete"] = "checkpoint"
        if i == 3:
            s["description"] = "before Immich 3.2 upgrade" if "immich" in path else ""
        if i == 12:
            s["pins"] = ["keep-forever"]
        out.append(s)
        cur = cur - size * (0.002 + rnd.random() * 0.004)
    for idx, s in enumerate(out):
        tags = []
        if idx < 10:
            tags.append(f"latest-{idx + 1}")
        if idx < 7:
            tags.append(f"daily-{idx + 1}")
        if idx in (0, 7, 14, 21):
            tags.append(f"weekly-{idx // 7 + 1}")
        if idx in (0, 30):
            tags.append(f"monthly-{1 if idx == 0 else 2}")
        s["retention"] = tags
    return out


def build_sources():
    now = _now()
    srcs, hist = [], {}
    for seed, (path, status, sched, last_h, every_h, size, files, extra) in enumerate(SOURCE_SPECS):
        e = {"source": _src(path), "status": status, "schedule": sched}
        if last_h is not None:
            snaps = _snap_list(path, every_h, size, files, last_h, extra.get("errors", 0), seed)
            hist[path] = snaps
            last = snaps[0]
            e["lastSnapshot"] = {
                "id": last["id"], "source": _src(path), "description": last["description"],
                "startTime": last["startTime"], "endTime": last["endTime"],
                "stats": {"totalSize": last["summary"]["size"], "excludedTotalSize": 0, "fileCount": files,
                          "cachedFiles": int(files * 0.97), "nonCachedFiles": int(files * 0.03),
                          "dirCount": int(files / 60), "excludedFileCount": 0, "excludedDirCount": 0,
                          "ignoredErrorCount": 0, "errorCount": extra.get("errors", 0)},
                "rootEntry": {"name": path.rsplit("/", 1)[-1], "type": "d", "mode": "0755",
                              "mtime": last["startTime"], "obj": last["rootID"], "summ": last["summary"]}}
        else:
            hist[path] = []
        if status == "UPLOADING":
            e["nextSnapshotTime"] = _iso(now - _dt.timedelta(minutes=4))
            e["currentTask"] = "41"
            e["upload"] = {"cachedBytes": 15_100 * MB, "hashedBytes": 1_240 * MB, "uploadedBytes": 410 * MB,
                           "estimatedBytes": 18_400 * MB, "cachedFiles": 88_100, "hashedFiles": 1_204,
                           "excludedFiles": 12, "excludedDirs": 3, "errors": 0, "ignoredErrors": 0,
                           "estimatedFiles": 92_000, "directory": "/volume1/docker/immich/postgres",
                           "lastErrorPath": "", "lastError": ""}
        elif status == "PENDING":
            e["nextSnapshotTime"] = _iso(now - _dt.timedelta(seconds=20))
        elif extra.get("overdue"):
            e["nextSnapshotTime"] = _iso(now - _dt.timedelta(hours=50))
        elif "manual" in sched or status == "PAUSED":
            pass
        elif last_h is None:
            e["nextSnapshotTime"] = _iso((now + _dt.timedelta(days=1)).replace(hour=3, minute=30, second=0))
        else:
            e["nextSnapshotTime"] = _iso(now + _dt.timedelta(hours=max(every_h - last_h, 0.2)))
        srcs.append(e)
    for seed, (path, host, user, last_h, size, files) in enumerate(REMOTE_SOURCES, start=50):
        snaps = _snap_list(path, 6, size, files, last_h, 0, seed)
        hist[path] = snaps
        last = snaps[0]
        srcs.append({"source": _src(path, host, user), "status": "REMOTE", "schedule": {},
                     "lastSnapshot": {"id": last["id"], "source": _src(path, host, user), "description": "",
                                      "startTime": last["startTime"], "endTime": last["endTime"], "stats": {},
                                      "rootEntry": {"name": "docker-volumes", "type": "d", "obj": last["rootID"],
                                                    "summ": last["summary"]}}})
    return srcs, hist


def _ctr(v, units=None, level="info"):
    c = {"value": v, "level": level}
    if units:
        c["units"] = units
    return c


def build_tasks():
    now = _now()
    T = []

    def add(tid, kind, desc, status, start_ago_min, dur_s, err=None, counters=None):
        st = now - _dt.timedelta(minutes=start_ago_min)
        t = {"id": str(tid), "kind": kind, "description": desc, "status": status, "startTime": _iso(st),
             "progressInfo": "", "counters": counters or {}}
        if status != "RUNNING":
            t["endTime"] = _iso(st + _dt.timedelta(seconds=dur_s))
        if err:
            t["errorMessage"] = err
        T.append(t)

    snap_ctr = lambda h, c, e=0: {"Hashed Files": _ctr(h), "Hashed Bytes": _ctr(h * 1_900_000, "bytes"),
                                  "Cached Files": _ctr(c), "Cached Bytes": _ctr(c * 2_400_000, "bytes"),
                                  "Uploaded Bytes": _ctr(int(h * 700_000), "bytes"),
                                  "Excluded Files": _ctr(12), "Excluded Directories": _ctr(0),
                                  "Errors": _ctr(e, level="error" if e else "info"), "Ignored Errors": _ctr(0)}
    add(41, "Snapshot", "Snapshot root@mininas:/volume1/docker", "RUNNING", 4, 0,
        counters=snap_ctr(1204, 88_100))
    add(40, "Snapshot", "Snapshot root@mininas:/volume1/photo/immich", "SUCCESS", 42, 312, counters=snap_ctr(214, 356_800))
    add(39, "Maintenance", "Quick maintenance", "SUCCESS", 95, 41,
        counters={"Deleted Blobs": _ctr(0), "Rewritten Contents": _ctr(0)})
    add(38, "Snapshot", "Snapshot root@mininas:/volume1/db_dumps", "SUCCESS", 150, 19, counters=snap_ctr(4, 406, 3))
    add(37, "Restore", "Restore " + BROWSE_ROOT[:12] + " to /volume1/restore/immich-settings", "SUCCESS", 260, 3,
        counters={"Restored Files": _ctr(1), "Restored Directories": _ctr(0), "Restored Bytes": _ctr(183, "bytes"),
                  "Skipped Files": _ctr(0)})
    add(36, "Snapshot", "Snapshot root@mininas:/volume1/photo/takeout", "FAILED", 730, 1802,
        err="error writing pack: unable to complete PutBlob(p8f1c...) despite 10 retries: "
            "dial tcp 10.0.0.12:445: i/o timeout", counters=snap_ctr(4_120, 9_800))
    add(35, "Restore", "Restore " + BROWSE_ROOT[:12] + " to /volume1/restore/library-2019", "CANCELED", 1440, 95,
        counters={"Restored Files": _ctr(311), "Restored Bytes": _ctr(912 * MB, "bytes")})
    add(34, "Estimate", "Estimate /volume1/photo/icloud_backup", "SUCCESS", 1500, 22,
        counters={"Bytes": _ctr(611 * GB, "bytes"), "Files": _ctr(182_400), "Directories": _ctr(3_100),
                  "Excluded Files": _ctr(41), "Excluded Bytes": _ctr(18 * MB, "bytes")})
    add(33, "Maintenance", "Full maintenance", "FAILED", 2900, 7,
        err="maintenance must be run by root@nas-archive-maint (this client is root@mininas)")
    for i in range(32, 18, -1):
        add(i, "Snapshot", "Snapshot root@mininas:/volume1/photo/immich", "SUCCESS", 3000 + (32 - i) * 180,
            280 + i, counters=snap_ctr(200 + i, 356_000))
    return T


TASKS = build_tasks()
TASK_LOGS = {
    "36": [(0, "uploading root@mininas:/volume1/photo/takeout", "snapshot"),
           (1, "retrying PutBlob(p8f1c...) (attempt 4/10): i/o timeout", "repo/blob"),
           (1, "retrying PutBlob(p8f1c...) (attempt 9/10): i/o timeout", "repo/blob"),
           (2, "error writing pack: unable to complete PutBlob despite 10 retries", "repo/content")],
}


def task_logs(tid):
    t = next((x for x in TASKS if x["id"] == tid), None)
    if t is None:
        return []
    base = _dt.datetime.strptime(t["startTime"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=_dt.timezone.utc).timestamp()
    lines = TASK_LOGS.get(tid) or [
        (0, t["description"] + " started", "uitask"),
        (0, "estimating size of " + t["description"].split(":")[-1], "snapshot/upload"),
        (0, "processed 214 files, 356800 cached, 0 errors", "snapshot/upload"),
        (0, "flushing manifests", "repo/manifest"),
    ] + ([(2, t["errorMessage"], "uitask")] if t.get("errorMessage") else [])
    return [{"level": lvl, "ts": base + i * 7.3, "msg": msg, "mod": mod} for i, (lvl, msg, mod) in enumerate(lines)]


POLICIES = [
    {"id": "global", "target": {"host": "", "userName": "", "path": ""}, "policy": {
        "retention": {"keepLatest": 10, "keepHourly": 0, "keepDaily": 7, "keepWeekly": 4, "keepMonthly": 12,
                      "keepAnnual": 2},
        "files": {"ignoreDotFiles": [".kopiaignore"], "ignoreCacheDirs": True},
        "errorHandling": {"ignoreFileErrors": False, "ignoreDirectoryErrors": False},
        "compression": {"compressorName": "zstd-fastest", "neverCompress": ["*.heic", "*.mp4", "*.jpg", "*.gz"]},
        "scheduling": {"runMissed": True},
        "actions": {}, "logging": {"directories": {"snapshotted": 5}},
        "upload": {"maxParallelSnapshots": 1, "maxParallelFileReads": 8}}},
    {"id": "host", "target": {"host": HOST, "userName": "", "path": ""},
     "policy": {"scheduling": {"intervalSeconds": 86400}}},
    {"id": "user", "target": {"host": HOST, "userName": USER, "path": ""},
     "policy": {"files": {"ignore": ["@eaDir", "#recycle", ".DS_Store"]}}},
]
for path, status, sched, *_ in SOURCE_SPECS:
    pol = {"scheduling": dict(sched)}
    if "immich" in path:
        pol["actions"] = {"beforeSnapshotRoot": {"script": "#!/bin/sh\ndocker exec immich_postgres pg_dumpall -U postgres | gzip > /volume1/photo/immich/immich-db-backup.sql.gz\n",
                                                 "timeout": 600, "mode": "essential"}}
        pol["retention"] = {"keepHourly": 8}
    if "docker" in path:
        pol["files"] = {"ignore": ["*.log", "**/cache/**", "codeserver/"]}
    POLICIES.append({"id": path, "target": _src(path), "policy": pol})


def find_policy(q):
    tgt = {"host": q.get("host", [""])[0], "userName": q.get("userName", [""])[0], "path": q.get("path", [""])[0]}
    for p in POLICIES:
        if p["target"] == tgt:
            return p
    return None


def resolve_policy(q):
    p = find_policy(q)
    eff = json.loads(json.dumps(POLICIES[0]["policy"]))
    definition = {}
    g = POLICIES[0]["target"]
    for sec, vals in eff.items():
        if isinstance(vals, dict):
            definition[sec] = {k: g for k in vals}
    chain = [x for x in POLICIES[1:3]] + ([p] if p and p["id"] not in ("global", "host", "user") else [])
    for ref in chain:
        for sec, vals in ref["policy"].items():
            eff.setdefault(sec, {}).update(vals)
            definition.setdefault(sec, {}).update({k: ref["target"] for k in vals})
    now = _now()
    upcoming = [_iso(now + _dt.timedelta(hours=3 * (i + 1))) for i in range(5)]
    return {"effective": eff, "definition": definition, "defined": (p or {}).get("policy", {}),
            "upcomingSnapshotTimes": upcoming}


REPO_STATUS = {"connected": True, "configFile": "/app/config/repository.config", "formatVersion": "3",
               "hash": "BLAKE2B-256-128", "encryption": "AES256-GCM-HMAC-SHA256", "ecc": "", "eccOverheadPercent": 0,
               "splitter": "DYNAMIC-4M-BUZHASH", "maxPackSize": 21_000_000, "storage": "filesystem",
               "supportsContentCompression": True, "hostname": HOST, "username": USER,
               "description": "nas-archive", "enableActions": True, "readonly": False}
ALGORITHMS = {"defaultHash": "BLAKE2B-256-128", "defaultEncryption": "AES256-GCM-HMAC-SHA256",
              "defaultEcc": "", "defaultSplitter": "DYNAMIC-4M-BUZHASH",
              "hash": [{"id": h, "deprecated": False} for h in ["BLAKE2B-256-128", "BLAKE3-256-128", "HMAC-SHA256-128"]],
              "encryption": [{"id": "AES256-GCM-HMAC-SHA256", "deprecated": False},
                             {"id": "CHACHA20-POLY1305-HMAC-SHA256", "deprecated": False}],
              "ecc": [{"id": "REED-SOLOMON-CRC32", "deprecated": False}],
              "splitter": [{"id": s, "deprecated": False} for s in ["DYNAMIC-4M-BUZHASH", "DYNAMIC-8M-BUZHASH", "FIXED-4M"]],
              "compression": [{"id": c, "deprecated": False} for c in
                              ["zstd-fastest", "zstd", "zstd-better-compression", "s2-default", "pgzip", "lz4"]]}
UI_PREFS = {"bytesStringBase2": False, "defaultSnapshotViewAll": False, "theme": "light", "fontSize": "fs-6",
            "pageSize": 20, "language": "en", "locale": "en"}
NOTIF_PROFILES = [
    {"profile": "pushover-phone", "minSeverity": 10,
     "method": {"type": "pushover", "config": {"appToken": "demo-not-a-token", "userKey": "demo-not-a-key", "format": "txt"}}},
    {"profile": "n8n-webhook", "minSeverity": 20,
     "method": {"type": "webhook", "config": {"endpoint": "https://hooks.example.invalid/kopia", "method": "POST",
                                               "format": "txt", "headers": ""}}},
    {"profile": "email-weekly", "minSeverity": -10,
     "method": {"type": "email", "config": {"smtpServer": "smtp.example.invalid", "smtpPort": 587,
                                             "smtpUsername": "kopia", "smtpPassword": "", "from": "kopia@example.invalid",
                                             "to": "me@example.invalid", "cc": "", "format": "html"}}},
]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def log_message(self, fmt, *args):
        pass  # keep the console quiet

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return True

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/instances":
            return self._json([{"id": "primary", "name": "nas-archive (demo data)", "default": True}])
        if path.startswith("/api/primary/v1/"):
            r = self._demo_get(path[len("/api/primary/v1/"):], _pqs(_up(self.path).query))
            if r is not None:
                return r
        # SPA fallback for client-side routes
        if not path.startswith("/assets") and "." not in path.rsplit("/", 1)[-1]:
            self.path = "/index.html"
        return super().do_GET()

    def _demo_get(self, p, q):
        if p == "snapshots":
            path = q.get("path", [""])[0]
            snaps = list(HISTORY.get(path, []))
            if path == SOURCE["path"]:
                snaps = SNAPSHOTS + snaps
            snaps = sorted(snaps, key=lambda s: (s["startTime"], s["endTime"]))
            return self._json({"snapshots": snaps, "unfilteredCount": len(snaps),
                               "uniqueCount": max(len(snaps) - 2, 0) if len(snaps) > 4 else len(snaps)})
        if p.startswith("objects/"):
            oid = p.split("/", 1)[1]
            if oid in FILE_OBJECTS:
                body = FILE_OBJECTS[oid]
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return True
            manifest = MANIFESTS.get(oid)
            if manifest is None:
                if len(oid) == 32 and all(c in "0123456789abcdef" for c in oid):
                    body = b"demo file content for " + oid.encode() + b"\n"
                    self.send_response(200)
                    self.send_header("Content-Type", "application/octet-stream")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return True
                return self._json({"code": "NOT_FOUND", "error": "object not found: " + oid}, 500)
            return self._json({"stream": "kopia:directory", "entries": manifest, "summary": summ(0, 0)})
        if p == "sources":
            return self._json({"localHost": HOST, "localUsername": USER, "multiUser": True, "sources": SOURCES_JSON})
        if p == "tasks-summary":
            s = {"RUNNING": sum(1 for t in TASKS if t["status"] == "RUNNING")}
            for t in TASKS:
                if t["status"] != "RUNNING":
                    s[t["status"]] = s.get(t["status"], 0) + 1
            return self._json(s)
        if p == "tasks":
            return self._json({"tasks": TASKS})
        if p.startswith("tasks/"):
            parts = p.split("/")
            if len(parts) == 3 and parts[2] == "logs":
                return self._json({"logs": task_logs(parts[1])})
            t = next((x for x in TASKS if x["id"] == parts[1]), None)
            return self._json(t) if t else self._json({"code": "NOT_FOUND", "error": "task not found"}, 404)
        if p == "repo/status":
            return self._json(REPO_STATUS)
        if p == "repo/algorithms":
            return self._json(ALGORITHMS)
        if p == "current-user":
            return self._json({"hostname": HOST, "username": USER})
        if p == "policies":
            return self._json({"policies": POLICIES})
        if p == "policy":
            pol = find_policy(q)
            return self._json(pol["policy"]) if pol else self._json({"code": "NOT_FOUND", "error": "policy not found"}, 404)
        if p == "ui-preferences":
            return self._json(UI_PREFS)
        if p == "notificationProfiles":
            return self._json(NOTIF_PROFILES)
        if p == "mounts":
            return self._json({"items": [{"root": r, "path": m} for r, m in MOUNTED.items()]})
        if p.startswith("mounts/"):
            root = p.split("/", 1)[1]
            if root in MOUNTED:
                return self._json({"root": root, "path": MOUNTED[root]})
            return self._json({"code": "NOT_FOUND", "error": "mount not found"}, 404)
        return None

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return {}

    def do_POST(self):
        p = self.path.split("?")[0].replace("/api/primary/v1/", "")
        q = _pqs(_up(self.path).query)
        b = self._body()
        if p == "policy/resolve":
            return self._json(resolve_policy(q))
        if p == "paths/resolve":
            return self._json({"source": _src(b.get("path", ""))})
        if p == "mounts":
            root = b.get("root", "")
            MOUNTED[root] = "/tmp/kopia-mount/" + root
            return self._json({"root": root, "path": MOUNTED[root]})
        if p == "repo/description" and isinstance(b, dict):
            REPO_STATUS["description"] = b.get("description", "")
            return self._json({})
        if p in ("restore", "estimate", "sources/upload", "sources"):
            return self._json({"id": "41"} if p != "sources/upload" else {})
        return self._json({})

    def do_PUT(self):
        p = self.path.split("?")[0].replace("/api/primary/v1/", "")
        b = self._body()
        if p == "ui-preferences" and isinstance(b, dict):
            UI_PREFS.update(b)
        return self._json(b if isinstance(b, dict) else {})

    def do_DELETE(self):
        p = self.path.split("?")[0].replace("/api/primary/v1/", "")
        if p.startswith("mounts/"):
            MOUNTED.pop(p.split("/", 1)[1], None)
        return self._json({})


if __name__ == "__main__":
    SOURCES_JSON[:], _h = build_sources()
    HISTORY.update(_h)
    if os.environ.get("KOPIA_DEMO_THEME"):
        UI_PREFS["theme"] = os.environ["KOPIA_DEMO_THEME"]
    print(f"preview on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
