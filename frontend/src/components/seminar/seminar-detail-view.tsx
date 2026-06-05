import Link from "next/link";

import type { SeminarSessionDto } from "@/lib/api";
import {
  formatPriceInr,
  formatSeminarDateTime,
  seminarInitial,
  seminarListIconBg,
  seminarLocationShort,
} from "@/lib/seminar-utils";

type Props = {
  seminar: SeminarSessionDto;
};

function statusBadge(status: SeminarSessionDto["status"], spots: number) {
  if (status === "full" || spots === 0) return "Sold out";
  if (status === "completed") return "Ended";
  if (spots < 5) return `${spots} spots left`;
  return null;
}

export function SeminarDetailView({ seminar }: Props) {
  const badge = statusBadge(seminar.status, seminar.spots_remaining);
  const canPay =
    seminar.status === "live" && seminar.spots_remaining > 0 && seminar.razorpay_link;

  return (
    <div className="seminar-luma">
      <div className="landing-page seminar-luma-detail">
        <Link href="/seminar" className="seminar-luma-back">
          ← All seminars
        </Link>

        <header className="seminar-luma-detail-header">
          <div className="seminar-luma-detail-header-main">
            <span
              className="seminar-luma-detail-icon"
              style={{ backgroundColor: seminarListIconBg(seminar.title) }}
            >
              {seminarInitial(seminar.title)}
            </span>
            <div>
              <h1 className="seminar-luma-detail-title">{seminar.title}</h1>
              <p className="seminar-luma-detail-sub">
                {seminarLocationShort(seminar.venue)} — {formatSeminarDateTime(seminar.date_time)}
              </p>
              {seminar.tags[0] ? (
                <p className="seminar-luma-detail-featured">Featured in {seminar.tags[0]}</p>
              ) : null}
              <p className="seminar-luma-detail-desc">{seminar.description}</p>
            </div>
          </div>
          {canPay ? (
            <a
              href={seminar.razorpay_link}
              className="seminar-luma-subscribe-btn"
              rel="noopener noreferrer"
            >
              Reserve — {formatPriceInr(seminar.price_inr)}
            </a>
          ) : (
            <span className="seminar-luma-subscribe-btn seminar-luma-subscribe-btn--disabled">
              {seminar.status === "completed" ? "Ended" : "Unavailable"}
            </span>
          )}
        </header>

        {seminar.banner_image_url ? (
          <div className="seminar-luma-banner-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={seminar.banner_image_url} alt="" className="seminar-luma-banner" />
          </div>
        ) : null}

        <div className="seminar-luma-detail-grid">
          <section className="seminar-luma-sessions">
            <article className="seminar-luma-session-card">
              <p className="seminar-luma-session-day">
                {new Date(seminar.date_time).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <div className="seminar-luma-session-card-inner">
                <div className="seminar-luma-session-card-top">
                  <span className="seminar-luma-session-time">
                    {new Date(seminar.date_time).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {seminar.duration_minutes} min
                  </span>
                  {badge ? (
                    <span className="seminar-luma-session-badge seminar-luma-session-badge--alert">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <h2 className="seminar-luma-session-title">{seminar.title}</h2>
                <div className="seminar-luma-session-host-row">
                  {seminar.host_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={seminar.host_image_url}
                      alt=""
                      className="seminar-luma-host-avatar"
                    />
                  ) : (
                    <span
                      className="seminar-luma-host-avatar seminar-luma-host-avatar--fallback"
                      style={{ backgroundColor: seminarListIconBg(seminar.title) }}
                    >
                      {seminarInitial(seminar.host_name)}
                    </span>
                  )}
                  <p className="seminar-luma-session-hosts">
                    By {seminar.host_name} · {seminar.host_role}, {seminar.host_company}
                  </p>
                </div>
                <p className="seminar-luma-session-location">◎ {seminar.venue}</p>

                {seminar.tags.length > 0 ? (
                  <div className="seminar-live-tags">
                    {seminar.tags.map((tag) => (
                      <span key={tag} className="seminar-live-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="seminar-luma-extra">
              <h2 className="seminar-luma-extra-title">About the host</h2>
              <div className="seminar-luma-speaker-inline">
                <div>
                  <p className="seminar-luma-speaker-name">{seminar.host_name}</p>
                  <p className="seminar-luma-speaker-role">
                    {seminar.host_role} · {seminar.host_company}
                  </p>
                </div>
                <a
                  href={seminar.host_linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="seminar-luma-speaker-link"
                >
                  LinkedIn →
                </a>
              </div>
            </section>
          </section>

          <aside className="seminar-luma-sidebar">
            {canPay ? (
              <a
                href={seminar.razorpay_link}
                className="seminar-luma-sidebar-cta"
                rel="noopener noreferrer"
              >
                + Reserve seat — {formatPriceInr(seminar.price_inr)}
              </a>
            ) : null}

            <div className="seminar-luma-sidebar-card">
              <p className="seminar-luma-sidebar-label">Availability</p>
              <p
                className={
                  seminar.spots_remaining < 5
                    ? "seminar-spots seminar-spots--urgent"
                    : "seminar-spots"
                }
              >
                {seminar.spots_remaining} spots left
              </p>
              <p className="seminar-spots-sub">of {seminar.spots_total} total seats</p>
            </div>

            <div className="seminar-luma-sidebar-card">
              <p className="seminar-luma-sidebar-label">Price</p>
              <p className="seminar-spots seminar-spots--price">{formatPriceInr(seminar.price_inr)}</p>
              <p className="seminar-spots-sub">per seat · Razorpay checkout</p>
            </div>
          </aside>
        </div>
      </div>

      <footer className="landing-bottom-bar">
        <span>
          Get Uncooked · <Link href="/seminar">All seminars</Link>
        </span>
        <span>{seminar.title}</span>
        <span className="landing-bottom-accent">{"// live seminar"}</span>
      </footer>
    </div>
  );
}
