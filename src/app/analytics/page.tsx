"use client";

import { useState, useEffect, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { db } from "@/lib/database";
import { isAdminProfile } from "@/lib/admin-auth";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import type { ProductItem, LinkItem } from "@/lib/types";
import Card, { CardHeader, CardBody } from "@/components/Card";
import { InputField, SelectField } from "@/components/Forms";
import { PrimaryButton, IconButton } from "@/components/Buttons";
import Badge from "@/components/Badge";
import { ArrowLeft, BarChart3, HelpCircle, Link as LinkIcon, ExternalLink, Calendar, Search } from "lucide-react";
import { useRouter } from "next/navigation";

const LINKS: LinkItem[] = [
  {
    title: "Zoho CRM Walk-ins",
    desc: "Access the CRM experience store pipeline",
    url: "https://crm.zoho.in",
    cat: "CRM",
  },
  {
    title: "Retail Training Dashboard",
    desc: "Product manuals, video pitches, and onboarding guides",
    url: "https://fridoacademy-dashboard.netlify.app",
    cat: "Learning",
  },
  {
    title: "Frido Official Site",
    desc: "Compare pricing and stock availability live",
    url: "https://myfrido.com",
    cat: "Portal",
  },
  {
    title: "HR Connect Portal",
    desc: "Punch attendance, leaves, and salary slips",
    url: "https://people.zoho.in",
    cat: "Internal",
  },
  {
    title: "Store Feedback Register",
    desc: "Submit direct reports regarding store repair and safety",
    url: "https://forms.zoho.in/support/storefeedback",
    cat: "Support",
  },
];

export default function AnalyticsPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"store" | "suggest" | "links">("store");

  // Analytics
  const [mtdRev, setMtdRev] = useState("₹0");
  const [avgCvr, setAvgCvr] = useState("0%");
  const [reviews, setReviews] = useState(0);
  const [leads, setLeads] = useState(0);
  const [cvrData, setCvrData] = useState<{ day: string; pct: number }[]>([]);

  // Price Suggestion
  const [sugCat, setSugCat] = useState("");
  const [sugBudget, setSugBudget] = useState("");
  const [sugResult, setSugResult] = useState<React.ReactNode>(null);

  useEffect(() => {
    if (!profile) return;
    const dsrs = db.getLocalList("dsr").filter(
      (d) => isAdminProfile(profile) || d.store === profile.store
    );
    const leadsLocal = db.getLocalList("lead").filter(
      (d) => isAdminProfile(profile) || d.store === profile.store
    );

    let totalRev = 0;
    let totalWalkins = 0;
    let totalOrders = 0;

    dsrs.forEach((d) => {
      totalRev +=
        (Number(d.nonMobilityMtd) || 0) +
        (Number(d.mobilityMtd) || 0);
      totalWalkins += Number(d.newWalkins) || 0;
      totalOrders +=
        (Number(d.ccOrders) || 0) + (Number(d.onlineOrders) || 0);
    });

    const cvr =
      totalWalkins > 0
        ? Math.round((totalOrders / totalWalkins) * 100)
        : 0;
    const totalReviews = dsrs.reduce(
      (acc, cur) => acc + (Number(cur.reviewsTaken) || 0),
      0
    );
    const totalLeads =
      leadsLocal.length +
      dsrs.reduce(
        (acc, cur) => acc + (Number(cur.leadsCaptured) || 0),
        0
      );

    setMtdRev(
      totalRev > 0
        ? `₹${totalRev.toLocaleString("en-IN")}`
        : "₹0"
    );
    setAvgCvr(`${cvr}%`);
    setReviews(totalReviews);
    setLeads(totalLeads);

    // Calculate CVR trend for the last 7 days of DSRs
    const sortedDsrs = [...dsrs].sort(
      (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
    const last7Dsrs = sortedDsrs.slice(-7);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (last7Dsrs.length > 0) {
      const calculatedData = last7Dsrs.map((d) => {
        const dateObj = new Date(d.date as string);
        const dayName = weekdays[dateObj.getDay()];
        const walkins = (Number(d.newWalkins) || 0) + (Number(d.otherWalkins) || 0);
        const orders = (Number(d.ccOrders) || 0) + (Number(d.onlineOrders) || 0);
        const pct = walkins > 0 ? Math.round((orders / walkins) * 100) : 0;
        return {
          day: dayName,
          pct: pct,
        };
      });
      setCvrData(calculatedData);
    } else {
      setCvrData([
        { day: "Mon", pct: 0 },
        { day: "Tue", pct: 0 },
        { day: "Wed", pct: 0 },
        { day: "Thu", pct: 0 },
        { day: "Fri", pct: 0 },
        { day: "Sat", pct: 0 },
        { day: "Sun", pct: 0 },
      ]);
    }
  }, [profile]);

  const handleCalcSuggestion = () => {
    if (!sugCat) {
      toast("Please select a Product Category first.", true);
      return;
    }
    const budgetNum = Number(sugBudget);
    if (!sugBudget || isNaN(budgetNum) || budgetNum <= 0) {
      toast("Please enter a valid target customer budget.", true);
      return;
    }

    const items: ProductItem[] = PRODUCT_CATALOG[sugCat] || [];
    const exactMatches: ProductItem[] = [];
    const alternativeMatches: ProductItem[] = [];

    // TypeScript narrowing loop
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      if (p.price <= budgetNum) {
        exactMatches.push(p);
      } else if (p.maxDiscount != null && p.price - p.maxDiscount <= budgetNum) {
        alternativeMatches.push(p);
      }
    }

    if (exactMatches.length === 0 && alternativeMatches.length === 0) {
      setSugResult(
        <div className="mt-6 p-4 rounded-sm border border-border bg-bg-primary text-center">
          <p className="fs-small text-text-secondary">
            No products found matching budget ₹{budgetNum.toLocaleString("en-IN")} in {sugCat}.
          </p>
        </div>
      );
      return;
    }

    setSugResult(
      <div className="mt-6 space-y-6">
        {/* Exact Fits */}
        {exactMatches.length > 0 && (
          <div className="space-y-3">
            <h4 className="fs-caption font-bold text-green-600 dark:text-green-400 tracking-wider uppercase">
              Perfect Budget Fits
            </h4>
            <div className="grid gap-3">
              {exactMatches.map((p) => (
                <div key={p.name} className="p-4 rounded-sm border border-border bg-bg-primary/50 flex flex-col gap-3">
                  <div>
                    <h5 className="fs-body font-bold text-text-primary">{p.name}</h5>
                    <p className="fs-caption text-text-secondary mt-0.5">Price: <span className="font-semibold text-text-primary">₹{p.price.toLocaleString("en-IN")}</span></p>
                  </div>
                  <Badge variant="green">In Budget</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Fits */}
        {alternativeMatches.length > 0 && (
          <div className="space-y-3">
            <h4 className="fs-caption font-bold text-brand-blue tracking-wider uppercase">
              Fits via Maximum Discount
            </h4>
            <div className="grid gap-3">
              {alternativeMatches.map((p) => {
                const diff = p.price - budgetNum;
                return (
                  <div key={p.name} className="p-4 rounded-sm border border-border bg-bg-primary/50 flex flex-col gap-3">
                    <div>
                      <h5 className="fs-body font-bold text-text-primary">{p.name}</h5>
                      <p className="fs-caption text-text-secondary mt-0.5">
                        MRP: <span className="line-through">₹{p.price.toLocaleString("en-IN")}</span> · Target: <span className="font-bold text-text-primary">₹{budgetNum.toLocaleString("en-IN")}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant="blue">Apply Discount: -₹{diff.toLocaleString("en-IN")}</Badge>
                      <span className="fs-caption text-text-tertiary">Max Limit: ₹{(p.maxDiscount ?? 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const categoryOptions = Object.keys(PRODUCT_CATALOG).map((cat) => ({
    label: cat,
    value: cat,
  }));

  return (
    <div className="space-y-8">
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <IconButton icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={() => router.push("/")} aria-label="Go back" />
        <div>
          <h2 className="fs-h2 font-bold text-text-primary tracking-tight">Analytics & Portals</h2>
          <p className="fs-small text-text-secondary mt-0.5">
            Store Performance trackers, pricing calculators, and partner links.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 border border-border rounded-sm gap-1 max-w-lg">
        <button
          onClick={() => setActiveTab("store")}
          className={`flex-1 py-2 fs-small font-semibold rounded-xs transition-120 cursor-pointer
            ${activeTab === "store" ? "bg-bg-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          Store Analytics
        </button>
        <button
          onClick={() => setActiveTab("suggest")}
          className={`flex-1 py-2 fs-small font-semibold rounded-xs transition-120 cursor-pointer
            ${activeTab === "suggest" ? "bg-bg-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          Price Engine
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`flex-1 py-2 fs-small font-semibold rounded-xs transition-120 cursor-pointer
            ${activeTab === "links" ? "bg-bg-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
        >
          Useful Links
        </button>
      </div>

      {/* ── Store Analytics ── */}
      {activeTab === "store" && (
        <div className="space-y-8 view-enter">
          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader title="MTD Revenue" className="mb-1" />
              <CardBody>
                <div className="fs-display font-bold text-text-primary">{mtdRev}</div>
                <p className="fs-caption text-text-tertiary mt-1.5 uppercase font-bold tracking-wider">Gross MTD Sales</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Conversion (CVR)" className="mb-1" />
              <CardBody>
                <div className="fs-display font-bold text-text-primary">{avgCvr}</div>
                <p className="fs-caption text-text-tertiary mt-1.5 uppercase font-bold tracking-wider">Walkin Conversion Rate</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="GMB Reviews" className="mb-1" />
              <CardBody>
                <div className="fs-display font-bold text-text-primary">{reviews}</div>
                <p className="fs-caption text-text-tertiary mt-1.5 uppercase font-bold tracking-wider">Reviews Logged</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Leads Captured" className="mb-1" />
              <CardBody>
                <div className="fs-display font-bold text-text-primary">{leads}</div>
                <p className="fs-caption text-text-tertiary mt-1.5 uppercase font-bold tracking-wider">Zoho Pipeline Entries</p>
              </CardBody>
            </Card>
          </div>

          {/* Bar Chart Card */}
          <Card>
            <CardHeader title="Daily Conversion Trend" subtitle="Conversion ratios (CVR %) recorded over the past 7 days." />
            <CardBody className="pt-6">
              <div className="relative flex items-end justify-between h-36 px-4 border-b border-border/80 pb-2">
                {cvrData.map(({ day, pct }) => (
                  <div key={day} className="flex flex-col items-center flex-1 group">
                    <span className="text-[10px] text-text-secondary font-bold group-hover:text-text-primary mb-1">
                      {pct}%
                    </span>
                    <div
                      className={`w-4.5 rounded-t-xs transition-260 ease-out hover:brightness-95`}
                      style={{
                        height: `${pct * 1.8}px`,
                        backgroundColor: pct >= 50 ? "#10B981" : "var(--accent-yellow)",
                      }}
                    />
                    <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider mt-2">
                      {day}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Price Engine ── */}
      {activeTab === "suggest" && (
        <div className="max-w-2xl mx-auto view-enter">
          <Card>
            <CardHeader
              title="Pricing Suggestion Engine"
              subtitle="Input category interest and customer target budget to view eligible models and discount limits."
            />
            <CardBody className="space-y-4 pt-2">
              <SelectField
                label="Category Interest"
                value={sugCat}
                onChange={(e) => setSugCat(e.target.value)}
                options={categoryOptions}
                placeholder="Select category"
              />

              <InputField
                label="Customer Target Budget (₹)"
                type="number"
                placeholder="e.g. 5000"
                value={sugBudget}
                onChange={(e) => setSugBudget(e.target.value)}
              />

              <PrimaryButton onClick={handleCalcSuggestion} className="w-full">
                Calculate Matches
              </PrimaryButton>

              {sugResult}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Useful Links ── */}
      {activeTab === "links" && (
        <div className="max-w-3xl mx-auto space-y-4 view-enter">
          {LINKS.map((lnk) => (
            <Card
              key={lnk.url}
              interactive
              onClick={() => window.open(lnk.url, "_blank", "noopener,noreferrer")}
              className="hover:border-brand-yellow"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm border border-border bg-bg-primary flex items-center justify-center flex-shrink-0 text-text-secondary">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left space-y-1">
                    <div className="fs-body font-bold text-text-primary leading-none flex items-center gap-2">
                      {lnk.title}
                      <Badge variant="gray">{lnk.cat}</Badge>
                    </div>
                    <p className="fs-small text-text-secondary leading-normal">{lnk.desc}</p>
                  </div>
                </div>
                <ExternalLink className="w-4.5 h-4.5 text-text-tertiary" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
