"use client";

import { useState, useRef, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { useWidgets } from "@/hooks/useWidgets";
import { db } from "@/lib/database";
import type { QAItem } from "@/lib/types";
import { TextArea } from "@/components/Forms";
import { PrimaryButton } from "@/components/Buttons";
import { X, Send, Search, RefreshCw, User, HelpCircle } from "lucide-react";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AskHqWidget() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const { askHqOpen, setAskHqOpen } = useWidgets();

  // Draggable CTA State
  const [yPos, setYPos] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, top: 0, moved: false });

  // Handle Drag Events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { y: e.clientY, top: yPos, moved: false };
    setIsDragging(true);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      dragStartRef.current = { y: e.touches[0].clientY, top: yPos, moved: false };
      setIsDragging(true);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartRef.current.y;
      if (Math.abs(deltaY) > 5) {
        dragStartRef.current.moved = true;
      }
      const newTop = Math.max(50, Math.min(window.innerHeight - 100, dragStartRef.current.top + deltaY));
      setYPos(newTop);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const deltaY = e.touches[0].clientY - dragStartRef.current.y;
        if (Math.abs(deltaY) > 5) {
          dragStartRef.current.moved = true;
        }
        const newTop = Math.max(50, Math.min(window.innerHeight - 100, dragStartRef.current.top + deltaY));
        setYPos(newTop);
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleDragEnd);
    window.addEventListener("touchcancel", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
      window.removeEventListener("touchcancel", handleDragEnd);
    };
  }, [isDragging]);

  const handleTriggerClick = () => {
    if (dragStartRef.current.moved) {
      dragStartRef.current.moved = false;
      return;
    }
    setAskHqOpen(true);
  };

  // Q&A State
  const [feedTab, setFeedTab] = useState<"all" | "mine">("all");
  const [feedItems, setFeedItems] = useState<QAItem[]>([]);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load feed on mount and when askHqOpen changes to true
  useEffect(() => {
    if (askHqOpen) {
      loadFeed();
    }
  }, [askHqOpen]);

  const loadFeed = async () => {
    try {
      const items = await db.getAnswersFeed(profile?.deviceId || null);
      setFeedItems(items);
    } catch {
      // Feed load failed silently
    }
  };

  const handlePostQuestion = async () => {
    if (!question.trim()) return toast("Question field cannot be empty.", true);

    setSubmitting(true);
    try {
      await db.post({
        action: "qa_ask",
        question: question.trim(),
        name: profile?.name || "Anonymous",
        store: profile?.store || "Retail Store",
        deviceId: profile?.deviceId || null,
      });

      toast("Your query has been sent to HQ experts!");
      setQuestion("");
      loadFeed();
    } catch {
      toast("Failed to submit question.", true);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFeed = feedItems.filter((item) => {
    const matchesTab = feedTab === "all" || item.deviceId === profile?.deviceId;
    if (!matchesTab) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const questionMatch = item.question?.toLowerCase().includes(query) || false;
    const answerMatch = item.answer?.toLowerCase().includes(query) || false;
    return questionMatch || answerMatch;
  });

  return (
    <>
      {/* Backdrop (visible only on mobile/tablet) */}
      {askHqOpen && (
        <div className="widget-backdrop" onClick={() => setAskHqOpen(false)} />
      )}

      {/* Widget Container Panel */}
      <div className={`widget-panel-right ${askHqOpen ? "widget-open" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-bg-secondary">
          <div>
            <h3 className="fs-h3 font-bold text-text-primary tracking-tight">
              Ask HQ Experts
            </h3>
            <p className="fs-caption text-text-secondary mt-0.5">
              Submit specific queries to Frido product architects.
            </p>
          </div>
          <button
            onClick={() => setAskHqOpen(false)}
            className="mobile-icon-btn flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <TextArea
            label="Your Question"
            placeholder="Type specific questions (e.g. competitor model difference values)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <PrimaryButton
            onClick={handlePostQuestion}
            disabled={submitting}
            className="w-full"
          >
            <Send className="w-4 h-4" />
            Submit Query
          </PrimaryButton>

          <hr className="border-border/60 my-6" />

          {/* Search Bar */}
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search answered queries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-sm border border-border bg-bg-secondary text-text-primary fs-body focus-ring transition-120 placeholder-text-tertiary"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
          </div>

          {/* Tabs */}
          <div className="flex bg-bg-primary p-1 border border-border rounded-sm gap-1">
            <button
              onClick={() => setFeedTab("all")}
              className={`flex-1 py-1.5 fs-small font-semibold rounded-xs transition-120 cursor-pointer
                ${
                  feedTab === "all"
                    ? "bg-bg-secondary text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
            >
              All Answers
            </button>
            <button
              onClick={() => setFeedTab("mine")}
              className={`flex-1 py-1.5 fs-small font-semibold rounded-xs transition-120 cursor-pointer
                ${
                  feedTab === "mine"
                    ? "bg-bg-secondary text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
            >
              My Questions
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={loadFeed}
            className="flex items-center gap-1.5 text-text-secondary fs-caption font-bold tracking-wider uppercase hover:text-text-primary cursor-pointer mt-2 ml-auto bg-transparent border-none"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Feed
          </button>

          {/* Feed List */}
          <div className="space-y-4 pt-1">
            {filteredFeed.length === 0 ? (
              <p className="text-center text-text-tertiary fs-small py-8">
                {feedTab === "mine"
                  ? "You haven't asked any custom questions yet."
                  : "No expert answers available yet."}
              </p>
            ) : (
              filteredFeed.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-border rounded-sm p-4 bg-bg-primary/45 space-y-3"
                >
                  <div>
                    <p className="fs-body font-bold text-text-primary leading-tight">
                      {item.question}
                    </p>
                    <div className="flex items-center gap-1.5 text-text-tertiary fs-caption mt-1 font-semibold uppercase tracking-wider">
                      <User className="w-3 h-3" />
                      <span>{item.name || "Anonymous"}</span>
                      <span>·</span>
                      <span>{item.store?.split(",")[0] || "Store"}</span>
                      <span>·</span>
                      <span>{timeAgo(item.ts)}</span>
                    </div>
                  </div>

                  {item.answer ? (
                    <div className="bg-green-500/8 dark:bg-green-500/12 border-l-[3px] border-green-500 p-3 rounded-r-xs space-y-1">
                      <div className="fs-caption font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">
                        EXPERT RESPONSE
                      </div>
                      <p className="fs-body text-text-primary leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-bg-primary border-l-[3px] border-text-tertiary/40 p-3 rounded-r-xs">
                      <p className="fs-small text-text-tertiary italic">
                        Awaiting review from HQ Experts...
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Trigger Tab (minimized state) */}
      {!askHqOpen && (
        <button
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={handleTriggerClick}
          style={{ top: `${yPos}px` }}
          className="widget-trigger-right"
          title="Open Ask HQ Expert"
          aria-label="Open Ask HQ Expert"
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          <span className="trigger-text-right">Ask HQ</span>
        </button>
      )}
    </>
  );
}
