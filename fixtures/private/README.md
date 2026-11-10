# Private fixtures

Drop real client GTM exports here. Everything in this folder except this README is gitignored.

Suggested names: `legacy-<client>.json`, `optimized-<client>.json`, `mixed-<client>.json`, `server-<client>.json`, `messy-<client>.json`.

Then run:

    pnpm inspect fixtures/private/*.json            # counts to compare against the GTM UI
    pnpm inspect --survey fixtures/private/*.json   # unknown keys and type keys across all files

The inspect tool prints structure only (counts, type keys, key names), never parameter values.
Sanitised copies for committed tests go in packages/core/test/fixtures/.
