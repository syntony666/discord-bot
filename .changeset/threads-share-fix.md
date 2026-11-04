---
'@discord-bot/bot': patch
---

`/linkfix` and auto linkfix now rewrite `threads.com/share/` links straight to `vxthreads.com` instead of trying to resolve the redirect first — Threads rate-limits datacenter IPs, so the resolve pass returned 「無需修復」 on prod.
