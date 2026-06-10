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
  Zap,       // for insights
  DollarSign, // for pricing
  LogOut      // for logout
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useDragControls } from "motion/react";

import { buildDashboardHref, buildPlanHref, dashboardTabFromSearch } from "@/lib/dashboard-nav";

interface DockItem {
  href: string | null;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isCenter?: boolean;
  isActive?: boolean;
}

const DOCK_ITEMS: DockItem[] = [
  { href: null, label: "Plan", icon: LayoutDashboard },
  { href: null, label: "Notes", icon: FileText },
  { href: null, label: "Menu", icon: Menu, isCenter: true },
  { href: null, label: "Practice", icon: Target },
  { href: null, label: "Score", icon: Award },
] as const;

// Panel items - only items NOT already in the main dock
const PANEL_ITEMS = [
  { id: "insights", label: "Insights", icon: Zap },
  { id: "review",   label: "Analysis", icon: LayoutDashboard },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
] as const;

const EASE_DEFAULT = [0.16, 1, 0.3, 1] as const;

export function FloatingDock() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const router      = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);

  const dragControls = useDragControls();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const onDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 72 || info.velocity.y > 420) closeMenu();
    },
    [closeMenu],
  );

  if (!mounted) {
    return <div className="landing-dock" aria-hidden />;
  }

  // Get resumeId from search params
  const resumeId = searchParams.get("resume")?.trim() || null;

  // Get active tab from search params (only for dashboard)
  const activeTab = pathname === "/dashboard"
    ? dashboardTabFromSearch(searchParams.get("tab"))
    : null;

  // Determine if plan is active
  const planActive = pathname === "/plan" || pathname.startsWith("/prep");

  // Build dynamic hrefs for dock items
  const dockItemsWithHrefs: DockItem[] = [
    {
      href: buildPlanHref(resumeId),
      label: "Plan",
      icon: LayoutDashboard,
      isActive: planActive,
    },
    {
      href: buildDashboardHref(resumeId, "notes"),
      label: "Notes",
      icon: FileText,
      isActive:
        pathname === "/notes" ||
        (pathname === "/dashboard" && activeTab === "notes"),
    },
    { href: null, label: "Menu", icon: Menu, isCenter: true },
    {
      href: buildDashboardHref(resumeId, "questions"),
      label: "Practice",
      icon: Target,
      isActive:
        pathname === "/interview" ||
        (pathname === "/dashboard" && activeTab === "questions"),
    },
    {
      href: buildDashboardHref(resumeId, "score"),
      label: "Score",
      icon: Award,
      isActive:
        (pathname === "/dashboard" && activeTab === "score") ||
        (pathname === "/dashboard" && !activeTab) ||
        pathname === "/roast",
    },
  ];

  // Build panel items with hrefs
  const panelItemsWithHrefs = PANEL_ITEMS.map((item) => {
    if ("href" in item) return item;
    return { ...item, href: buildDashboardHref(resumeId, item.id as any) };
  });

  const handleCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen((v) => !v);
  };

  const handleItemClick = (href: string) => {
    closeMenu();
    router.push(href);
  };

  return (
    <nav className="landing-dock" role="navigation" aria-label="Main navigation">
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
                  {isMenuOpen
                    ? <X className="h-5 w-5" strokeWidth={2.5} />
                    : <Menu className="h-5 w-5" strokeWidth={2.5} />}
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

      {/* Animated bottom-sheet menu panel */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Scrim — tap outside to close */}
            <motion.button
              key="dock-scrim"
              type="button"
              aria-label="Close menu"
              className="landing-dock-panel-backdrop"
              style={{ position: "fixed", inset: 0, zIndex: 1099, border: "none", padding: 0, cursor: "pointer" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE_DEFAULT }}
              onClick={closeMenu}
            />

            {/* Sheet */}
            <motion.div
              key="dock-panel"
              id="dock-menu-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="landing-dock-panel-content"
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={onDragEnd}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.38, ease: EASE_DEFAULT }}
            >
              {/* Drag handle */}
              <div
                className="landing-dock-panel-handle-wrap"
                aria-hidden="true"
                onPointerDown={(e) => dragControls.start(e)}
              >
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
                  onClick={closeMenu}
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
                      className={`landing-dock-panel-link ${
                        pathname === item.href ? "landing-dock-panel-link--active" : ""
                      }`}
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

                {/* Logout */}
                <li>
                  <button
                    className="landing-dock-panel-link logout-item"
                    onClick={() => {
                      closeMenu();
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}