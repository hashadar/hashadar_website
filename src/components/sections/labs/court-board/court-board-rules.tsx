import Link from 'next/link';
import { Container, Heading, Section, Text } from '@/components/ui';
import { courtBoard } from '@/data';
import type { CourtBoardLegalSection, CourtBoardPluralUnit } from '@/data/types';
import type { RulesView } from '@/lib/court-board/rules-view';
import { PRIVACY_PATH, sessionPath } from './court-board-links';
import { fillTemplate } from './fill-template';

const plural = (unit: CourtBoardPluralUnit, count: number) =>
  count === 1 ? unit.one : unit.other;

const counted = (unit: CourtBoardPluralUnit, count: number) =>
  `${count} ${plural(unit, count)}`;

function RuleSection({ section, values }: { section: CourtBoardLegalSection; values: Record<string, string | number> }) {
  return (
    <section className="space-y-3">
      <Heading as="h2" size="md">
        {section.heading}
      </Heading>
      {section.paragraphs.map((paragraph) => (
        <Text key={paragraph} size="sm" className="max-w-[38rem]">
          {fillTemplate(paragraph, values)}
        </Text>
      ))}
    </section>
  );
}

export interface CourtBoardRulesProps {
  view: RulesView;
  sessionId: string;
}

/** The public Club rules, written from the Club's own settings. */
export function CourtBoardRules({ view, sessionId }: CourtBoardRulesProps) {
  const copy = courtBoard.rules;
  const { units } = copy;

  const guestLimit = counted(units.guest, view.guestLimitBeforeTopUp);
  const grace =
    view.grace.unit === 'hour'
      ? counted(units.hour, view.grace.amount)
      : counted(units.minute, view.grace.amount);
  const cutoffDays = fillTemplate(plural(copy.cutoffDays, view.cutoffDaysBefore), {
    count: view.cutoffDaysBefore,
  });
  const weeks = (n: number) => counted(units.week, n);

  const holdItems = [
    fillTemplate(copy.holds.itemLateCancel, { weeks: weeks(view.penaltyWeeks.lateCancel) }),
    fillTemplate(copy.holds.itemNoShowHost, { weeks: weeks(view.penaltyWeeks.noShowHost) }),
    fillTemplate(copy.holds.itemNoShowHostAndGuest, {
      weeks: weeks(view.penaltyWeeks.noShowHostAndGuest),
    }),
    fillTemplate(copy.holds.itemNoShowGuest, { weeks: weeks(view.penaltyWeeks.noShowGuest) }),
    ...(view.guestLateCancelWeeks > 0
      ? [
          fillTemplate(copy.holds.itemGuestLateCancel, {
            weeks: weeks(view.guestLateCancelWeeks),
          }),
        ]
      : []),
  ];

  return (
    <Section spacing="sm" className="bg-[var(--cream)]">
      <Container size="sm" className="space-y-10">
        <header className="space-y-3">
          <Text variant="accent" size="xs" className="uppercase tracking-[0.2em]">
            {view.clubName}
          </Text>
          <Heading as="h1" size="lg" className="font-semibold tracking-[-0.04em]" style={{ lineHeight: 1 }}>
            {copy.heading}
          </Heading>
          <Text variant="muted" size="sm" className="max-w-[38rem]">
            {fillTemplate(copy.lede, { club: view.clubName, venue: view.venue })}
          </Text>
        </header>

        <RuleSection section={copy.tiers} values={{}} />
        <RuleSection
          section={copy.release}
          values={{ weekday: view.release.weekday, time: view.release.time }}
        />
        <RuleSection
          section={copy.topUp}
          values={{
            weekday: view.topUp.weekday,
            time: view.topUp.time,
            limit: guestLimit,
          }}
        />
        <RuleSection section={copy.guests} values={{ limit: guestLimit }} />
        <RuleSection section={copy.cancelling} values={{ cutoffDays, grace }} />

        <section className="space-y-3">
          <Heading as="h2" size="md">
            {copy.holds.heading}
          </Heading>
          <Text size="sm" className="max-w-[38rem]">
            {copy.holds.intro}
          </Text>
          <ul className="list-disc space-y-1 pl-5 font-body text-sm">
            {holdItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Text size="sm" className="max-w-[38rem]">
            {copy.holds.lengthNote}
          </Text>
          <Text size="sm" className="max-w-[38rem]">
            {copy.holds.organiserNote}
          </Text>
        </section>

        <RuleSection section={copy.privateHolds} values={{}} />
        <RuleSection section={copy.fees} values={{}} />

        <footer className="space-y-3 border-t border-[var(--border)] pt-6">
          <Text size="sm">
            {copy.privacyBefore}
            <Link href={PRIVACY_PATH} className="underline underline-offset-2">
              {copy.privacyLinkLabel}
            </Link>
            {copy.privacyAfter}
          </Text>
          <Link
            href={sessionPath(sessionId)}
            className="inline-flex min-h-11 items-center font-body text-sm font-medium underline underline-offset-2"
          >
            {copy.backToSession}
          </Link>
        </footer>
      </Container>
    </Section>
  );
}
