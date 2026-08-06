# Liquidity Lab market-data API research

Research into free and cheap market-data APIs for the Liquidity Lab: a public web calculator answering "how do I liquidate various types of assets?" using an ADV (average daily volume) participation model. Facts verified against official pricing pages and documentation as of August 2026 unless flagged as inferred.

**Requirements recap:** Next.js server-side route handlers hold API keys; single admin, low traffic; budget free or very cheap. Needs: equity ticker resolution across venues (AAPL on Nasdaq, RIO on LSE) returning exchange, currency and last/close price; daily OHLCV history to compute 20/60-day ADV; ideally bid/ask or a spread estimate (optional); bond data (per-ISIN price/volume) is a known gap with liquid ETF proxies assumed (LQD, HYG, TLT, IEF); ETF coverage matters.

## Headline findings

- **Finnhub is out.** Its `/stock/candle` endpoint has never been on the free tier — even for US symbols (confirmed by Finnhub's own GitHub responses). This contradicts most older blog advice.
- **Twelve Data free tier is US-only** (plus a small "global trial symbol" set). LSE unlocks at Grow, which officially starts at **$29/mo** (aggregator sites still citing $79 as the entry Grow price are describing the top Grow configuration).
- **Alpha Vantage is the only genuinely free source of licensed LSE daily OHLCV**, but at 25 requests/day.
- **Free per-ISIN bond volume does not exist** in any usable API form; the ETF-proxy plan is correct.
- **Licensing is the recurring catch:** nearly every free/cheap tier is "personal/internal use"; publicly displaying data on a website is formally redistribution/external display almost everywhere. Detail per provider below.

---

## 1. Twelve Data

| Item | Finding |
|---|---|
| Free tier | Basic: 8 credits/min, 800/day. **US markets only** (real-time US equities/ETFs, forex, crypto) plus a global *trial symbol* set. Verified on official `twelvedata.com/pricing.md`. |
| `RIO LN` lookup | **Paid — Grow tier or above.** LSE (and AIM) are listed as Grow-plan exchanges on twelvedata.com/exchanges. Not available on free Basic. |
| Daily OHLCV endpoint | `time_series` with `interval=1day` (1 credit per call; symbol form `RIO:LSE` or `symbol=RIO&exchange=LSE`). |
| Symbol search | `symbol_search` — free, returns the full exchange catalogue regardless of plan (confirmed in Twelve Data support docs), but price data access still depends on plan. |
| Spread/quote | `quote` endpoint gives last/close/change; no bid/ask for equities on self-serve tiers. |
| Cheapest relevant paid | **Grow $29/mo** (55 credits/min, no daily cap, 20+ markets incl. LSE, EOD global equities/ETFs). Annual billing −17%. |
| Licensing | Basic is "internal non-display usage only". Individual plans (incl. Grow) allow **internal display only** — strictly, showing data on a public website requires a Business plan (**Venture, $149/mo**, "external display data access"). Verified in official pricing and support docs. |
| Fit verdict | Best-in-class API ergonomics and the cheapest *licensed* LSE upgrade path ($29), but the free tier cannot do LSE and public display is formally a business-plan feature. |

## 2. Finnhub

| Item | Finding |
|---|---|
| Free tier | 60 calls/min. US-only. Free endpoints: real-time US `quote`, `search` (symbol lookup), company profile/basic fundamentals, news. |
| `RIO LN` lookup | **Not available on any self-serve tier usefully.** International market data is per-market licensed; entry Market Data plan ~$49.99/mo (billed quarterly), and even then LSE is a premium add-market. |
| Daily OHLCV endpoint | `/stock/candle` — **paid-only, including for US symbols**. Verified via Finnhub's own GitHub issue responses ("free plan never allowed access to /stock/candle", Apr 2025) and the pricing page. |
| Symbol search | `/search` — free. |
| Spread/quote | `/quote` (US, free) returns OHLC/previous close only, no bid/ask. |
| Cheapest relevant paid | Market Data Basic ~$49.99/mo — still a personal-use licence. |
| Licensing | All self-serve plans (free and paid) are **personal use**; commercial/public use needs written approval; redistribution is enterprise-only. |
| Fit verdict | **Eliminated** — no free candles at all, so it cannot compute ADV on any budget. |

## 3. Alpha Vantage

| Item | Finding |
|---|---|
| Free tier | **25 requests/day** (verified on the official support page; the old "5/min, 500/day" figures are obsolete). Covers "the majority of datasets", explicitly including global daily series. Unlimited requests are offered for verified open-source/educational projects (relevant if the Lab repo is open source). |
| `RIO LN` lookup | **Free.** `TIME_SERIES_DAILY&symbol=RIO.LON` works on the free key; the official docs use `TSCO.LON` as the demo LSE symbol. `compact` (last 100 bars — ample for 60-day ADV) is free; `full` and `TIME_SERIES_DAILY_ADJUSTED` are premium. |
| Daily OHLCV endpoint | `TIME_SERIES_DAILY` (raw, unadjusted — fine for ADV; volume included). |
| Symbol search | `SYMBOL_SEARCH` — free; returns symbol, name, region, currency and match score (good enough for venue resolution UX). |
| Spread/quote | `GLOBAL_QUOTE` (free) — price/volume/previous close, **no bid/ask**. |
| Cheapest relevant paid | Premium $49.99/mo (75 req/min, no daily cap). |
| Licensing | Free/premium keys are for **personal use**; "for commercial use, contact sales" appears throughout the docs. No explicit public-display clause on the free tier; the same personal-use ambiguity as peers. NASDAQ-licensed vendor, so the data itself is legitimate. |
| Fit verdict | **The only zero-cost licensed source of LSE daily volume** — 25 req/day is workable for a cached, low-traffic calculator, useless without caching. Caveat (inferred, not verified): LSE prices are typically quoted in **GBX (pence)** — normalise before showing notional values. |

## 4. EODHD (eodhistoricaldata)

| Item | Finding |
|---|---|
| Free tier | 20 API calls/day + 500-call welcome bonus; EOD API for **any ticker but only the past 1 year** of history (sufficient for 20/60-day ADV); ticker lists per exchange included. Demo key gives 6 symbols unrestricted. |
| `RIO LN` lookup | Free tier reaches it (`RIO.LSE`, past-year window); full history needs **All World $19.99/mo** ($16.58/mo billed annually). |
| Daily OHLCV endpoint | `/api/eod/{SYMBOL.EXCHANGE}` — OHLC, adjusted close, volume; 70+ exchanges, 30+ years (non-US mostly from 2000). |
| Symbol search | `/api/search/{query}` and per-exchange ticker lists — good multi-venue resolution (returns exchange, currency, and ISIN in many cases). |
| Spread/quote | Live (15-min delayed) API on paid plans; **no bid/ask** on EOD plans. |
| Cheapest relevant paid | **All World $19.99/mo** — 100k calls/day, 1k/min. Also sells a per-ISIN **bond price API** but only in the ALL-IN-ONE package ($99.99/mo), and it is prices, not reliable volumes. |
| Licensing | Terms are unusually explicit: self-serve plans are personal/non-professional; **displaying data publicly is expressly prohibited** without a commercial licence (quote: prohibited from "selling, reselling, retransmitting, redistributing, displaying…"). Commercial licensing is a separate quote-based process. |
| Fit verdict | Best paid value for global EOD ($16.58–19.99/mo) with the cleanest API shape for this exact job; the free tier is a genuine (if tiny) LSE fallback; strictest written display prohibition of the group. |

## 5. Marketstack

| Item | Finding |
|---|---|
| Free tier | **100 requests/month** (official pricing page; the FAQ's "1,000" is a stale inconsistency — trust 100), EOD data, 1 year history, ticker/exchange info, HTTPS. |
| `RIO LN` lookup | **Free tier includes global EOD** across ~70 exchanges — `RIO.XLON` should work on free (coverage claim verified; the specific ticker inferred). |
| Daily OHLCV endpoint | `/v2/eod` (and `/eod/latest`); OHLCV plus split/dividend factors. |
| Symbol search | `/tickers?search=` — decent; returns exchange MIC and metadata. |
| Spread/quote | None relevant (US IEX intraday on paid plans; no bid/ask). |
| Cheapest relevant paid | Basic $9.99/mo — 10,000 req/mo, 10 years history, **"Commercial Use" is listed as a paid-plan feature**. |
| Licensing | Free tier non-commercial; Basic and up advertise commercial use — one of the few cheap tiers that *claims* to permit it (the fine print of the licence text was not verified). |
| Fit verdict | 100 req/month is very tight but global; **$9.99/mo Basic is arguably the cheapest "public website" story on paper**. Historic reputation for patchy volume data quality on smaller LSE names (inferred from community reports, not verified). |

## 6. Polygon.io (now "Massive")

| Item | Finding |
|---|---|
| Free tier | Stocks Basic: **5 calls/min**, EOD, 2 years history, all US tickers, reference data, corporate actions. Rebranded Massive on 30 October 2025; `api.polygon.io` and existing keys unchanged. |
| `RIO LN` lookup | **Not possible on any plan — US equities only.** Confirmed: coverage is US stocks/options/indices/forex/crypto/futures; no LSE product exists. (RIO the NYSE ADR would work; RIO.L would not.) |
| Daily OHLCV endpoint | `/v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}`. |
| Symbol search | `/v3/reference/tickers?search=` — excellent, US-only. |
| Spread/quote | NBBO quotes only on Advanced ($199/mo). |
| Cheapest relevant paid | Starter $29/mo (unlimited calls, 15-min delayed) — individual, non-professional use. |
| Fit verdict | Superb US data and the best free US ETF source (covers LQD/HYG/TLT/IEF), but a non-starter as sole provider given the LSE requirement. |

## 7. Yahoo Finance unofficial (yfinance / query1)

| Item | Finding |
|---|---|
| Free tier | No key, no documented limits. `query1.finance.yahoo.com/v8/finance/chart/RIO.L` gives daily OHLCV; quote endpoints give **bid/ask** — the only "free" bid/ask source found. Coverage is effectively global. |
| Symbol search | Unofficial search endpoint / yfinance `Lookup` — good, returns exchange and currency. |
| Reliability | Endpoints break periodically; 2025–26 saw waves of 429 blocking, cookie/crumb auth changes, and TLS-fingerprint countermeasures (yfinance now ships `curl_cffi` impersonation to cope). Server-side calls from a fixed cloud/VPS IP (a Next.js host such as Vercel) are exactly the traffic Yahoo throttles hardest. |
| ToS risk | **Explicit.** Yahoo's ToS prohibit automated extraction; the endpoints are internal and unlicensed; yfinance's own README says personal/research use only. Displaying scraped Yahoo data on a public website is a clear violation — low practical enforcement risk for a tiny personal site, but the data can vanish or block at any time, and exchange data (LSE) would be redistributed without licence. |
| Fit verdict | Technically the best free coverage (global plus bid/ask), legally and operationally the worst; acceptable only as a last-resort fallback adapter behind a cache, never as the primary. |

## 8. Bond data options

- **FINRA TRACE — what is actually free:**
  - *Web UI only:* per-CUSIP real-time trade history is viewable free on the finra.org Fixed Income Data pages (search by symbol/CUSIP) — but this is a browser tool under a user agreement, not an API; scraping it would breach the Fixed Income Data User Agreement.
  - *Free downloadable files (TRAQS web API):* market **aggregates** only — daily corporate/agency market breadth, most-active IG/HY/convertible lists, and a Closing Price File (high/low/last per TRACE issue, no per-issue volume). Crucially, **accessing issues keyed by CUSIP requires your own S&P CUSIP licence**.
  - *FINRA Query API (developer.finra.org):* free registration; fixed-income datasets are aggregates (capped volume reports, market breadth, Treasury aggregate volumes, monthly report cards) — **no per-CUSIP daily volume dataset**.
  - *Per-CUSIP transaction feeds* (End-of-Day Transaction File, TSAR, Academic TRACE) are paid subscriptions or restricted to academic institutions.
- **Anything else:** EODHD sells per-ISIN corporate/government bond EOD *prices* (ALL-IN-ONE, $99.99/mo) — prices, not dependable volumes. Marketstack lists "Bonds" on paid plans but that appears to be benchmark government bond yields, not per-ISIN liquidity data (inferred from marketing copy; not deeply verified).
- **Conclusion:** the working assumption is confirmed — **no free per-ISIN bond ADV exists**. Use liquid ETF proxies (LQD, HYG, TLT, IEF, plus e.g. EMB/MUB/AGG), all ordinary US-listed ETFs covered by every US equity provider above. A static mapping table from bond category to proxy ETF is the right design.

## 9. Other options: Tiingo, FMP, Stooq

| Provider | Free tier | LSE? | Notes |
|---|---|---|---|
| **Tiingo** | 1,000 req/day, 50/hr, 500 unique symbols/mo | **No** — US plus Chinese A-shares only | Great US ETF/EOD quality (`/tiingo/daily/{ticker}/prices`); licensing explicit: free and $30/mo plans are internal-use, **no redistribution**; redistribution licences from $250/mo. Does not solve LSE. |
| **Financial Modeling Prep** | 250 req/day, US-only, 5 years history | Paid — UK arrives at **Premium $59/mo** | Good API; free tier US-only; public display requires a separate Data Display and Licensing Agreement per their pricing page. |
| **Stooq** | Free CSV (`stooq.com/q/d/l/?s=rio.uk&i=d`); API key via CAPTCHA required as of early 2026; undisclosed daily quota | **Yes** — `.uk` suffix, daily OHLCV including volume | Genuinely free global EOD; non-commercial terms; no formal SLA, occasional gaps/stale data on less liquid names (inferred from community experience); no JSON, no symbol-search API (bulk ticker lists downloadable). Best free *unofficial-but-tolerated* LSE fallback, materially lower ToS risk than Yahoo. |

---

## Ranked recommendation

The tension: on a zero budget there is no provider that is simultaneously free, LSE-capable, and formally licensed for public display. Every free tier is personal-use. The practical ranking accepts "personal-use tier on a personal website with heavy caching and attribution" as the operating posture, and keeps a clean paid upgrade path.

**Primary adapter — Twelve Data (free Basic) for US equities and ETFs.**
800 credits/day and 8/min comfortably covers AAPL-type lookups and all the bond-proxy ETFs (LQD, HYG, TLT, IEF are US-listed). One `time_series` call returns the whole 60-day window, so one symbol costs 1 credit. Clean JSON, `symbol_search` for resolution.

**Secondary/international adapter — Alpha Vantage (free) for LSE and other non-US venues.**
`SYMBOL_SEARCH` plus `TIME_SERIES_DAILY` (compact) handle `RIO.LON` for zero cost. 25 requests/day is fine *only* with an aggressive server-side cache: compute ADV once per symbol per day, persist it (KV/SQLite/Vercel KV), serve every visitor from cache. Convert GBX to GBP for LSE names. If the Lab repo is open-sourced, apply for Alpha Vantage's free unlimited open-source tier — that would remove the 25/day constraint entirely.

**Fallback adapter — Stooq CSV** (daily quota undisclosed, key via CAPTCHA) for when Alpha Vantage's daily budget is exhausted or a symbol is missing. Prefer it over yfinance: same free global EOD, far less adversarial. Keep a yfinance-style Yahoo chart-endpoint adapter only as a documented, off-by-default last resort, with the ToS risk noted in code.

**Recommended handling of LSE/international names on a near-zero budget:**

1. Resolve venue via Alpha Vantage `SYMBOL_SEARCH` (returns region and currency); cache resolutions indefinitely.
2. Fetch daily OHLCV once per symbol per day; compute and store 20/60-day ADV server-side; never proxy raw API responses to the client.
3. Normalise GBX to GBP; display "prices delayed / end-of-day, source: X" attribution.
4. Spread: no free feed provides bid/ask reliably — use a heuristic spread model (bucket by ADV notional and market: e.g. mega-cap 2–5 bps, small-cap 30–100 bps) and label it an estimate. This is more defensible than scraped bid/ask anyway.
5. **First paid upgrade when needed: EODHD All World at $19.99/mo** (or $16.58/mo billed annually) — one adapter replaces both equity sources, 70+ exchanges, 100k calls/day. If formal public-display licensing ever matters, the honest options are Marketstack Basic $9.99/mo (advertises commercial use — verify their licence text first) or Twelve Data Venture $149/mo (explicit external display rights).

## Verified vs inferred

**Verified against official pages/docs (August 2026):**

- Twelve Data plan matrix, credits, LSE-at-Grow, display-rights wording (`twelvedata.com/pricing.md`, exchanges page, support docs).
- Finnhub candles-paid-only and personal-use licence (pricing page, Finnhub GitHub issue responses).
- Alpha Vantage 25/day free limit, free `RIO.LON`-style daily series, compact-vs-full split, `SYMBOL_SEARCH` (support page and API documentation).
- EODHD free tier (20/day, 1-year window), $19.99 All World, explicit no-display terms (pricing page, terms and conditions).
- Marketstack 100/mo free and $9.99 Basic with "Commercial Use" bullet (pricing and signup pages).
- Polygon/Massive US-only coverage, 5/min free tier, October 2025 rebrand (massive.com pricing).
- Tiingo limits and no-redistribution terms (pricing page, documentation overview).
- Stooq CAPTCHA-gated API key requirement and CSV interface.
- FINRA free file/dataset inventory and the S&P CUSIP-licence requirement (finra.org, developer.finra.org, TRAQS web API spec).

**Inferred or uncertain:**

- Alpha Vantage GBX quoting for LSE names (widely reported, unverified here — test before trusting notionals).
- Marketstack volume data quality on smaller LSE names (community reports).
- Stooq's exact daily quota (undisclosed by the provider).
- Marketstack "Bonds" being benchmark yields only.
- Whether Alpha Vantage would grant the open-source unlimited tier for this project.
- Practical (as opposed to formal) enforcement risk of personal-use tiers on a low-traffic personal site — a judgement call, not a verified fact.
