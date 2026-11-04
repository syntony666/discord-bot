# @discord-bot/bot

## 5.3.1

### Patch Changes

- 1350184: `/linkfix` and auto linkfix now rewrite `threads.com/share/` links straight to `vxthreads.com` instead of trying to resolve the redirect first — Threads rate-limits datacenter IPs, so the resolve pass returned 「無需修復」 on prod.

## 5.3.0

### Minor Changes

- 232edfc: Add `/clear count|time` — bulk-delete recent messages with a danger confirm, skipping pinned messages and anything older than Discord's 14-day window
- 91c640e: Add `/linkfix` and `/auto linkfix` — rewrite X/Instagram/TikTok/Pixiv/Threads/Facebook links into embeddable fixer URLs, expand short links (including `reurl.cc` info-page targets), strip tracking params, and suppress the original embed
- 91c640e: Add `/notify message-delete` — log deleted messages guild-wide to a configured channel, with a per-channel ignore list
- 91c640e: Add `/random pick|roll|number` — random selection, dice expressions with keep/drop modifiers, and ranged integers
- 91c640e: Add `/say` — post a footer-stamped announcement embed in the current channel behind a single-embed preview confirmation
