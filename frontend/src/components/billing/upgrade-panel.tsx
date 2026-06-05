"use client";

const PRO_FEATURES = [
  "Unlimited resume uploads",
  "Unlimited prep plans",
  "Unlimited practice quizzes per resume",
  "AI In-Depth Analysis",
  "Prep plan with no expiry",
] as const;

export function UpgradePanel() {
  return (
    <div className="upgrade-panel">
      <p className="upgrade-panel-eyebrow">Get Uncooked Pro</p>
      <h1 className="upgrade-panel-title">Unlock the full prep stack</h1>
      <p className="upgrade-panel-price">
        <span className="upgrade-panel-price-amount">$20</span>
        <span className="upgrade-panel-price-period">/month</span>
      </p>
      <ul className="upgrade-panel-list">
        {PRO_FEATURES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button type="button" className="upgrade-panel-cta" disabled>
        Payment coming soon
      </button>
      <p className="upgrade-panel-note">
        Stripe checkout for international cards ships in the next release.
      </p>
    </div>
  );
}
