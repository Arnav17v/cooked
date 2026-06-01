import Link from "next/link";

import { LandingCustomCursor } from "@/components/landing/landing-custom-cursor";
import { LandingHome } from "@/components/landing/landing-home";
import { LandingNav } from "@/components/landing/landing-nav";
import { siteHostLabel } from "@/lib/site-url";

import "./landing-v3.css";

export default function Home() {
  return (
    <div className="landing-v3 landing-home--prep">
      <LandingCustomCursor />
      <LandingNav />
      <LandingHome />
      <footer className="landing-bottom-bar">
        <span>
          Am I Cooked? © {new Date().getFullYear()} ·{" "}
          <Link href="/">{siteHostLabel()}</Link>
        </span>
        <span>Free prep planner · roast included · account required</span>
        <span className="landing-bottom-accent">{"// built in public"}</span>
      </footer>
    </div>
  );
}
