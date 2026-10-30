# Court Board

Public signup lab for a recurring club session (first Club: a workplace badminton club). Replaces the WhatsApp “comment your name” thread, the hand-built list, and the naughty-list spreadsheet with one page per Session whose order is computed from the club’s rules. Lives under `/labs/court-board`. **Unlike other Labs, Players use it without Sign-in**; see [ADR 0013](../adr/0013-court-board-public-lab.md). The Site Admin may create Clubs; day-to-day running belongs to Organisers.

Court Board runs on trust: Players say who they are and what Tier they are, and Organisers correct the rare mistake. Fees and payments are out of scope: committee members arrange them individually.

## Language

### People

**Player**:
A person who takes a place at a Session. Identified by phone number in any country, normalised to international E.164 form (stored only as a keyed hash), protected by a PIN, and shown by display name. Has no account.
_Avoid_: user, member, Site Admin, attendee (use Attended for the fact)

**PIN**:
A 6-digit number a Player chooses the first time their phone number takes a Seat. Phone number + PIN is what lets a Player take further Seats, cancel, or change their name or Tier, from any device. Wrong attempts lock out the device trying, not the Player. Only an Organiser can reset it; the Player then chooses a new one on their next action.
_Avoid_: password, passcode, login, device token

**Organiser**:
A committee member who runs a Club. Holds the Organiser link; is not a Site Admin and does not use Sign-in.
_Avoid_: admin (unqualified), owner, committee (as the model name)

**Organiser link**:
A secret, unguessable URL that grants Organiser rights for one Club. Stored only as a hash; can be rotated, which invalidates the old link.
_Avoid_: admin password, login, shared account

**Tier**:
A Player’s standing in the Club: **Employee**, **Alumni**, or **External**. **Self-declared** when taking a Seat; the lab remembers a Player’s last choice and prefills it next time. An Organiser may correct a Seat’s Tier. Sets the Priority band only.
_Avoid_: status, role, `*` / `**`, roster, verified tier

### Sessions

**Club**:
A group that runs Sessions under one rule set: default Capacity, venue and start time; Release (Thu 12:00); Top-up (Fri 12:00); Cutoff (24 h before start); Grace period (2 h); Penalty lengths. All times are Europe/London wall-clock times.
_Avoid_: group chat, team, organisation

**Session**:
One dated booking of the venue (e.g. Saturday, 9–11am, at the club’s venue) with a Capacity. Has one public Signup link. An Organiser creates the next Session by **copying the last one**: day, time, venue and Capacity are prefilled one week on, then adjusted and opened. An Organiser can also cancel a Session (no Penalties arise from it).
_Avoid_: event, game, slot

**Signup link**:
The public URL for a Session, posted in the WhatsApp group. Anyone with it can view the Order and take a Seat.
_Avoid_: invite, form

**Seat**:
One place in a Session’s Order. Either a **Host seat** (the Player themself: phone number, name, Tier) or a **Guest seat** attached to a Host seat. Has a signup time, and after the Session an Attended mark.
_Avoid_: booking, registration, entry

**Guest seat**:
A Seat a Player takes for someone else (“+1”). Requires a name and a Tier of **Alumni** or **External**, never Employee (an Employee signs up as themselves). The guest is not a Player: no phone number, no Penalty. Before Top-up a Player may hold **at most two** Guest seats per Session; from Top-up, any number. Guests are always entered on the Host’s own booking, never as free-standing names, so Organisers can see who brought whom. A Guest seat needs its Host seat in the same Session and never ranks ahead of it: if the Host is waiting, so is the guest. Cancelling a Host seat cancels its Guest seats.
_Avoid_: plus-one (as the model name), guest Player, guest account

**Capacity**:
The number of places on the Main list for a Session (25 today).
_Avoid_: max players, courts (courts × players is the Organiser’s arithmetic, not the model)

### Order

**Order**:
The computed arrangement of a Session’s Seats into the Main list and Waitlists. A pure function of Seats, Penalties, Club rules and the current time. Never stored and never edited by hand; Organisers change inputs (a Seat’s Tier, a Penalty), not the Order.
_Avoid_: the list (ambiguous), ranking, manual list

