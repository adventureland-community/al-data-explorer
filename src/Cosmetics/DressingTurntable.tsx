import PauseIcon from "@mui/icons-material/Pause";
import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import ThreeSixtyIcon from "@mui/icons-material/ThreeSixty";
import { Box, IconButton, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { ClassLook } from "../gameData/characterLook";
import {
  facingFromYaw,
  facingLabel,
  normalizeYaw,
  shortestYawDelta,
  snapYawToCardinal,
  TURNTABLE_REV_MS,
  TURNTABLE_STEP_MS,
} from "../gameData/turntableYaw";
import { TurntableLook } from "./TurntableLook";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Owns yaw/spin so rAF updates don't re-render the dressing-room paperdoll tree.
 * Discrete facing changes are reported upward for wardrobe tile previews.
 */
export function DressingTurntable({
  look,
  wideStage,
  onFacingChange,
}: {
  look: ClassLook;
  wideStage: boolean;
  onFacingChange?: (facing: number) => void;
}) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [yaw, setYaw] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const yawRef = useRef(0);
  const spinRaf = useRef(0);
  const stepRaf = useRef(0);
  const facingRef = useRef(facingFromYaw(0));

  const stopStepAnim = () => {
    if (stepRaf.current) {
      cancelAnimationFrame(stepRaf.current);
      stepRaf.current = 0;
    }
  };

  const commitYaw = (next: number) => {
    const n = normalizeYaw(next);
    yawRef.current = n;
    setYaw(n);
  };

  const animateYawBy = (delta: number, durationMs = TURNTABLE_STEP_MS) => {
    stopStepAnim();
    setSpinning(false);
    if (reduceMotion || Math.abs(delta) < 0.5) {
      commitYaw(yawRef.current + delta);
      return;
    }
    const from = yawRef.current;
    const to = from + delta;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const value = from + (to - from) * eased;
      yawRef.current = value;
      setYaw(value);
      if (t < 1) {
        stepRaf.current = requestAnimationFrame(tick);
      } else {
        stepRaf.current = 0;
        commitYaw(to);
      }
    };
    stepRaf.current = requestAnimationFrame(tick);
  };

  /** Ease to the nearest Front/Right/Back/Left after a free spin. */
  const snapToCardinal = () => {
    const target = snapYawToCardinal(yawRef.current);
    const delta = shortestYawDelta(yawRef.current, target);
    const durationMs = Math.max(140, TURNTABLE_STEP_MS * (Math.abs(delta) / 90));
    animateYawBy(delta, durationMs);
  };

  const toggleSpin = () => {
    if (spinning) {
      setSpinning(false);
      snapToCardinal();
      return;
    }
    setSpinning(true);
  };

  useEffect(() => {
    if (!spinning) return;
    stopStepAnim();
    let last = performance.now();
    const degPerMs = 360 / TURNTABLE_REV_MS;
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      yawRef.current = normalizeYaw(yawRef.current + degPerMs * dt);
      setYaw(yawRef.current);
      spinRaf.current = requestAnimationFrame(tick);
    };
    spinRaf.current = requestAnimationFrame(tick);
    return () => {
      if (spinRaf.current) cancelAnimationFrame(spinRaf.current);
      spinRaf.current = 0;
    };
  }, [spinning]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        animateYawBy(-90);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        animateYawBy(90);
      } else if (e.key === " " && !(target instanceof HTMLButtonElement)) {
        e.preventDefault();
        toggleSpin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // animate/toggle close over refs; intentional once-per-mount listener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  useEffect(
    () => () => {
      stopStepAnim();
      if (spinRaf.current) cancelAnimationFrame(spinRaf.current);
    },
    [],
  );

  const facing = facingFromYaw(yaw);

  useEffect(() => {
    if (facingRef.current === facing) return;
    facingRef.current = facing;
    onFacingChange?.(facing);
  }, [facing, onFacingChange]);

  return (
    <Box
      sx={{
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.1,
      }}
    >
      <Box sx={{ position: "relative" }}>
        <TurntableLook
          look={look}
          yawDeg={yaw}
          size={wideStage ? "stage" : "preview"}
          flat={reduceMotion}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: "50%",
            bottom: 2,
            width: wideStage ? 58 : 44,
            height: 11,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.38)",
            filter: "blur(2px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.15,
          px: 0.4,
          py: 0.2,
          borderRadius: 999,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: (t) =>
            t.palette.mode === "dark" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.45)",
        }}
      >
        <Tooltip title="Turn left">
          <IconButton size="small" onClick={() => animateYawBy(-90)} aria-label="Turn left">
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography
          variant="caption"
          sx={{
            minWidth: 44,
            textAlign: "center",
            fontWeight: 800,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            fontSize: 10,
            color: "text.secondary",
          }}
        >
          {facingLabel(facing)}
        </Typography>
        <Tooltip title="Turn right">
          <IconButton size="small" onClick={() => animateYawBy(90)} aria-label="Turn right">
            <RedoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={spinning ? "Stop turntable" : "Spin turntable"}>
          <IconButton
            size="small"
            color={spinning ? "warning" : "default"}
            onClick={toggleSpin}
            aria-label={spinning ? "Stop turntable" : "Spin turntable"}
            aria-pressed={spinning}
          >
            {spinning ? <PauseIcon fontSize="small" /> : <ThreeSixtyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
