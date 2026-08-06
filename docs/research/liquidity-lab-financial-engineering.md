# Liquidity Lab — financial engineering research report

Research underpinning a web calculator that answers "how do I liquidate various types of assets?". The user supplies any two of {liquidation volume, horizon in days, cost in bps}; the engine solves the third under scenario knobs {ADV multiplier, bid–ask multiplier, volatility multiplier}. Mean cost only in v1. Asset modules: cash equity, bond (proxy-heavy), TRS (underlier + OTC overlay).

All formulas below are deliberately simple, closed-form, and defensible to a professional risk audience. Sources are cited inline; the strongest citations for in-app explainers are collected in section D.

---

## 1. Participation / ADV models

The workhorse of liquidity risk measurement is the participation model:

```
days to liquidate  T = Q / (p × ADV)
```

where `Q` is position size, `ADV` is average daily volume and `p` is the participation rate — the fraction of daily market volume the seller assumes they can absorb without materially moving the price.

**Typical participation rates.** There is no single standard, but the practitioner and regulatory range is tight:

- The CSSF (Luxembourg fund regulator) time-to-liquidation stress framework uses **20% as the base participation rate, with 10% and 30% as sensitivities**, applied to average historical daily trading volume ([CSSF working paper, *Liquidity Stress Test for LU investment funds — the time to liquidation approach*](https://www.cssf.lu/wp-content/uploads/Liquidity_Stress_Test_for_LU_investment_funds_-_the_time_to_liquidation_approach.pdf)).
- Kissell & Glantz (2003) style capacity analysis conventionally caps a single day's trading at 5–25% of 20-day ADV; 10% is a common conservative default ([QuanterLab capacity note](https://quanterlab.com/articles/diagnostics-capacity-liquidity)).
- Fund-compliance practice around SEC 22e-4 commonly assumes **15%** ([Confluence, *SEC puts liquidity estimation back in focus*](https://www.confluence.com/sec-puts-liquidity-estimation-back-in-focus/)).
- Practitioner folklore: 20–25% is typical, with some arguing 15% is already disruptive for large positions ([Quant SE discussion](https://quant.stackexchange.com/questions/19407/how-do-i-calculate-approximate-equity-liquidity)).

**Why 10–30%?** The participation rate encodes two things: (i) other investors also need the market's liquidity, so one seller cannot claim all of it; and (ii) above roughly a quarter of volume, a seller's flow dominates the order book and impact stops being "small" — the participation model's premise (liquidate *without* materially moving price) breaks down. The CSSF paper states this rationale explicitly: the rate ensures the order size is "well below the historical market depth available… without impacting the market price in normal times".

**ADV measurement.** Trailing 20 or 30 trading days is standard (20-day is most common for equities); use a mean or, more robustly, a median to damp one-off volume spikes. For equities, decide between primary-exchange and consolidated volume — consolidated can be 2–3× primary ([Quant SE](https://quant.stackexchange.com/questions/19407/how-do-i-calculate-approximate-equity-liquidity)). Recommend consolidated with that caveat in the explainer.

**Schedules: constant participation vs pro-rata.** For a *single* position, the natural v1 assumption is constant participation: sell `p × ADV` per day until done (equivalently uniform/VWAP-style execution — the Almgren–Chriss zero-risk-aversion limit). "Pro-rata" in the fund-liquidity literature refers to *portfolio* slicing (vertical slicing: sell the same fraction of every holding) versus "waterfall" (sell most liquid first); evidence on which funds actually do is mixed ([IMF WP/17/226, *Liquidity Stress Tests for Investment Funds*](https://www.imf.org/-/media/Files/Publications/WP/2017/wp17226.ashx)). Irrelevant for a single-asset calculator but worth one line in the explainer, since the tool's per-asset answer is the building block of a pro-rata portfolio calculation. BlackRock's LRM whitepaper also documents the conservative "last-dollar" convention: a position's bucket is set by the day the *last* unit is sold ([BlackRock, *Lessons from COVID-19*](https://www.blackrock.com/corporate/literature/whitepaper/viewpoint-addendum-lessons-from-covid-liquidity-risk-management-is-central-to-open-ended-funds-january-2021.pdf)).

**Units.** Work internally in **notional value** (position value and ADV both in currency). Equities quote ADV in shares, so convert with price at the UI boundary; `Q/ADV` is dimensionless either way provided both sides use the same units. Bonds have no share concept — notional is the only sensible unit (see section 7).

## 2. Transaction cost decomposition

Standard decomposition of one-way liquidation cost, measured against arrival mid-price:

```
cost = half-spread + temporary impact + permanent impact  (+ timing risk, zero-mean)
```

**Half-spread.** Even an infinitesimal sale crosses half the bid–ask spread: you sell at the bid, not at mid. This is the "exogenous cost of liquidity" in the liquidity-adjusted VaR literature (Bangia, Diebold, Schuermann & Stroughair 1999, [*Modeling Liquidity Risk*](https://archive.nyu.edu/bitstream/2451/27135/2/wpa99062.pdf)) and it is the **cost floor** of any coherent model: no schedule, however patient, gets below it.

**Market impact and the square-root law.** For order sizes that exceed touch depth, the dominant empirical regularity is the square-root impact law:

```
ΔP/P ≈ Y × σ_daily × sqrt(Q / V)
```

with `σ_daily` daily volatility, `V` daily volume, and `Y` a constant of order one. Evidence:

- Tóth, Bouchaud et al. document the law across equities, futures and FX, across decades and execution styles, with **Y of order unity** and, when fitted as a free power law, exponents in the **0.4–0.7** range ([*Anomalous Price Impact and the Critical Nature of Liquidity*, Phys. Rev. X 1, 021006 (2011)](https://journals.aps.org/prx/abstract/10.1103/PhysRevX.1.021006)).
- Almgren, Thum, Hauptmann & Li (2005) fit Citigroup order data and find a **3/5 power for temporary impact** (statistically rejecting exactly 1/2), with normalised coefficients **η = 0.142 ± 0.006 (temporary)** and **γ = 0.314 ± 0.041 (permanent)** ([*Direct Estimation of Equity Market Impact*](https://www.cis.upenn.edu/~mkearns/finread/costestim.pdf)).
- Gatheral's survey notes the σ√(Q/V) form has been embedded in commercial pre-trade tools for decades — Salomon StockFacts Pro (~1991), the Barra Market Impact Model (~1998), Bloomberg's TCA (2005) — tracing back to Grinold & Kahn's "sigma-root-liquidity" model ([Gatheral, *Optimal order execution* lecture](http://mathfinance.sns.it/wp-content/uploads/2010/12/Gatheral_Optim_Exec.pdf)).
- Kissell's I-star practitioner model has the same skeleton: instantaneous impact `I* = a₁ (Q/ADV)^a₂ σ^a₃`, split into a temporary part scaling with participation rate and a permanent part (Kissell & Glantz, *Optimal Trading Strategies*; [I-star reference implementation](https://rdrr.io/github/braverock/blotter/man/iStarPostTrade.html)).

**Temporary vs permanent.** Temporary impact is the price concession for demanding liquidity now; it decays after trading stops. Permanent impact is the lasting revaluation (information content). Calibration examples attribute roughly **two-thirds temporary, one-third permanent** of total impact ([HFT Book calibration walkthrough](https://hftradingbook.com/costs/estimating-impact); consistent with Almgren 2005's γ vs η magnitudes at typical participation). For a mean-cost calculator the split does not change the answer materially — both are costs to the seller — so v1 folds them into a single coefficient.

**Cost in bps.** With `σ_daily` in decimal terms, impact in bps is `10⁴ × Y × σ_daily × sqrt(Q/V)`. Example: σ = 2%/day, selling 10% of a day's volume: `10⁴ × 1.0 × 0.02 × √0.10 ≈ 63 bps` before spread — the right order of magnitude for a chunky institutional order in a mid-liquidity stock.

**Coefficient value.** Studies put Y between ~0.4 and ~1.4 depending on market, epoch and fitting choices; "0.5–1, order unity" is the honest summary (PRX 2011; Gatheral; practitioner discussions suggest conservative pre-trade tools sit near 1). Default 1.0 with a 0.5–1.5 exposed range is defensible and errs conservative.

## 3. A coherent closed-form 2-of-3 solver

**The key modelling decision** is how cost depends on the horizon T. Two candidate forms:

1. **Strict metaorder square-root law:** cost depends on total `Q/V` and is (approximately) *duration-independent*. Useless for a 2-of-3 solver — cost would not respond to T.
2. **Participation-rate form (practitioner pre-trade standard):** impact per day depends on the *daily clip's* participation. Executing uniformly over T days, the daily clip is `Q/T` and participation is `φ = Q/(T×EDV)`, giving `impact = k·σ·sqrt(φ)`. This is the structure of Barra/Kissell/Bloomberg-style pre-trade models and makes cost strictly decreasing in T — exactly what the solver needs.

The literature genuinely disagrees about duration-dependence (flagged in section E); v1 should use form 2 and say so in the explainer: it is what desks' pre-trade models do, and it nests the intuition "trade slower, pay less impact, but take longer".

### v1 formula set

Notation (all internal quantities in notional value):

| Symbol | Meaning | Notes |
|---|---|---|
| `Q` | liquidation volume (currency) | user input or solved |
| `T` | horizon (trading days) | user input or solved |
| `C` | mean cost (bps of traded value) | user input or solved |
| `ADV₀` | observed average daily volume | 20-day trailing |
| `m_v, m_s, m_σ` | scenario multipliers: volume, spread, volatility | defaults 1.0 |
| `EDV = m_v × ADV₀` | effective daily volume | the "ADV multiplier" knob |
| `s` | full bid–ask spread (bps); effective `s' = m_s × s` | half-spread = `s'/2` |
| `σ` | daily volatility (decimal); effective `σ' = m_σ × σ` | |
| `k` | impact coefficient | default 1.0 |
| `p` | maximum participation rate | default 0.20 |

**Cost model (mean, one-way, vs arrival mid):**

```
C(Q, T) = s'/2  +  10⁴ · k · σ' · sqrt( Q / (T · EDV) )
        = spread term + impact term,   with participation φ = Q / (T·EDV)
```

**The three permutations:**

1. **Given (Q, T) → C:** evaluate directly. Report `φ`; if `φ > p`, flag the schedule as exceeding the participation cap (infeasible or "stressed execution").

2. **Given (Q, C) → T:**

```
T = (10⁴ · k · σ')² · Q / ( EDV · (C − s'/2)² )        requires  C > s'/2
```

3. **Given (T, C) → Q:**

```
Q = T · EDV · ( (C − s'/2) / (10⁴ · k · σ') )²          requires  C > s'/2
```

**Feasibility conditions the UI must handle:**

- **Cost floor:** `C ≤ s'/2` is infeasible for solving T or Q — no horizon is long enough to beat the half-spread. As `C → s'/2⁺` the solved T diverges; cap displayed T (e.g. 250 days) and explain "your cost budget barely exceeds the half-spread, so the required horizon explodes".
- **Cost ceiling / participation cap:** you cannot trade faster than `φ = p`, so the fastest feasible horizon is `T_min = Q/(p × EDV)` and the highest *achievable* mean cost for that Q is `C_max = C(Q, T_min) = s'/2 + 10⁴·k·σ'·√p`. If the user's cost budget exceeds `C_max`, the honest answer is "you can finish in `T_min` days for less than your budget" — solve at the cap and say so, rather than returning a sub-day T that implies absurd participation.
- **Monotonicity (worth stating in the explainer):** for fixed Q, mean cost strictly decreases in T towards the half-spread asymptote; for fixed T, cost strictly increases in Q. Every 2-of-3 solve therefore has at most one solution in the feasible region — this is what makes the closed-form approach coherent.
- **Degenerate inputs:** `Q = 0`, `EDV = 0` (no volume data), `σ = 0` — guard and message.

## 4. The volatility term and forward-compatibility with percentiles

Mean cost is only half the story: a slow liquidation leaves the unsold remainder exposed to market moves. In Almgren–Chriss this is the **timing risk** (variance) term. For a uniform schedule liquidating Q over T days, remaining holdings decline linearly and the variance of the execution cost is:

```
Var[cost] = σ'² · Q² · T / 3      ⇒  std in bps of position ≈ 10⁴ · σ' · sqrt(T/3)
```

(the ∫₀ᵀ (1−t/T)² dt = T/3 factor for a linear trajectory; Almgren & Chriss 2000, [*Optimal Execution of Portfolio Transactions*](https://www.smallake.kr/wp-content/uploads/2016/03/optliq.pdf)). This is why regulators require stressed liquidity assumptions to interact with horizon: longer T means more opportunity cost risk, scaling like **σ·√T**.

**v1 stays mean-only** — timing risk has zero mean, so it does not enter the mean-cost formula at all. That is exactly what makes the design forward-compatible:

```
C_at_percentile_π(Q, T) = C_mean(Q, T) + z_π · 10⁴ · σ' · sqrt(T/3)
```

with `z_π` the normal quantile (1.645 at 95%). Bloomberg's LQA exposes the same idea as a "confidence level" input (e.g. 70th centile) ([LQA fact sheet](https://data.bloomberglp.com/professional/sites/10/LQA-Fact-Sheet.pdf)). One important consequence to plan for: with the risk term, cost-at-percentile is **U-shaped in T** (impact falls, risk rises), so the "given (Q, C) solve for T" inversion becomes a quadratic in √T with zero, one or two roots — the UI will need to present the fast root or the minimum-cost horizon. Mean-only v1 avoids this cleanly.

## 5. Almgren–Chriss: what to borrow, what to skip

Almgren & Chriss (2000) formalise liquidation as a mean–variance trade-off: minimise `E[cost] + λ·Var[cost]` over trading trajectories, with linear permanent and temporary impact. Output: a closed-form **efficient frontier** of expected cost vs cost variance; risk-averse traders front-load; λ→0 recovers the uniform (TWAP-like) schedule ([Wikipedia summary](https://en.wikipedia.org/wiki/Almgren%E2%80%93Chriss_model); original paper above).

**Why full A-C is overkill for v1:** it requires a risk-aversion parameter nobody can supply, calibrated linear impact coefficients, and produces hyperbolic-sine trajectories — none of which improve a transparency-first calculator whose users supply two of three top-level quantities. A subtle mismatch too: A-C temporary impact is *linear* in trade rate, while the empirical pre-trade consensus is concave (square-root-ish), so full A-C would be both more complex and less empirical.

**What to borrow:** (i) the temporary/permanent decomposition vocabulary; (ii) the uniform schedule as the risk-neutral optimum — which justifies v1's constant-participation assumption as "the λ→0 Almgren–Chriss strategy"; (iii) the σ√T timing-risk term for v2 percentiles; (iv) the framing that *there is no free lunch between impact and risk* — a nice explainer line, since the tool's own outputs demonstrate it.

## 6. Regulatory framing for explainers

**SEC Rule 22e-4 (US open-end funds).** Requires funds to classify every holding into four buckets by days-to-convert-to-cash *without significantly changing market value*, taking market depth into account: highly liquid (≤3 business days), moderately liquid (>3 to ≤7 calendar days), less liquid (sellable in ≤7 days but settling later), illiquid (>7 days) — with a 15% cap on illiquid assets and a highly-liquid investment minimum. This is a regulatory institutionalisation of exactly the "position ÷ (participation × ADV)" arithmetic the calculator performs ([rule text, 17 CFR 270.22e-4](https://www.law.cornell.edu/cfr/text/17/270.22e-4); [SEC adopting release 33-10233](https://www.sec.gov/files/rules/final/2016/33-10233.pdf)).

**ESMA liquidity stress testing guidelines (UCITS/AIFs).** ESMA's 2019 LST guidelines (applicable since 30 September 2020) name **liquidation cost** and **time to liquidity** as the two principal methods for simulating asset liquidity, and require stressed variants reflecting higher volatility, wider bid–ask spreads and lower market depth — precisely the tool's three scenario knobs. Liquidation cost is explicitly a function of asset type, horizon and trade size ([ESMA34-39-897](https://www.esma.europa.eu/sites/default/files/library/esma34-39-897_guidelines_on_liquidity_stress_testing_in_ucits_and_aifs_en.pdf)). The CSSF working paper cited in section 1 is a concrete supervisory implementation.

**Basel FRTB liquidity horizons.** The market-risk capital framework abandons the uniform 10-day horizon: risk factors are assigned liquidity horizons of **10, 20, 40, 60 or 120 days** (large-cap equity price 10d, small-cap 20d, IG corporate credit spread 40d, HY 60d, etc.), and expected shortfall is scaled across horizons with √(LH/10) factors ([BCBS MAR33; SAMA rulebook mirror of the tables](https://www.rulebook.sama.gov.sa/en/calculation-expected-shortfall)). Useful in explainers as regulator-endorsed evidence that (i) horizons differ by asset class and (ii) risk scales with √T.

## 7. Bond module specifics

**Why ADV is ill-defined for bonds.** Bonds trade OTC through dealers; there is no consolidated tape outside the US, and even US TRACE disseminates with volume caps and covers only TRACE-eligible securities. A typical corporate bond trades infrequently — zero-trading days are themselves a standard liquidity measure — so a 20-day volume average is noisy or undefined at the single-CUSIP level ([BIS Papers 102](https://www.bis.org/publ/bppdf/bispap102_e_rh.pdf); [IOSCO CR01/2016](https://www.iosco.org/library/pubdocs/pdf/IOSCOPD537.pdf)).

**Common measures/proxies** (each maps to a piece of our model):

- **Bid–ask spread** — direct input to the spread term; for unquoted bonds, estimated via **Roll's measure** (spread from serial covariance of price changes) or the Corwin–Schultz high–low estimator ([Fed FEDS 2008-40](https://www.federalreserve.gov/pubs/feds/2008/200840/index.html); Schestag/Schuster/Uhrig-Homburg, [*Measuring Liquidity in Bond Markets*](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2328370) find Roll and Corwin–Schultz among the best daily-data proxies).
- **Amihud measure** (|return|/volume) — a price-impact-per-unit-volume proxy, conceptually our `k·σ/√EDV`.
- **Turnover of issue size** (volume ÷ amount outstanding) — the standard quantity proxy, and the most practical way to *manufacture* a bond ADV: `ADV ≈ issue size × daily turnover rate`.
- **Barclays Liquidity Cost Score (LCS)** — bid–ask (as yield spread) × spread duration = round-trip cost as % of price, from dealer quotes. Benchmark magnitudes for USD IG credit: **~0.30–0.55% round-trip for large recent issues, up to ~1.2–1.4% for small/old issues** — i.e. one-way half-spread of roughly **15–70 bps** ([Barclays LCS factsheet](https://www.ib.barclays/content/dam/barclaysmicrosites/ibpublic/documents/investment-bank/QPS-factsheets/Barclays_QPS_LCS_factsheet_Aug-2017.pdf); [LCS In Brief](https://live.barcap.com/publiccp/RSR/nyfipubs/barcap-email-mkting/qps/LCS_In-brief.pdf) — note their explicit "one-way ≈ LCS/2" convention).

**Proxy-instrument approach (liquid ETF ADV + haircut).** Using a liquid proxy (e.g. LQD/HYG ADV, or index-level volume) scaled down and haircut is a legitimate simplification of what commercial models do — LQA-style models estimate per-bond depth from features (issue size, age, quotes, trades) when direct volume is missing; supervisory frameworks assign per-asset-category daily liquidation amounts (CSSF). Two defensible v1 recipes, in order of preference:

1. **Turnover recipe:** `bond ADV = issue size × turnover`, default turnover ~0.3%/day IG, ~0.5%/day HY (order-of-magnitude anchor: US corporate TRACE volume ≈ $35–40bn/day on ≈ $10tn outstanding ≈ 0.4%/day; flag as an estimate, expose as a parameter).
2. **Proxy recipe:** ETF/benchmark ADV × the bond's weight in the proxy × haircut.

**Haircut ranges.** Supervisory stress practice haircuts daily liquidation capacity by **30–50%** (CSSF uses 30% and 50%; BlackRock's stress illustration uses a 50% ADV drop). For the *structural* haircut of mapping proxy liquidity onto a single bond (before any stress), 50% is a sensible conservative default with a 30–70% exposed range. Keep the stress knob (ADV multiplier) separate from the structural haircut so the two are not conflated.

**Other bond defaults:** daily price volatility from duration × yield vol or historical prices (IG ~0.2–0.4%/day, HY ~0.3–0.6%/day in calm markets — expose, don't hardcode); participation rate as per equities (the CSSF applies 10/20/30% across asset categories including fixed income). Evidence for square-root impact is thinner in bonds than equities; keep k = 1 and flag the extra model uncertainty in the bond explainer.

## 8. TRS/CFD unwind mechanics

**How a TRS is exited.** Three routes: (i) **offsetting trade** — enter the mirror swap, leaving market-risk-flat but doubled notional and counterparty exposure until maturity/compression; (ii) **early termination** — agree an unwind price with the dealer: mid MTM adjusted by the dealer's bid–offer, plus any contractual breakage; (iii) **novation** — transfer the position to a third party with consent, at a negotiated transfer price ([Equicurious, *Terminating or Novating Swap Positions*](https://equicurious.com/learn/derivatives/swaps-and-otc-derivatives/terminating-or-novating-swap-positions); ISDA Master Agreement s.7 mechanics per [Risk.net chapter](https://www.risk.net/credit-default-swaps-the-vanilla-essence/7954663/novation-and-early-termination)).

**What drives unwind cost beyond underlier liquidity:**

- **Dealer hedge unwind = underlier liquidation.** The dealer hedging the TRS holds the underlier; terminating the swap forces them to sell it, and they charge that cost through. This is why the additive model "underlier liquidation cost + overlay" genuinely maps to reality.
- **Dealer repricing / bid–offer on the unwind:** typically **2–8 bps of notional** for vanilla swaps, wider for exotics/illiquid tenors (Equicurious).
- **Funding spread:** the financing leg (SOFR + spread) embeds the dealer's balance-sheet cost; typical equity TRS spreads run **30–50 bps p.a.** for top-tier clients, **60–100 bps** for smaller ones ([Equicurious, *Equity Swap Use Cases*](https://equicurious.com/learn/derivatives/swaps-and-otc-derivatives/equity-swap-use-cases-for-hedge-funds)). On unwind this matters two ways: accrued funding during the wind-down period, and — for term TRS — breakage compensating the dealer for the remaining-term funding commitment (contractual "Breakage Costs" clauses are standard; see e.g. [a filed TRS confirmation](https://www.sec.gov/Archives/edgar/data/1578348/000119312517352425/d494682dex104.htm)).
- **Break clauses / notice periods:** contracts may require notice before termination or restrict break dates; economically this adds fixed days to the horizon before liquidation can even start, plus collateral-settlement friction (1–5 days).

**v1 additive overlay** — defensible and transparent:

```
TRS horizon = notice period (days, default 0–5) + underlier horizon T
TRS cost    = underlier C(Q,T) + unwind/repricing fee (default 5 bps, range 2–10)
              + funding accrual = funding spread (bps p.a., default 40) × T/252
              [+ optional one-off breakage bps for term deals]
```

This mirrors practice because the dealer's quote to unwind is, to first order, exactly: their hedge liquidation cost, plus their bid–offer, plus funding/breakage. The explainer should note what it omits: collateral/margin dynamics, counterparty credit valuation effects, and consent risk on novation.

**CDO/structured credit (stub explainer).** Participation/ADV logic collapses entirely for structured credit: there is no volume concept, price discovery happens through dealer axes and BWIC (bids-wanted-in-competition) auctions, and in stress the market simply stops — 2007–08 saw secondary trading in ABS CDOs effectively cease and valuations forced from mark-to-market to mark-to-model ([BCBS, *Fair value measurement and modelling* (2008)](https://www.bis.org/publ/bcbs137.pdf); [Fed IFDP 1075, *Asymmetric Information and the Death of ABS CDOs*](https://www.federalreserve.gov/pubs/ifdp/2013/1075/ifdp1075.pdf)). The honest stub: "this tool's model does not apply; liquidity is episodic and dealer-dependent, and cost in stress is a price-level question, not a bps-of-mid question."

## 9. Bloomberg LQA (background only)

Publicly documented aspects of LQA — useful only as confirmation that our conceptual surface is the industry-standard one:

- It is exactly a **2-of-3 solver**: "you plug two of [volume, cost, time] into the model and it solves for the third" ([Bloomberg Insights interview](https://www.bloomberg.com/professional/insights/data/leveraging-machine-learning-to-bolster-liquidity-models/)).
- Its inputs are **market depth (expected daily volume), average transaction cost (bid–ask), and price volatility**, with stress applied as multipliers (fact-sheet example: depth ×0.75, cost ×1.25, volatility ×1.5) and a **confidence-level centile** — i.e. our three scenario knobs plus the v2 percentile ([LQA fact sheet](https://data.bloomberglp.com/professional/sites/10/LQA-Fact-Sheet.pdf)).
- Outputs include liquidation cost, liquidation horizon and regulatory mappings (SEC 22e-4 buckets, AIFMD). Under the hood it is a machine-learning system over ~150 features — which is precisely what our tool deliberately is not.

Do not treat any of this as a spec; the overlap simply shows the {volume, cost, time} + {depth, spread, vol} parameterisation is the conceptual ground a credible tool must cover.

---

## A. Recommended v1 formula set (summary)

```
Inputs per asset:   ADV₀, s (bps), σ (daily, decimal)
Scenario knobs:     m_v (ADV ×), m_s (spread ×), m_σ (vol ×)
Parameters:         k (impact coeff), p (max participation)

EDV  = m_v × ADV₀
s'   = m_s × s
σ'   = m_σ × σ
φ    = Q / (T × EDV)                          (participation implied by a schedule)

MEAN COST:      C(Q,T) = s'/2 + 10⁴·k·σ'·√φ
SOLVE T:        T = (10⁴·k·σ')²·Q / (EDV·(C − s'/2)²)         [needs C > s'/2]
SOLVE Q:        Q = T·EDV·((C − s'/2)/(10⁴·k·σ'))²            [needs C > s'/2]
SPEED LIMIT:    T_min = Q/(p·EDV);  C_max = s'/2 + 10⁴·k·σ'·√p
FEASIBLE COST:  s'/2 < C ≤ C_max   (else: floor/ceiling messages per §3)

v2 (percentile): C_π = C + z_π·10⁴·σ'·√(T/3)   → quadratic in √T when inverting
```

## B. Recommended defaults

| Parameter | Default | Range exposed | Source/rationale |
|---|---|---|---|
| Participation rate `p` | 20% | 10–30% | CSSF LST framework (20% base, 10/30 sensitivities); 15% Confluence; 5–25% Kissell-style capacity practice |
| Impact coefficient `k` | 1.0 | 0.5–1.5 | "Order unity" (Tóth/Bouchaud PRX 2011); Almgren 2005 η=0.142 in its own normalisation implies effective desk-level constants below 1; conservative tools sit near 1 |
| ADV window | 20 trading days | 20–30 | Equity market convention |
| Equity spread `s` | 5 bps (large cap) / 25 bps (small cap) | 2–100 | Order-of-magnitude from quoted markets; Almgren 2005 sample mean 14 bps (2001–03 large caps) |
| Equity daily vol `σ` | 2% | 0.5–5% | Typical single-stock daily vol |
| Bond turnover (ADV recipe) | 0.3%/day IG, 0.5%/day HY | 0.1–1% | TRACE aggregate volume ÷ outstanding ≈ 0.4%/day (estimate — flag) |
| Bond proxy haircut | 50% | 30–70% | CSSF stress haircuts 30/50%; BlackRock 50% ADV stress |
| Bond spread (one-way) | 25 bps IG / 60 bps HY | 10–150 | LCS/2: USD IG round-trip 0.30–1.41% by size/age |
| TRS unwind fee | 5 bps of notional | 2–10 | Vanilla swap unwind bid–offer 2–8 bps |
| TRS funding spread | 40 bps p.a. | 20–100 | Equity TRS 30–50 bps top-tier, 60–100 smaller clients |
| TRS notice period | 0 days | 0–10 | Contract-dependent break/notice clauses |
| Scenario knob ranges | ×1.0 each | ADV 0.25–1; spread 1–3; vol 1–3 | LQA stress example: depth ×0.75, cost ×1.25, vol ×1.5; CSSF 30–50% depth haircuts |

## C. Per-asset-module adjustments

**Equity:** the base model as-is. Shares↔notional conversion at UI layer; consolidated ADV with primary-vs-consolidated caveat; spread and vol from market data or the defaults above.

**Bond:** replace observed ADV with a manufactured one — turnover recipe (`issue size × turnover`) preferred, proxy-ETF recipe (weight × haircut) as alternative; spreads from LCS-magnitude defaults; lower vol; identical solver. Explainer must say the volume input is a *proxy*, and that single-bond liquidity is regime-dependent (zero-trading-days phenomenon).

**TRS:** resolve to the underlier module for `C(Q,T)` and `T`, then apply the additive overlay (notice days on the horizon; unwind fee + funding accrual on the cost). Show the overlay line items separately — transparency is the product's differentiator. CDO stub: explainer-only, no calculation (section 8).

## D. Strongest citations for in-app explainers

1. **Almgren & Chriss (2000)**, *Optimal Execution of Portfolio Transactions*, J. Risk 3(2) — impact-vs-timing-risk trade-off, temporary/permanent impact, σ√T risk.
2. **Almgren, Thum, Hauptmann & Li (2005)**, [*Direct Estimation of Equity Market Impact*](https://www.cis.upenn.edu/~mkearns/finread/costestim.pdf) — empirical power laws and coefficients from 700k real orders.
3. **Tóth, Lempérière, Deremble, de Lataillade, Kockelkoren & Bouchaud (2011)**, [*Anomalous Price Impact and the Critical Nature of Liquidity*](https://journals.aps.org/prx/abstract/10.1103/PhysRevX.1.021006), Phys. Rev. X — the square-root law's universality, Y of order one.
4. **Bangia, Diebold, Schuermann & Stroughair (1999)**, [*Modeling Liquidity Risk*](https://archive.nyu.edu/bitstream/2451/27135/2/wpa99062.pdf) — half-spread as the exogenous liquidity cost floor.
5. **CSSF working paper**, [*Liquidity Stress Test for LU investment funds — the TTL approach*](https://www.cssf.lu/wp-content/uploads/Liquidity_Stress_Test_for_LU_investment_funds_-_the_time_to_liquidation_approach.pdf) — regulator using exactly participation × ADV with 10/20/30% rates and 30/50% haircuts.
6. **SEC Rule 22e-4** ([17 CFR 270.22e-4](https://www.law.cornell.edu/cfr/text/17/270.22e-4)) — days-to-cash bucket definitions.
7. **ESMA (2019)**, [*Guidelines on liquidity stress testing in UCITS and AIFs*](https://www.esma.europa.eu/sites/default/files/library/esma34-39-897_guidelines_on_liquidity_stress_testing_in_ucits_and_aifs_en.pdf) — liquidation cost & time-to-liquidity as the two canonical methods.
8. **BCBS FRTB** (MAR33 liquidity horizons; e.g. [rulebook tables](https://www.rulebook.sama.gov.sa/en/calculation-expected-shortfall)) — 10/20/40/60/120-day horizons by risk factor.
9. **Schestag, Schuster & Uhrig-Homburg (2016)**, [*Measuring Liquidity in Bond Markets*](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2328370), RFS — comparison of bond liquidity proxies (Roll, Corwin–Schultz, Amihud et al.).
10. **Barclays LCS** ([factsheet](https://www.ib.barclays/content/dam/barclaysmicrosites/ibpublic/documents/investment-bank/QPS-factsheets/Barclays_QPS_LCS_factsheet_Aug-2017.pdf) / [In Brief](https://live.barcap.com/publiccp/RSR/nyfipubs/barcap-email-mkting/qps/LCS_In-brief.pdf)) — bond round-trip cost magnitudes.
11. **IMF WP/17/226**, [*Liquidity Stress Tests for Investment Funds: A Practical Guide*](https://www.imf.org/-/media/Files/Publications/WP/2017/wp17226.ashx) — pro-rata vs waterfall liquidation.
12. **Kissell & Glantz**, *Optimal Trading Strategies* (I-star model) — the practitioner participation-rate impact formulation.
13. **Gatheral**, [*Optimal order execution* lecture notes](http://mathfinance.sns.it/wp-content/uploads/2010/12/Gatheral_Optim_Exec.pdf) — history of σ√(Q/V) in commercial pre-trade tools (Barra, Salomon, Bloomberg TCA).
14. **BCBS (2008)**, [*Fair value measurement and modelling*](https://www.bis.org/publ/bcbs137.pdf) — structured credit liquidity evaporation (CDO stub).

## E. Where the literature disagrees (flag in explainers)

1. **Impact exponent.** The square-root (½) exponent is a stylised fact, but fitted exponents span 0.4–0.7; Almgren 2005 statistically rejects ½ for temporary impact in favour of 3/5. v1 uses ½ for transparency — say so.
2. **Duration dependence.** The strict metaorder square-root law finds impact depends mainly on total Q/V, weakly on execution speed; participation-rate pre-trade models (Barra/Kissell, and this tool) make cost speed-dependent. The solver requires the latter; the tension is real and worth an honest footnote.
3. **Coefficient Y.** "Order unity" hides a factor-of-3 spread across studies, markets and fitting conventions. Hence the exposed 0.5–1.5 range rather than a false-precision default.
4. **Temporary/permanent split.** Rules of thumb (~⅔/⅓) exist but estimates are noisy (R² < 1% in Almgren 2005's permanent regression); v1's single-coefficient treatment is no less defensible than any particular split.
5. **Waterfall vs pro-rata.** Empirical evidence on how funds actually liquidate in stress is mixed (IMF WP/17/226 cites studies on both sides). Not load-bearing for a single-asset tool.
6. **Bond turnover default.** The 0.3–0.5%/day figures are aggregate-level estimates, not per-bond truths; single-issue turnover varies by orders of magnitude with age and size (LCS tables). Expose the parameter and label it an estimate.
