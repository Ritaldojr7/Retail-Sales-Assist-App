"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { db } from "@/lib/database";
import type { QAItem } from "@/lib/types";
import Card, { CardHeader, CardBody } from "@/components/Card";
import { InputField, TextArea } from "@/components/Forms";
import { PrimaryButton, SecondaryButton, IconButton } from "@/components/Buttons";
import { ArrowLeft, Mic, StopCircle, RefreshCw, Send, Volume2, User } from "lucide-react";
import { useRouter } from "next/navigation";

const MAX_RECORDING_SECS = 120;

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

export default function ObjectionPage() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  // Voice Recorder State
  const [recState, setRecState] = useState<"idle" | "recording" | "review">("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const [context, setContext] = useState("");
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Q&A State
  const [feedTab, setFeedTab] = useState<"all" | "mine">("all");
  const [feedItems, setFeedItems] = useState<QAItem[]>([]);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load feed on mount
  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const items = await db.getAnswersFeed(
        profile?.deviceId || null
      );
      setFeedItems(items);
    } catch {
      // Feed load failed silently
    }
  };

  // ── Recording Logic ──
  const startRecording = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !window.MediaRecorder
    ) {
      return toast(
        "Voice recording is not fully supported in this browser.",
        true
      );
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch {
      return toast(
        "Microphone access is required to record verbal feedback.",
        true
      );
    }

    const mimetypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
    ];
    let mime = "";
    for (const m of mimetypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        mime = m;
        break;
      }
    }

    mediaRecorderRef.current = new MediaRecorder(
      streamRef.current,
      mime ? { mimeType: mime } : {}
    );
    chunksRef.current = [];
    setRecSeconds(0);

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      blobRef.current = new Blob(chunksRef.current, {
        type:
          mediaRecorderRef.current?.mimeType || "audio/webm",
      });
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(
          blobRef.current
        );
      }
    };

    mediaRecorderRef.current.start(10);
    setRecState("recording");

    timerRef.current = setInterval(() => {
      setRecSeconds((s) => {
        if (s >= MAX_RECORDING_SECS) {
          stopRecording();
          return s;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecState("review");
  };

  const resetRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecSeconds(0);
    setContext("");
    setRecState("idle");
    blobRef.current = null;
    if (audioRef.current) audioRef.current.src = "";
  };

  const handleUpload = async () => {
    if (!blobRef.current)
      return toast("No audio recorded to upload.", true);

    setUploading(true);
    try {
      const fileExt =
        mediaRecorderRef.current?.mimeType?.split(";")[0]?.split("/")[1] ||
        "webm";
      const filename = `objection_${Date.now()}.${fileExt}`;

      // Convert audio blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blobRef.current);
      reader.onloadend = async () => {
        const base64data = reader.result;

        await db.post({
          action: "objection",
          name: profile?.name || "Anonymous",
          store: profile?.store || "Retail Store",
          filename,
          context: context.trim(),
          audioBase64: base64data,
        });

        toast("Verbal objection uploaded to HQ successfully!");
        resetRecording();
      };
    } catch {
      toast("Error uploading voice file.", true);
    } finally {
      setUploading(false);
    }
  };

  // ── Q&A Logic ──
  const handlePostQuestion = async () => {
    if (!question.trim())
      return toast("Question field cannot be empty.", true);

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
    if (feedTab === "all") return true;
    return item.deviceId === profile?.deviceId;
  });

  return (
    <div className="space-y-8">
      {/* Header back navigation */}
      <div className="flex items-center gap-4">
        <IconButton icon={<ArrowLeft className="w-4.5 h-4.5" />} onClick={() => router.push("/")} aria-label="Go back" />
        <div>
          <h2 className="fs-h2 font-bold text-text-primary tracking-tight">Objections & Aggregation</h2>
          <p className="fs-small text-text-secondary mt-0.5">Record customer objections floor-audio & review expert answers.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Left column: Voice Recorder Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Voice Recorder Note"
              subtitle="Record real-time verbal floor feedback or pricing friction issues."
            />
            <CardBody className="pt-2">
              {recState === "idle" && (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-sm bg-bg-primary">
                  <button
                    onClick={startRecording}
                    className="w-16 h-16 rounded-full bg-brand-yellow/12 hover:bg-brand-yellow/20 text-[#0A0A0A] dark:text-brand-yellow flex items-center justify-center transition-180 focus-ring cursor-pointer"
                  >
                    <Mic className="w-6.5 h-6.5" />
                  </button>
                  <p className="fs-small font-semibold text-text-primary mt-4">Tap to start recording</p>
                  <p className="fs-caption text-text-tertiary mt-1">Maximum length: 2 minutes</p>
                </div>
              )}

              {recState === "recording" && (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-sm bg-brand-yellow/5">
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-red-500/25 animate-ping" />
                    <button
                      onClick={stopRecording}
                      className="relative w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-180 focus-ring cursor-pointer"
                    >
                      <StopCircle className="w-6.5 h-6.5" />
                    </button>
                  </div>
                  <p className="fs-small font-bold text-red-500 mt-4 animate-pulse">RECORDING</p>
                  <p className="fs-h3 font-bold text-text-primary mt-1">
                    {Math.floor(recSeconds / 60)}:{(recSeconds % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              )}

              {recState === "review" && (
                <div className="space-y-4">
                  <div className="p-4 bg-bg-primary border border-border rounded-sm">
                    <audio
                      ref={audioRef}
                      controls
                      className="w-full focus:outline-none"
                    />
                  </div>

                  <InputField
                    label="Summary Context (optional)"
                    type="text"
                    placeholder="e.g. Ortho insole price objection"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  />

                  <div className="flex gap-4 pt-2">
                    <SecondaryButton onClick={resetRecording} className="flex-1">
                      Discard & Retry
                    </SecondaryButton>
                    <PrimaryButton onClick={handleUpload} disabled={uploading} className="flex-1">
                      {uploading ? "Uploading..." : "Upload Audio"}
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column: Expert Q&A Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Ask HQ Experts" subtitle="Submit specific customer queries to Frido product architects." />
            <CardBody className="space-y-4 pt-2">
              <TextArea
                label="Your Question"
                placeholder="Type specific questions (e.g. competitor model difference values)..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <PrimaryButton onClick={handlePostQuestion} disabled={submitting}>
                <Send className="w-4 h-4" />
                Submit Query
              </PrimaryButton>

              <hr className="border-border/60 my-6" />

              {/* Tabs */}
              <div className="flex bg-bg-primary p-1 border border-border rounded-sm gap-1">
                <button
                  onClick={() => setFeedTab("all")}
                  className={`flex-1 py-1.5 fs-small font-semibold rounded-xs transition-120 cursor-pointer
                    ${feedTab === "all" ? "bg-bg-secondary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
                >
                  All Answers
                </button>
                <button
                  onClick={() => setFeedTab("mine")}
                  className={`flex-1 py-1.5 fs-small font-semibold rounded-xs transition-120 cursor-pointer
                    ${feedTab === "mine" ? "bg-bg-secondary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
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
              <div className="space-y-4 pt-2">
                {filteredFeed.length === 0 ? (
                  <p className="text-center text-text-tertiary fs-small py-8">
                    {feedTab === "mine" ? "You haven't asked any custom questions yet." : "No expert answers available yet."}
                  </p>
                ) : (
                  filteredFeed.map((item, idx) => (
                    <div key={idx} className="border border-border rounded-sm p-4 bg-bg-primary/45 space-y-3">
                      <div>
                        <p className="fs-body font-bold text-text-primary leading-tight">{item.question}</p>
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
                          <p className="fs-body text-text-primary leading-relaxed">{item.answer}</p>
                        </div>
                      ) : (
                        <div className="bg-bg-primary border-l-[3px] border-text-tertiary/40 p-3 rounded-r-xs">
                          <p className="fs-small text-text-tertiary italic">Awaiting review from HQ Experts...</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
