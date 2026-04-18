"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  animate,
  type Variants,
} from "framer-motion";
import { ChevronRight, Check, Loader2, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const THUMB   = 52;   // thumb diameter px
const PAD     = 4;    // track inner padding px
const THRESH  = 0.82; // fraction of track to trigger confirm

// ── Variant colour maps ───────────────────────────────────────────────────────

const VARIANTS = {
  purple: {
    from: "#5b21b6", mid: "#8b5cf6", to: "#c4b5fd",
    glow: "139,92,246",
    shimmer: "rgba(167,139,250,0.25)",
  },
  gold: {
    from: "#92400e", mid: "#d97706", to: "#fcd34d",
    glow: "217,119,6",
    shimmer: "rgba(253,211,77,0.2)",
  },
  cyan: {
    from: "#0e7490", mid: "#06b6d4", to: "#a5f3fc",
    glow: "6,182,212",
    shimmer: "rgba(165,243,252,0.2)",
  },
} as const;

export type SwipeVariant = keyof typeof VARIANTS;

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "idle" | "dragging" | "confirming" | "success" | "error";

interface Props {
  label?:     string;
  onConfirm:  () => Promise<void>;
  onError?:   (err: Error) => void;
  disabled?:  boolean;
  variant?:   SwipeVariant;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SwipeToConfirm({
  label     = "SWIPE TO CONFIRM",
  onConfirm,
  onError,
  disabled  = false,
  variant   = "purple",
  className,
}: Props) {
  const c            = VARIANTS[variant];
  const trackRef     = useRef<HTMLDivElement>(null);
  const thumbCtrl    = useAnimation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [maxX,  setMaxX]  = useState(1);          // avoid /0

  // ── Motion values (all unconditional) ──────────────────────────────────────

  const x = useMotionValue(0);

  // derived transforms — must reference maxX at call-time so we recompute when maxX changes
  const progress      = useTransform(x, [0, maxX], [0, 1],    { clamp: true });
  const fillOpacity   = useTransform(x, [0, maxX * 0.08], [0, 1], { clamp: true });
  const labelOpacity  = useTransform(x, [0, maxX * 0.28], [1, 0], { clamp: true });
  const glowStrength  = useTransform(x, [0, maxX], [0, 1],    { clamp: true });

  // fill width: thumb left-edge + thumb width tracks the progress
  const fillWidthPx   = useTransform(x, v => `${PAD + THUMB + v}px`);

  // ── Track sizing ───────────────────────────────────────────────────────────

  useEffect(() => {
    function measure() {
      if (trackRef.current) {
        const w = trackRef.current.offsetWidth;
        setMaxX(Math.max(1, w - THUMB - PAD * 2));
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Reset helper ───────────────────────────────────────────────────────────

  const reset = useCallback((delay = 0) => {
    setTimeout(() => {
      setPhase("idle");
      animate(x, 0, { type: "spring", stiffness: 380, damping: 32 });
    }, delay);
  }, [x]);

  // ── Drag end ───────────────────────────────────────────────────────────────

  async function onDragEnd() {
    const cur = x.get();
    if (cur < maxX * THRESH) {
      setPhase("idle");
      animate(x, 0, { type: "spring", stiffness: 420, damping: 34 });
      return;
    }

    // Snap thumb to end
    animate(x, maxX, { type: "spring", stiffness: 500, damping: 38 });
    setPhase("confirming");

    try {
      await onConfirm();
      setPhase("success");
      reset(1800);
    } catch (err) {
      setPhase("error");
      onError?.(err instanceof Error ? err : new Error(String(err)));
      // Shake thumb, then reset
      thumbCtrl.start({
        x: [-8, 8, -6, 6, -3, 3, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      });
      reset(650);
    }
  }

  // ── Derived booleans ───────────────────────────────────────────────────────

  const isIdle       = phase === "idle" || phase === "dragging";
  const isConfirming = phase === "confirming";
  const isSuccess    = phase === "success";
  const isError      = phase === "error";
  const locked       = isConfirming || isSuccess || isError;

  // ── Thumb fill/icon ────────────────────────────────────────────────────────

  const thumbBg = isSuccess
    ? "linear-gradient(145deg,#16a34a,#22c55e,#4ade80)"
    : isError
    ? "linear-gradient(145deg,#7f1d1d,#dc2626,#f87171)"
    : `linear-gradient(145deg,${c.from},${c.mid},${c.to})`;

  const thumbShadow = isSuccess
    ? "0 0 28px rgba(34,197,94,0.9)"
    : isError
    ? "0 0 28px rgba(220,38,38,0.8)"
    : `0 0 20px rgba(${c.glow},0.7)`;

  // Icon variants for smooth crossfade
  const iconVariants: Variants = {
    hidden: { opacity: 0, scale: 0.4, rotate: -30 },
    show:   { opacity: 1, scale: 1,   rotate: 0, transition: { type: "spring", stiffness: 500, damping: 28 } },
    exit:   { opacity: 0, scale: 0.4, rotate:  30, transition: { duration: 0.12 } },
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative select-none touch-none",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      style={{ height: THUMB + PAD * 2 }}
    >
      {/* ── Track shell ─────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background: "#07071a",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.6)",
        }}
      >
        {/* Gradient fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-l-2xl"
          style={{
            width: (isConfirming || isSuccess || isError) ? "100%" : fillWidthPx,
            opacity: fillOpacity,
            background: isSuccess
              ? "linear-gradient(90deg,#15803d,#22c55e)"
              : isError
              ? "linear-gradient(90deg,#7f1d1d,#dc2626)"
              : `linear-gradient(90deg,${c.from},${c.mid},${c.to})`,
            transition: "width 0.15s ease, background 0.3s ease",
          }}
        />

        {/* Shimmer streak — moves across the fill */}
        {isIdle && (
          <motion.div
            className="absolute inset-y-0 w-20 pointer-events-none"
            style={{
              background: `linear-gradient(90deg,transparent,${c.shimmer},transparent)`,
              x: useTransform(x, [0, maxX], ["-80px", `${maxX + 80}px`]),
            }}
          />
        )}

        {/* Ambient pulse on track when idle */}
        {phase === "idle" && (
          <motion.div
            className="absolute right-6 inset-y-0 flex items-center"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronsRight size={16} style={{ color: `rgba(${c.glow},0.5)` }} />
          </motion.div>
        )}

        {/* Centre label */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: isIdle ? labelOpacity : 0 }}
        >
          <span
            className="font-orbitron text-[10px] font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {label}
          </span>
        </motion.div>

        {/* Success label */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="font-orbitron text-[11px] font-black tracking-[0.18em] text-white">
              CONFIRMED
            </span>
          </motion.div>
        )}

        {/* Error label */}
        {isError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="font-orbitron text-[10px] font-bold tracking-[0.14em] text-red-300">
              FAILED — TRY AGAIN
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Thumb ───────────────────────────────────────────────────────── */}
      <motion.div
        drag={locked ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragStart={() => !locked && setPhase("dragging")}
        onDragEnd={onDragEnd}
        animate={thumbCtrl}
        whileDrag={{ scale: 1.08 }}
        style={{
          x,
          position: "absolute",
          top: PAD,
          left: PAD,
          width:  THUMB,
          height: THUMB,
          zIndex: 10,
          cursor: locked ? "default" : "grab",
        }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -6,
            background: isSuccess
              ? "radial-gradient(circle,rgba(34,197,94,0.6),transparent 70%)"
              : isError
              ? "radial-gradient(circle,rgba(220,38,38,0.5),transparent 70%)"
              : `radial-gradient(circle,rgba(${c.glow},0.55),transparent 70%)`,
            filter: "blur(8px)",
            opacity: isIdle ? glowStrength : 1,
          }}
        />

        {/* Thumb circle */}
        <motion.div
          className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
          style={{ background: thumbBg, boxShadow: thumbShadow }}
          animate={isSuccess ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Inner specular highlight */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.3), transparent 65%)",
            }}
          />

          {/* Spinning ring while confirming */}
          {isConfirming && (
            <motion.div
              className="absolute inset-1.5 rounded-full border-2 border-white/20 border-t-white/70"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
            />
          )}

          {/* Icon */}
          <div className="relative z-10">
            {isConfirming && (
              <motion.div key="spin" variants={iconVariants} initial="hidden" animate="show" exit="exit">
                <Loader2 size={20} className="text-white/80" />
              </motion.div>
            )}
            {isSuccess && (
              <motion.div key="check" variants={iconVariants} initial="hidden" animate="show" exit="exit">
                <Check size={22} className="text-white" strokeWidth={3} />
              </motion.div>
            )}
            {isIdle && (
              <motion.div
                key="arrow"
                variants={iconVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                style={{ opacity: useTransform(x, [0, maxX * 0.5], [1, 0.6], { clamp: true }) }}
              >
                <ChevronRight size={22} className="text-white" strokeWidth={2.5} />
              </motion.div>
            )}
            {isError && (
              <motion.div
                key="err"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-white font-black text-lg"
              >
                ✕
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
