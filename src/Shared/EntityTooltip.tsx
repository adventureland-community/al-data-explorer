import { Box, Popover, Stack, Typography } from "@mui/material";
import { useContext, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from "react";

import {
  buildEntityTooltipModel,
  type EntityRef,
  type EntityTooltipLine,
} from "../gameData/entityTooltip";
import { GDataContext } from "../GDataContext";
import { getFullItemName } from "./iteminfo-util";
import { JsonHighlight } from "./JsonHighlight";

const BODY_MAX_HEIGHT = 260;
const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 400;

function stopBubble(event: SyntheticEvent) {
  event.stopPropagation();
}

function TooltipLines({ lines }: { lines: EntityTooltipLine[] }) {
  if (lines.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No details.
      </Typography>
    );
  }

  return (
    <Box sx={{ fontSize: 12, lineHeight: 1.45 }}>
      {lines.map((line) =>
        line.kind === "text" ? (
          <Typography
            key={`text:${line.text}`}
            component="p"
            sx={{ m: 0, mb: 0.5, fontSize: 12, color: line.color ?? "text.secondary" }}
          >
            {line.text}
          </Typography>
        ) : (
          <Box
            key={`stat:${line.label}:${line.value}`}
            sx={{ display: "flex", gap: 0.75, mb: 0.15 }}
          >
            <Box
              component="span"
              sx={{ color: line.labelColor ?? "text.secondary", minWidth: 72, flexShrink: 0 }}
            >
              {line.label}
            </Box>
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: line.valueColor ?? "text.primary",
              }}
            >
              {line.value}
            </Box>
          </Box>
        ),
      )}
    </Box>
  );
}

type EntityTooltipProps = {
  entity: EntityRef;
  children: ReactNode;
};

/**
 * Shared hover card for items, monsters, and NPCs.
 * Opens below the trigger so the pointer can reach Pretty/JSON without crossing a dead gap.
 */
export function EntityTooltip({ entity, children }: EntityTooltipProps) {
  const G = useContext(GDataContext);
  const [view, setView] = useState<"pretty" | "json">("pretty");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = Boolean(anchorEl);

  const model = useMemo(() => (G ? buildEntityTooltipModel(entity, G) : null), [G, entity]);

  const displayName = useMemo(() => {
    if (!G || !model) return entity.key;
    if (entity.kind === "item") {
      return getFullItemName(
        {
          name: entity.key as never,
          level: entity.level ?? 0,
          ...(entity.title ? { p: entity.title as never } : {}),
          ...(entity.statType ? { stat_type: entity.statType as never } : {}),
        },
        G,
      );
    }
    return model.displayName;
  }, [G, entity, model]);

  const clearTimers = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const keepOpen = () => {
    clearTimers();
  };

  const scheduleOpen = (el: HTMLElement) => {
    clearTimers();
    openTimer.current = setTimeout(() => setAnchorEl(el), OPEN_DELAY_MS);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => {
      setAnchorEl(null);
      setView("pretty");
    }, CLOSE_DELAY_MS);
  };

  if (!model) {
    return <>{children}</>;
  }

  return (
    <>
      <Box
        component="span"
        sx={{ display: "inline-flex", verticalAlign: "inherit" }}
        onMouseEnter={(event) => scheduleOpen(event.currentTarget)}
        onMouseLeave={scheduleClose}
      >
        {children}
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        disableRestoreFocus
        // Modal root otherwise covers the trigger → mouseleave → close → re-enter loop.
        hideBackdrop
        disableScrollLock
        disableAutoFocus
        disableEnforceFocus
        style={{ pointerEvents: "none" }}
        // Below the trigger: pointer travels into the card instead of through empty air.
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          onMouseEnter: keepOpen,
          onMouseLeave: scheduleClose,
          onClick: stopBubble,
          onMouseDown: stopBubble,
          sx: {
            pointerEvents: "auto",
            width: 300,
            maxWidth: "calc(100vw - 16px)",
            mt: 0.5,
            p: 1.25,
            bgcolor: "#111",
            color: "#e8e8e8",
            border: "4px solid #555",
            borderRadius: 0,
            boxShadow: "none",
            // Bridge the small offset so leave→enter does not drop hover.
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              right: 0,
              top: -10,
              height: 10,
            },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 0.75, pb: 0.75, borderBottom: "2px dashed #666" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.25,
                color: "#E4E4E4",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "#9a9a9a", lineHeight: 1.3 }}>
              {model.key}
              {model.badges.length > 0 ? ` · ${model.badges.join(" · ")}` : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
            <Box
              component="button"
              type="button"
              onClick={(event) => {
                stopBubble(event);
                keepOpen();
                setView("pretty");
              }}
              sx={{
                all: "unset",
                cursor: "pointer",
                fontSize: 11,
                color: view === "pretty" ? "#fff" : "#888",
                textDecoration: view === "pretty" ? "underline" : "none",
              }}
            >
              Pretty
            </Box>
            <Box
              component="button"
              type="button"
              onClick={(event) => {
                stopBubble(event);
                keepOpen();
                setView("json");
              }}
              sx={{
                all: "unset",
                cursor: "pointer",
                fontSize: 11,
                color: view === "json" ? "#fff" : "#888",
                textDecoration: view === "json" ? "underline" : "none",
              }}
            >
              JSON
            </Box>
          </Stack>
        </Stack>

        <Box
          sx={{
            maxHeight: BODY_MAX_HEIGHT,
            overflow: "auto",
            pr: 0.25,
          }}
          onMouseDown={stopBubble}
          onClick={stopBubble}
        >
          {view === "pretty" ? (
            <TooltipLines lines={model.lines} />
          ) : (
            <JsonHighlight value={model.json} />
          )}
        </Box>
      </Popover>
    </>
  );
}

/** Item-shaped wrapper kept for existing call sites. */
export function ItemTooltip({
  itemName,
  level = 0,
  title = "",
  statType,
  quantity,
  children,
}: {
  itemName: string;
  level?: number;
  title?: string;
  /** Property/stat scroll type (ItemInfo.stat_type). */
  statType?: string;
  quantity?: number;
  children: ReactNode;
}) {
  const entity = useMemo<EntityRef>(
    () => ({
      kind: "item",
      key: itemName,
      level,
      title: title || undefined,
      statType: statType || undefined,
      quantity,
    }),
    [itemName, level, quantity, title, statType],
  );

  return <EntityTooltip entity={entity}>{children}</EntityTooltip>;
}