**Priority band**:
Employee, then Alumni, then External. A Seat’s band is its Tier, except that a Penalised Player’s Host seat sits in the External band.
_Avoid_: priority level, queue

**Main list**:
The first Capacity Seats in the Order: the people who play.
_Avoid_: session list, confirmed list

**Waitlist**:
Seats beyond the Main list. Before Release there is one Waitlist per Priority band; after Release, one combined Waitlist.
_Avoid_: reserve, bench

**Release**:
The moment (Thursday 12:00 by default) when Waitlists merge into the Main list. Before Release, only Employee-band Seats can be on the Main list, ordered by signup time. At Release, open places fill from the Employee, then Alumni, then External Waitlists, each in signup order. Seats taken after Release join the end in signup order, whatever the band.
_Avoid_: unlock, merge time, “the one-hour list” (the live Order replaces the hand-posted list an hour after the announcement)

**Top-up**:
The moment (Friday 12:00 by default, after Release) from which a Player may add more than two Guest seats to fill remaining places. Changes only the guest limit, not the Order rules.
_Avoid_: free-for-all, open signups

**Promotion**:
When a Seat leaves, the next eligible Seat moves up. Before Release only Employee-band Seats are eligible for the Main list. A derived effect of the Order, not an action.
_Avoid_: manual move, swap

### Conduct

**Cutoff**:
The latest time a Seat can be cancelled without a Penalty: 24 hours of wall-clock time before the Session starts (Friday 9am for a Saturday 9am Session, including across a clock change).
_Avoid_: deadline (unqualified), notice period

**Grace period**:
2 hours from the moment a Seat reaches the Main list, when that moment is after the Cutoff. During it the Seat can be cancelled without a Penalty. Lets someone moved up from a Waitlist late decline the place.
_Avoid_: amnesty, cooling-off

**Attended**:
The Organiser’s mark, per Seat, after a Session. An unmarked Seat on the Main list after the Organiser closes the register is a **No-show**.
_Avoid_: register (as the model name), check-in (v1 has no self check-in)

**Penalty**:
A dated period during which a Player’s Host seats sit in the External band (“naughty list”). Measured in calendar weeks from the Session date. Derived from Club rules when a Main-list Seat is cancelled after the Cutoff and outside any Grace period (3 weeks), a Host seat is a No-show (4 weeks), a Host seat and its Guest seat are both No-shows (6 weeks), or a Guest seat alone is a No-show (2 weeks); the Penalty lands on the Host. Leaving a Waitlist is always free. An Organiser may clear or shorten a Penalty. Overlapping Penalties do not add up; the latest end date wins.
_Avoid_: strike, ban, naughty list (as the model name), points

## Out of scope

- **Fees and payments.** No amounts, Paid marks or payment links; committee members arrange money individually.
- **Tier verification.** No roster, SMS codes or email checks; trust plus Organiser correction.

## Relationships

- **Site → Court Board**: The Site Admin may create a Club and hand its Organiser link to the committee. Court Board does not use Sign-in for Players or Organisers.
- **Court Board ↛ Site Content**: Court Board does not publish to the public blog/portfolio; the Labs index entry is the only Site-owned copy.
- **Court Board ↛ Job OS / WMW**: No shared domain or data.

## Decided (30 Oct)

- Penalty weeks are calendar weeks.
- Leaving a Waitlist after the Cutoff is free; only Main-list Seats can be penalised.
- Release stays Thursday 12:00. Top-up (unlimited guests) opens Friday 12:00, and guests still go on the Host’s booking.
- A Seat promoted after the Cutoff gets a 2-hour Grace period.
- Sessions are created by copying the last one.

## Flagged ambiguities

- Today a Player can list a guest without signing up themselves. Under this design a Guest seat cannot exist without its Host seat.

## Worked example

Capacity 25; 22 Employee Seats on the Main list; Alumni waitlist A1, A2; External waitlist G1 (guest of a Main-list Player), G2 (guest of a Penalised Player, Alumni Tier), G3, G4. At Release the 3 open places go to A1, A2, then G1. G2 is Alumni band but waits behind its Host, who sits in the External band. G3 and G4 stay waiting.
