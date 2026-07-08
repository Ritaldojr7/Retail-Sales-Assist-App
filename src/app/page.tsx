"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import {
  ClipboardList,
  TrendingDown,
  Mic,
  FileSpreadsheet,
  Users,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import Card from "@/components/Card";

/* ── Home View ── */
function HomeView() {
  const { profile } = useProfile();
  const router = useRouter();

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const coreActivities = [
    {
      title: "Register a Lead",
      desc: "Capture customer details in the Zoho form",
      href: "/lead",
      icon: ClipboardList,
      colorClass: "bg-brand-blue/10 text-brand-blue border-l-brand-blue",
    },
    {
      title: "Log a Lost Sale (R-Loss)",
      desc: "Tell us why the sale didn't happen",
      href: "/rloss",
      icon: TrendingDown,
      colorClass: "bg-red-500/10 text-red-600 border-l-red-500 dark:text-red-400",
    },
    {
      title: "Objections & Aggregation",
      desc: "Record objection floor-audio & expert Q&A",
      href: "/objection",
      icon: Mic,
      colorClass: "bg-green-500/10 text-green-600 border-l-green-500",
    },
    {
      title: "Store Analytics Console",
      desc: "Operational store metrics, trends & target planner",
      href: "/store-analytics-console",
      icon: BarChart3,
      colorClass: "bg-amber-500/10 text-amber-600 border-l-amber-500",
    },
  ];

  const reports = [
    {
      title: "DSR Creation & Tracking",
      desc: "Fill numbers, preview table, take snapshot & save",
      href: "/dsr",
      icon: FileSpreadsheet,
      colorClass: "bg-brand-blue/10 text-brand-blue border-l-brand-blue",
    },
    {
      title: "Mid-Day Footfall Reporting",
      desc: "Weekly store mid-day entry & weekend compliance",
      href: "/footfall",
      icon: Users,
      colorClass: "bg-amber-500/10 text-amber-600 border-l-amber-500",
    },
  ];

  return (
    <div className="space-y-6 py-2">
      {/* Hello Banner Card */}
      <div className="bg-bg-secondary border border-border p-4 rounded-sm flex flex-col gap-3 shadow-elevation">
        <div>
          <h2 className="fs-h1 font-bold text-text-primary tracking-tight">
            Hello, {profile?.name?.split(" ")[0]}
          </h2>
          <p className="fs-small text-text-secondary mt-1">
            {profile?.store} · @{profile?.username}
          </p>
          <p className="fs-caption text-text-tertiary mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="fs-caption bg-brand-yellow/12 text-[#0A0A0A] dark:text-[#FFD200] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {profile?.role}
          </span>
        </div>
      </div>

      {/* Core Activities Grid */}
      <div>
        <h3 className="fs-section font-bold text-text-primary mb-4 tracking-tight uppercase">
          Core Activities
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {coreActivities.map((act) => {
            const Icon = act.icon;
            return (
              <Card
                key={act.href}
                interactive
                onClick={() => router.push(act.href)}
                className={`border-l-4 ${act.colorClass} hover:border-l-brand-yellow`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-sm bg-bg-primary border border-border flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-grow space-y-1">
                    <h4 className="fs-body font-bold text-text-primary flex items-center gap-1 group-hover:text-brand-yellow">
                      {act.title}
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-120 ml-auto" />
                    </h4>
                    <p className="fs-small text-text-secondary">{act.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reports Grid */}
      <div>
        <h3 className="fs-section font-bold text-text-primary mb-4 tracking-tight uppercase">
          Reports & Submissions
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {reports.map((rep) => {
            const Icon = rep.icon;
            return (
              <Card
                key={rep.href}
                interactive
                onClick={() => router.push(rep.href)}
                className={`border-l-4 ${rep.colorClass} hover:border-l-brand-yellow`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-sm bg-bg-primary border border-border flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-grow space-y-1">
                    <h4 className="fs-body font-bold text-text-primary flex items-center gap-1 group-hover:text-brand-yellow">
                      {rep.title}
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-120 ml-auto" />
                    </h4>
                    <p className="fs-small text-text-secondary">{rep.desc}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Root Page ── */
export default function Page() {
  const { profile, isReady } = useProfile();
  const router = useRouter();

  const needsSetup =
    isReady && (!profile?.role || !profile?.name || !profile?.username);

  useEffect(() => {
    if (needsSetup) {
      router.replace("/setup");
    }
  }, [needsSetup, router]);

  if (!isReady || needsSetup) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="w-8 h-8 border-2 border-text-secondary/20 border-t-brand-yellow rounded-full animate-spin" />
      </div>
    );
  }

  return <HomeView />;
}
