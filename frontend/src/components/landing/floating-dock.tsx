"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Target,
  Award,
  Menu,
  X,
  Zap,  // for insights
  DollarSign,  // for pricing
  LogOut  // for logout
} from "lucide-react";
import { useState, useEffect } from "react";

import { buildDashboardHref, buildPlanHref, dashboardTabFromSearch } from "@/lib/dashboard-nav";

interface DockItem {
  href: string | null;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isCenter?: boolean;
  isActive?: boolean;
}

const DOCK_ITEMS: DockItem[] = [
  { href: null, label: "Plan", icon: LayoutDashboard }, // Will be built dynamically
  { href: null, label: "Notes", icon: FileText }, // Will be built dynamically
  { href: null, label: "Menu", icon: Menu, isCenter: true },
  { href: null, label: "Practice", icon: Target }, // Will be built dynamically
  { href: null, label: "Score", icon: Award }, // Will be built dynamically
] as const;

// Panel items - only items NOT already in the main dock
const PANEL_ITEMS = [
  { id: "insights", label: "Insights", icon: Zap },
  { id: "review", label: "Analysis", icon: LayoutDashboard },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
] as const;

export function FloatingDock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (!mounted) {
    return <div className="landing-dock" aria-hidden />;
  }

  // Get resumeId from search params
  const resumeId = searchParams.get("resume")?.trim() || null;
  
  // Get active tab from search params (only for dashboard)
  const activeTab = pathname === "/dashboard" ? dashboardTabFromSearch(searchParams.get("tab")) : null;
  
  // Determine if plan is active
  const planActive = pathname === "/plan" || pathname.startsWith("/prep");

  // Build dynamic hrefs for dock items
  const dockItemsWithHrefs: DockItem[] = [
    { 
      href: buildPlanHref(resumeId), 
      label: "Plan", 
      icon: LayoutDashboard,
      isActive: planActive
    },
    { 
      href: buildDashboardHref(resumeId, "notes"), 
      label: "Notes", 
      icon: FileText,
      isActive: pathname === "/notes" || (pathname === "/dashboard" && activeTab === "notes")
    },
    { 
      href: null, 
      label: "Menu", 
      icon: Menu, 
      isCenter: true 
    },
    { 
      href: buildDashboardHref(resumeId, "questions"), 
      label: "Practice", 
      icon: Target,
      isActive: pathname === "/interview" || (pathname === "/dashboard" && activeTab === "questions")
    },
    { 
      href: buildDashboardHref(resumeId, "score"), 
      label: "Score", 
      icon: Award,
      isActive: pathname === "/dashboard" && activeTab === "score" || 
               (pathname === "/dashboard" && !activeTab) || // Default tab is score
               pathname === "/roast" // Fallback to roast page
    }
  ];

  // Build panel items with hrefs
  const panelItemsWithHrefs = PANEL_ITEMS.map(item => {
    if ("href" in item) {
      return item;
    } else {
      return {
        ...item,
        href: buildDashboardHref(resumeId, item.id as any)
      };
    }
  });

  const handleCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen((v) => !v);
  };

  const handleItemClick = (href: string) => {
    setIsMenuOpen(false);
    router.push(href);
  };

  return (
    <nav
      className="landing-dock"
      role="navigation"
      aria-label="Main navigation"
    >
      <ul className="landing-dock-list">
        {dockItemsWithHrefs.map((item) => (
          <li key={item.label} className="landing-dock-item">
            {item.isCenter ? (
              <button
                type="button"
                className={`landing-dock-center ${isMenuOpen ? "landing-dock-center--open" : ""}`}
                onClick={handleCenterClick}
                aria-expanded={isMenuOpen}
                aria-controls="dock-menu-panel"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                <span className="landing-dock-center-inner">
                  {isMenuOpen ? <X className="h-5 w-5" strokeWidth={2.5} /> : <Menu className="h-5 w-5" strokeWidth={2.5} />}
                </span>
              </button>
            ) : (
              <Link
                href={item.href!}
                className={`landing-dock-link ${item.isActive ? "landing-dock-link--active" : ""}`}
                aria-current={item.isActive ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  handleItemClick(item.href!);
                }}
              >
                <span className="landing-dock-icon" aria-hidden>
                  <item.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="landing-dock-label">{item.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      {/* Expanded menu panel - styled like notes drawer */}
      {isMenuOpen && (
        <div
          id="dock-menu-panel"
          className="landing-dock-panel"
          role="menu"
          aria-label="Navigation menu"
        >
          <div className="landing-dock-panel-backdrop" onClick={() => setIsMenuOpen(false)} />
          <div className="landing-dock-panel-content">
            {/* Drawer handle */}
            <div className="landing-dock-panel-handle-wrap" aria-hidden="true">
              <div className="landing-dock-panel-handle" />
            </div>
            <header className="landing-dock-panel-header">
              <div>
                <p className="landing-dock-panel-eyebrow">{"// menu"}</p>
                <h2 className="landing-dock-panel-title">Navigation</h2>
              </div>
              <button
                type="button"
                className="landing-dock-panel-close"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </header>
            <ul className="landing-dock-panel-list" role="list">
              {panelItemsWithHrefs.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`landing-dock-panel-link ${pathname === item.href ? "landing-dock-panel-link--active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleItemClick(item.href);
                    }}
                    role="menuitem"
                  >
                    <span className="landing-dock-panel-icon" aria-hidden>
                      <item.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="landing-dock-panel-label">{item.label}</span>
                  </Link>
                </li>
              ))}
              {/* Logout item */}
              <li>
                <button
                  className="landing-dock-panel-link logout-item"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    // Redirect to sign-in for logout (in a real app, use Clerk's signOut)
                    router.push("/sign-in");
                  }}
                >
                  <span className="landing-dock-panel-icon" aria-hidden>
                    <LogOut className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="landing-dock-panel-label">Logout</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}