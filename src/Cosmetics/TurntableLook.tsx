import { Box } from "@mui/material";

import { ClassLook } from "../gameData/characterLook";
import { facingFromYaw, turntableFaceViews } from "../gameData/turntableYaw";
import { CHARACTER_LOOK_SIZE, CharacterLook, CharacterLookSizeName } from "../Shared/CharacterLook";

/**
 * Card-flip turntable: one sprite card rotates toward edge-on, swaps facing
 * while thin, then opens again — so the handoff is hidden in the edge.
 */
export function TurntableLook({
  look,
  yawDeg,
  size = "stage",
  flat = false,
}: {
  look: ClassLook;
  yawDeg: number;
  size?: CharacterLookSizeName;
  /** Skip 3D (prefers-reduced-motion). */
  flat?: boolean;
}) {
  const preset = CHARACTER_LOOK_SIZE[size];
  const { width, height } = preset;

  if (flat) {
    return (
      <CharacterLook
        look={look}
        alt="dressing room stage"
        size={size}
        direction={facingFromYaw(yawDeg)}
        overflow="visible"
      />
    );
  }

  const faces = turntableFaceViews(yawDeg);
  // Resting cardinal: stay out of perspective/preserve-3d so CSS sheet animation paints.
  const atRest = faces.length === 1 && Math.abs(faces[0]?.tiltDeg ?? 0) < 0.05;
  if (atRest && faces[0]) {
    return (
      <CharacterLook
        look={look}
        alt="dressing room stage"
        size={size}
        direction={faces[0].alFacing}
        overflow="visible"
      />
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        perspective: 1100,
        perspectiveOrigin: "50% 42%",
      }}
    >
      <Box
        role="img"
        aria-label="dressing room stage"
        sx={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {faces.map((face) => (
          <Box
            key={face.alFacing}
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              transformStyle: "flat",
              transformOrigin: "50% 50%",
              transform: `rotateY(${-face.tiltDeg}deg)`,
              visibility: face.visible ? "visible" : "hidden",
              opacity: face.opacity,
              zIndex: Math.round(face.opacity * 10),
              pointerEvents: "none",
            }}
          >
            <CharacterLook
              look={look}
              alt=""
              size={size}
              direction={face.alFacing}
              overflow="visible"
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
