import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ListAltIcon from "@mui/icons-material/ListAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CheckIcon from "@mui/icons-material/Check";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import {
  Box,
  Button,
  ButtonGroup,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";

import {
  COSMETIC_SLOT_LABEL,
  CosmeticSlot,
  PAPERDOLL_LEFT,
  PAPERDOLL_RIGHT,
  PAPERDOLL_STRIP,
} from "../gameData/cosmeticsCatalog";
import { ClassLook } from "../gameData/characterLook";
import { DressingTurntable } from "./DressingTurntable";
import { PaperdollSlot } from "./PaperdollSlot";

export function DressingStage({
  look,
  activeSlot,
  onSelectSlot,
  onClearSlot,
  onUndress,
  onReset,
  onCopyLink,
  onCopyList,
  onFacingChange,
}: {
  look: ClassLook;
  activeSlot: CosmeticSlot;
  onSelectSlot: (slot: CosmeticSlot) => void;
  onClearSlot: (slot: CosmeticSlot) => void;
  onUndress: () => void;
  onReset: () => void;
  onCopyLink: () => Promise<void> | void;
  onCopyList: () => Promise<void> | void;
  onFacingChange?: (facing: number) => void;
}) {
  const theme = useTheme();
  const flanking = useMediaQuery(theme.breakpoints.up("md"));
  const wideStage = useMediaQuery(theme.breakpoints.up("sm"));
  const [copied, setCopied] = useState<"link" | "list" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const slotProps = {
    look,
    onSelect: onSelectSlot,
    onClear: onClearSlot,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: { xs: 1, md: 1.25 },
        minHeight: 0,
      }}
    >
      <Box sx={{ px: 0.25 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 2.2, color: "text.secondary", lineHeight: 1 }}
        >
          Dressing room
        </Typography>
        <Typography
          variant={wideStage ? "h5" : "h6"}
          sx={{ fontWeight: 700, lineHeight: 1.15, mt: 0.35 }}
        >
          {COSMETIC_SLOT_LABEL[activeSlot]}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.4, display: { xs: "none", sm: "block" }, maxWidth: 36 * 8 }}
        >
          Stage a look like a transmog pane — pick a slot to browse, × to unequip, spin to turn.
        </Typography>
      </Box>

      <Box
        sx={{
          minHeight: { xs: 220, sm: 260, md: 300 },
          display: "grid",
          gridTemplateColumns: flanking ? "auto minmax(160px, 1fr) auto" : "1fr",
          gridTemplateRows: flanking ? "1fr" : "auto auto",
          alignItems: "center",
          justifyItems: "center",
          gap: { xs: 1.1, md: 1.75 },
          px: { xs: 1, md: 1.35 },
          py: { xs: 1.5, md: 1.85 },
          borderRadius: "10px",
          position: "relative",
          overflow: "visible",
          border: "1px solid",
          borderColor: "divider",
          background: (t) =>
            t.palette.mode === "dark"
              ? `
                radial-gradient(ellipse 68% 52% at 50% 40%, rgba(196, 160, 90, 0.16) 0%, transparent 64%),
                radial-gradient(ellipse 90% 70% at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 55%),
                linear-gradient(180deg, #2c313c 0%, #16181e 58%, #0e1014 100%)
              `
              : `
                radial-gradient(ellipse 68% 52% at 50% 40%, rgba(180, 140, 70, 0.14) 0%, transparent 64%),
                linear-gradient(180deg, #ebe6dc 0%, #d8d2c6 100%)
              `,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
            pointerEvents: "none",
          },
        }}
      >
        {flanking ? (
          <Stack spacing={1.15} sx={{ zIndex: 1 }}>
            {PAPERDOLL_LEFT.map((slot) => (
              <PaperdollSlot key={slot} slot={slot} active={activeSlot === slot} {...slotProps} />
            ))}
          </Stack>
        ) : null}

        <Box sx={{ gridColumn: flanking ? "auto" : "1" }}>
          <DressingTurntable look={look} wideStage={wideStage} onFacingChange={onFacingChange} />
        </Box>

        {flanking ? (
          <Stack spacing={1.15} sx={{ zIndex: 1 }}>
            {PAPERDOLL_RIGHT.map((slot) => (
              <PaperdollSlot key={slot} slot={slot} active={activeSlot === slot} {...slotProps} />
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              zIndex: 1,
              gridColumn: "1",
              width: "100%",
              display: "flex",
              gap: 0.65,
              overflowX: "auto",
              px: 0.25,
              pb: 0.25,
              scrollSnapType: "x proximity",
              justifyContent: "flex-start",
            }}
          >
            {PAPERDOLL_STRIP.map((slot) => (
              <Box key={slot} sx={{ scrollSnapAlign: "start" }}>
                <PaperdollSlot slot={slot} active={activeSlot === slot} dense {...slotProps} />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <ButtonGroup
        size="small"
        variant="outlined"
        sx={{
          alignSelf: { xs: "stretch", sm: "flex-start" },
          "& .MuiButton-root": { textTransform: "none", fontWeight: 600 },
        }}
      >
        <Button startIcon={<CheckroomIcon />} onClick={onUndress}>
          Undress
        </Button>
        <Button startIcon={<RestartAltIcon />} onClick={onReset}>
          Reset
        </Button>
        <Button
          startIcon={copied === "link" ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={() => {
            Promise.resolve(onCopyLink()).then(() => setCopied("link"));
          }}
        >
          {copied === "link" ? "Copied" : "Link"}
        </Button>
        <Button
          startIcon={copied === "list" ? <CheckIcon /> : <ListAltIcon />}
          onClick={() => {
            Promise.resolve(onCopyList()).then(() => setCopied("list"));
          }}
        >
          {copied === "list" ? "Copied" : "List"}
        </Button>
      </ButtonGroup>
    </Box>
  );
}
