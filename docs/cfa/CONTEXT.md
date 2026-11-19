# CFA Lab

Private practice bank for the **Site Admin**’s CFA Level I study (see [Site context](../site/CONTEXT.md)). The Site Admin turns screenshots of practice questions from their study materials into Questions, practises them by exam weight, and reviews mistakes on a schedule. Lives at `/labs/cfa`. Sign-in is site-wide; the Lab does not own auth or Admin. Question content and screenshots live only in private, sign-in-only storage, never in this repo ([ADR 0014](../adr/0014-cfa-question-content-private-storage.md)). Infra and deploy: [infra.md](./infra.md).

## Language

### Syllabus

**Module**:
One of the ten Level I topic areas (e.g. Quantitative Methods, Fixed Income), each with a published exam weight range for the exam year. The grain for exam weights, bank counts and accuracy. Listed with its Readings in `src/data/pages/cfa.json`.
_Avoid_: topic (the exam body’s word; fine in conversation, not as the model name), subject, section

**Reading**:
A learning module within a Module, as titled in the curriculum for the exam year. Every Question belongs to exactly one Reading.
_Avoid_: chapter, lesson, learning module (as the model name), session

**LOS**:
Optional: the learning outcome a Question tests, as free text the Site Admin types (Extraction does not suggest one). Grouped case- and spacing-insensitively within a Module for “weakest LOS”; Questions without an LOS are left out of it.
_Avoid_: objective, outcome code, treating LOS as a fixed vocabulary or a required field

**Exam weight**:
The published percentage range for a Module (e.g. 11–14%). Mixed Sets use the midpoint.
_Avoid_: importance, priority

### Bank

**Question**:
One multiple-choice item with a stem, exactly three options (A, B, C), a confirmed answer, and optional explanation, calculator keystrokes and LOS. The stem never starts with the question’s number from the screenshot (`1.`, `Question 3:`); Extraction, Paste JSON and saving all drop it. Stem, options and explanation are Markdown with KaTeX maths and Markdown tables. Keeps the Capture’s screenshots for reference. Editing never resets its history: Attempts and review state are keyed by Question id.
_Avoid_: item, card, problem, storing question text anywhere but Amplify Data

**Capture**:
Turning one or more screenshots of a practice question from the Site Admin’s study materials into a Question: choose Module and Reading (the last choice is the default), upload or paste the screenshots, run Extraction, review, confirm the answer, save. Several screenshots are one Question unless they clearly hold separate Questions.
_Avoid_: import (that is Paste JSON), scan, upload (only one step of a Capture)

**Extraction**:
The vision-model step of a Capture that reads the screenshots and returns structured JSON: stem, options A/B/C, the answer only if it is visible, the explanation only if it is visible, and calculator keystrokes only if shown. Runs in the `cfa-assist` function through Bedrock; the output is always reviewed before saving.
_Avoid_: OCR (it does more), parsing, trusting an extracted answer without confirmation

**Answer confirmation**:
The Site Admin’s explicit check that the chosen answer is correct. Required before any Question is saved; changing the answer clears it.
_Avoid_: auto-accepting the extracted answer

**AI-drafted explanation**:
An explanation the model wrote for the confirmed answer when none was visible in the screenshots. Badged “AI-drafted” until the Site Admin unticks it after checking.
_Avoid_: presenting a drafted explanation as transcribed

**Paste JSON**:
Bulk-adding Questions in the same JSON schema as Extraction, with optional Module, Reading, LOS and source per item. Every item needs three options and an answer; the Site Admin confirms the answers for the batch.
_Avoid_: Capture (no screenshots), sync

**Near-duplicate**:
A Question whose stem has at least 80% word-bigram overlap with another Question’s stem after maths and Markdown are stripped. A warning only; saving is still allowed.
_Avoid_: blocking saves, exact-match-only checks

**Flag**:
A note that a Question’s Extraction or answer looks wrong, raised while practising or reviewing, and resolved from the Question page.
_Avoid_: report, bug

**Source**:
Free text the Site Admin types at Capture to say where a Question came from; remembered between Captures. No default in code.
_Avoid_: hard-coding any source name in the repo

### Practice

**Attempt**:
One answer to one Question: chosen option (empty if a timed Set ended first), correct or not, seconds taken, mode, Set id and time. Attempts are kept when a Question is deleted; they then count towards “answered” but not towards Module or LOS accuracy.
_Avoid_: answer (ambiguous with the correct answer), response, score

**Set**:
The Questions served in one sitting. Built from a scope (Module, Reading or LOS) or mixed across Modules weighted by exam weight; least-attempted Questions are served first. Practice Sets give feedback after each Question; Timed Sets run at exam pace (90 seconds per Question on average) with feedback only at the end and a review screen after.
_Avoid_: quiz, test, session (see capture session)

**Mistakes deck**:
Questions answered wrong, brought back on a Leitner schedule. A wrong answer puts a Question in box 1, due the next day; each correct answer when due moves it up a box (3, 7, 14, then 30 days); any wrong answer sends it back to box 1. Correct answers before the due day change nothing. “Due today” counts Questions whose due day has started.
_Avoid_: spaced repetition as an algorithm name (it is Leitner), SM-2, review queue

**Capture session**:
The newest run of Questions added less than 90 minutes apart. Served as “Review what I just added”. Derived from creation times, so it is the same on every device.
_Avoid_: per-device “recent” lists
