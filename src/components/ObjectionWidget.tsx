"use client";

import { useState, useRef, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/useToast";
import { useWidgets } from "@/hooks/useWidgets";
import { db } from "@/lib/database";
import { InputField } from "@/components/Forms";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { X, Mic, StopCircle } from "lucide-react";

const MAX_RECORDING_SECS = 120;

export default function ObjectionWidget() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const { objectionOpen, setObjectionOpen } = useWidgets();

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
    setObjectionOpen(true);
  };

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
        type: mediaRecorderRef.current?.mimeType || "audio/webm",
      });
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(blobRef.current);
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
    if (!blobRef.current) return toast("No audio recorded to upload.", true);

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
        setObjectionOpen(false); // Close the drawer on success
      };
    } catch {
      toast("Error uploading voice file.", true);
    } finally {
      setUploading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <>
      {/* Backdrop (visible only on mobile/tablet) */}
      {objectionOpen && (
        <div
          className="widget-backdrop"
          onClick={() => {
            if (recState !== "recording") {
              setObjectionOpen(false);
            }
          }}
        />
      )}

      {/* Widget Container Panel */}
      <div className={`widget-panel-left ${objectionOpen ? "widget-open" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-bg-secondary widget-header">
          <div>
            <h3 className="fs-h3 font-bold text-text-primary tracking-tight">
              Objection Aggregator
            </h3>
            <p className="fs-caption text-text-secondary mt-0.5">
              Record real-time verbal floor objections.
            </p>
          </div>
          <button
            onClick={() => setObjectionOpen(false)}
            disabled={recState === "recording"}
            className="mobile-icon-btn flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-bg-primary border border-border rounded-sm p-4 text-text-primary">
            <h4 className="fs-body font-semibold">Voice Recorder Note</h4>
            <p className="fs-small text-text-secondary mt-1">
              Record real-time verbal floor feedback or pricing friction issues.
            </p>
          </div>

          <div className="pt-2">
            {recState === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border rounded-sm bg-bg-primary">
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-brand-yellow/12 hover:bg-brand-yellow/20 text-[#0A0A0A] dark:text-brand-yellow flex items-center justify-center transition-180 focus-ring cursor-pointer"
                >
                  <Mic className="w-6.5 h-6.5" />
                </button>
                <p className="fs-small font-semibold text-text-primary mt-4">
                  Tap to start recording
                </p>
                <p className="fs-caption text-text-tertiary mt-1">
                  Maximum length: 2 minutes
                </p>
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
                <p className="fs-small font-bold text-red-500 mt-4 animate-pulse">
                  RECORDING
                </p>
                <p className="fs-h3 font-bold text-text-primary mt-1">
                  {Math.floor(recSeconds / 60)}:
                  {(recSeconds % 60).toString().padStart(2, "0")}
                </p>
              </div>
            )}

            {recState === "review" && (
              <div className="space-y-4">
                <div className="p-4 bg-bg-primary border border-border rounded-sm">
                  <audio ref={audioRef} controls className="w-full focus:outline-none" />
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
                  <PrimaryButton
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? "Uploading..." : "Upload Audio"}
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Trigger Tab (minimized state) */}
      {!objectionOpen && (
        <button
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onClick={handleTriggerClick}
          style={{ top: `${yPos}px` }}
          className="widget-trigger-left"
          title="Open Objection Aggregator"
          aria-label="Open Objection Aggregator"
        >
          <Mic className="w-5 h-5 flex-shrink-0" />
          <span className="trigger-text-left">Objections</span>
        </button>
      )}
    </>
  );
}
