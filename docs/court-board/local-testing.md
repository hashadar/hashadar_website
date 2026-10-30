# Testing Court Board locally

No AWS needed. With neither `COURT_BOARD_TABLE` nor `COURT_BOARD_PEPPER` set, `npm run dev` runs Court Board on an **in-memory store** seeded with a demo Club. Data lives in the Node process: it survives hot reloads and is gone when you stop the server (or press **Reset demo data**).

```bash
npm run dev
# open http://localhost:3000/labs/court-board
```

The landing page shows a **Local demo** panel (development only; it never renders in production or against a real table):

- **Open the demo Session**: the public Player page.
- **Open as Organiser**: exchanges the demo token for the Organiser cookie, then redirects to `/labs/court-board/o`.
- **Demo Player**: Sam, `07400 123456`, PIN `482916`. Use these in *Manage my place*.
- **Clock controls**: jump "now" to the interesting moments of the demo Session so you do not wait for Thursday.

The demo Session has 8 places: six Employees plus Sam (with an Alumni guest) fill the Main list before Release, with Alix (Alumni) and Eddie (External) waiting.

## A walkthrough

1. **Before Release** (default preset): Alix and Eddie sit on their own Waitlists; only Employee-band Seats can be on the Main list.
2. **Just after Release**: the open place goes to Alix; Sam's Alumni guest waits behind Eddie only if there is room, and never ahead of Sam.
3. Sign up as someone new on the Session page. Try a second signup with the same number (refused), `0044…` and `+44…` forms of the same number (same Player), a trivial PIN such as `123456` (refused), and three guests before Top-up (refused).
4. **An hour before the Cutoff**: in *Manage my place* as Sam, cancelling is free.
5. **An hour after the Cutoff**: cancelling a Main-list Seat now says it puts you on hold for 3 weeks. Cancel a *Waitlist* Seat instead and it stays free. After a Main-list cancellation, the next person up gets a 2-hour Grace period (shown in their own *Manage my place*).
6. **Half an hour into the Session**, as Organiser: tick *Here*, leave some unticked, press **Close register**, read the preview, confirm. The *On hold* tab now lists the Penalties; create a **New session** by copying this one and see the hold apply (as "On hold until…") when those Players sign up.
7. Try **Reset a PIN**, **Clear** / **Shorten** a hold, **Remove** a Seat (never a Penalty), **Copy list for WhatsApp**, **Rotate organiser link** (the old link stops working).
8. Wrong PINs: five wrong guesses from this browser lock it out of that number for 15 minutes. The clock presets move that along too.

## Tests

```bash
npx vitest run src/lib/court-board          # rules, store, services
npx vitest run src/components/sections/labs/court-board
```

The service tests (`player-service.test.ts`, `organiser-service.test.ts`) run the whole flow, lockout and Penalty paths against the same in-memory store the demo uses.

## Against real DynamoDB

See [infra.md](./infra.md). The DynamoDB store has only been tested against a recording fake; run a full Session in `npx ampx sandbox` before the first real one.
