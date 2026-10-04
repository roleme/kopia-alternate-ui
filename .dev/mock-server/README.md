# Demo API server

A small stub of the Kopia API with realistic fixtures, for developing and screenshotting the UI without a Kopia server. It serves the built app and mocks `/api/primary/v1/*`.

```
npm run lang:extract && npm run build
python3 .dev/mock-server/server.py        # http://localhost:8790
```

Environment: `MOCK_PORT` (default 8790), `MOCK_DIST` (default `../../dist`), `KOPIA_DEMO_THEME=dark`.

## Demo pages

| Page | URL |
|---|---|
| Sources (running, overdue, paused, manual, errors, never run, queued, remote) | `/snapshots` |
| Snapshot history | `/snapshots/single-source?userName=root&host=mininas&path=%2Fvolume1%2Fphoto%2Fimmich` |
| Compare (added, removed, modified, touched files) | `/snapshots/compare?host=mininas&userName=root&path=/volume1/photo/immich&a=N_OLD&b=N_NEW` |
| Browse, mounted / not mounted / error | `/snapshots/dir/k9077848b7782f7dab2cf55c37c94caf2`, `/snapshots/dir/R1`, `/snapshots/dir/NOPE` |
| Tasks (running, failed with logs) | `/tasks`, `/tasks/41`, `/tasks/36` |
| Policy editor | `/policies?userName=root&host=mininas&path=%2Fvolume1%2Fphoto%2Fimmich&viewPolicy=true` |
| Repository, preferences, mounts | `/repo`, `/preferences`, `/mounts` |

## Notes

- Root IDs behave like Kopia's content hashes: two snapshots share a root only when their content is identical.
- State changed through the UI (repository description, preferences) lives in memory and resets on restart.
- To see the loading screen, delay `/api/*` responses with browser devtools network throttling.
