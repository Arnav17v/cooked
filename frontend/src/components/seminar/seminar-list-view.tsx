import Link from "next/link";

import type { SeminarSessionDto } from "@/lib/api";
import {
  formatSeminarDateRange,
  groupSeminarsByMonth,
  seminarInitial,
  seminarListIconBg,
  seminarLocationShort,
  seminarMetaLine,
} from "@/lib/seminar-utils";

type Props = {
  sessions: SeminarSessionDto[];
};

export function SeminarListView({ sessions }: Props) {
  const monthGroups = groupSeminarsByMonth(sessions);
  const liveCount = sessions.filter((s) => s.status === "live").length;

  return (
    <div className="seminar-luma">
      <div className="landing-page seminar-luma-hub">
        <header className="seminar-luma-hub-hero">
          <div className="seminar-luma-hub-hero-copy">
            <h1 className="seminar-luma-hub-title">Seminars</h1>
            <div className="seminar-luma-hub-stats">
              <span>
                <span className="seminar-luma-stat-icon" aria-hidden>
                  ◷
                </span>
                {sessions.length} upcoming
              </span>
              <span>
                <span className="seminar-luma-stat-icon" aria-hidden>
                  ◉
                </span>
                {liveCount} live now
              </span>
            </div>
            <p className="seminar-luma-hub-tagline">
              Small batches with real engineers. Resume roasts, interview prep, live Q&amp;A.
            </p>
            <p className="seminar-luma-hub-desc">
              Pick a session, see the host, venue, and reserve your seat in one click.
            </p>
          </div>
          <div className="seminar-luma-hub-visual" aria-hidden>
            <div className="seminar-luma-hub-visual-inner">
              <p className="seminar-luma-hub-visual-kicker">Live</p>
              <p className="seminar-luma-hub-visual-title">Engineer-led</p>
              <p className="seminar-luma-hub-visual-tags">RESUME · INTERVIEW · Q&amp;A</p>
            </div>
          </div>
        </header>

        <section className="seminar-luma-list-section" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="seminar-luma-list-heading">
            Upcoming seminars
          </h2>

          {monthGroups.length === 0 ? (
            <section className="seminar-empty-state">
              <p className="landing-section-eyebrow">Seminars</p>
              <h2 className="seminar-luma-list-heading">Next session coming soon</h2>
              <p className="seminar-luma-detail-desc">
                We&apos;re lining up the next batch. Check back soon or follow the Seminar tab.
              </p>
            </section>
          ) : (
            monthGroups.map((group) => (
              <div key={group.monthKey} className="seminar-luma-month">
                <div className="seminar-luma-month-label">
                  <span className="seminar-luma-month-pill" aria-hidden />
                  <span>{group.monthLabel}</span>
                </div>
                <ul className="seminar-luma-event-rows">
                  {group.events.map((s) => (
                    <li key={s.id}>
                      <Link href={`/seminar/${s.id}`} className="seminar-luma-event-row">
                        <span
                          className="seminar-luma-event-icon"
                          style={{ backgroundColor: seminarListIconBg(s.title) }}
                        >
                          {seminarInitial(s.title)}
                        </span>
                        <span className="seminar-luma-event-main">
                          <span className="seminar-luma-event-title">{s.title}</span>
                          <span className="seminar-luma-event-meta">{seminarMetaLine(s)}</span>
                        </span>
                        <span className="seminar-luma-event-location">
                          {seminarLocationShort(s.venue)}
                        </span>
                        <span className="seminar-luma-event-date">
                          {formatSeminarDateRange(s.date_time)}
                          <span className="seminar-luma-event-arrow" aria-hidden>
                            →
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>

      <footer className="landing-bottom-bar">
        <span>
          Get Uncooked · <Link href="/">Home</Link>
        </span>
        <span>Pay on Razorpay · seats are limited per batch</span>
        <span className="landing-bottom-accent">{"// seminars"}</span>
      </footer>
    </div>
  );
}
