"use client";

type Props = {
  original: string;
  rewritten: string;
  why: string;
};

export function InDepthRewriteDiff({ original, rewritten, why }: Props) {
  return (
    <div className="indepth-rewrite">
      <div className="indepth-rewrite-block indepth-rewrite-block--orig">
        <p className="indepth-rewrite-label">Original</p>
        <p className="indepth-rewrite-text indepth-rewrite-text--strike">{original}</p>
      </div>
      <div className="indepth-rewrite-block indepth-rewrite-block--new">
        <p className="indepth-rewrite-label">Rewrite</p>
        <p className="indepth-rewrite-text indepth-rewrite-text--highlight">{rewritten}</p>
      </div>
      <p className="indepth-rewrite-why">
        <span className="indepth-rewrite-why-mark">Why this one →</span> {why}
      </p>
    </div>
  );
}
