import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Always jump to top when route changes (fixes "keeps same scroll position")
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const pageName =
    currentPageName ||
    (location.pathname === "/" ? "Dashboard" : location.pathname.replace(/^\//, ""));

  const isDashboard = pageName === "Dashboard";

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-neutral-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left: Logo + Brand + Current Page */}
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 min-w-0">
            <img src="/ash_pallet_logo.svg" alt="ASH Pallet" className="h-10 w-auto shrink-0" />
            <div className="flex items-baseline gap-3 min-w-0">
              <div className="font-extrabold text-xl leading-none whitespace-nowrap">ASH Pallet</div>
              <div className="text-neutral-500">•</div>
              <div className="font-semibold text-base md:text-lg text-neutral-100/90 truncate">
                {pageName}
              </div>
            </div>
          </Link>

          {/* Right: Back Button (hidden on Dashboard) */}
          {!isDashboard && (
            <button
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/25"
              aria-label="Back to Dashboard"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>
          )}
        </div>
      </header>

      {/* Page Content (full-bleed so page backgrounds can be full width) */}
      <main className="w-full">{children}</main>
    </div>
  );
}
