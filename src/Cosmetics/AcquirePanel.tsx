import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Chip, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ReactNode } from "react";

import {
  acquireAvailability,
  CosmeticAcquireSource,
  dropSourceDeepLink,
  dropsDeepLink,
  formatAcquireOdds,
  itemDeepLink,
} from "../gameData/cosmeticAcquisition";
import { COSMETIC_SLOT_LABEL, CosmeticEntry } from "../gameData/cosmeticsCatalog";
import { isAnimatedCosmeticType } from "../gameData/spriteSkinLayout";
import { ItemImage } from "../ItemImage";
import { MonsterImage, NpcImage, SpriteSkin } from "../Shared/SpriteSkin";

type Availability = "free" | "pack" | "unpublished";

const AVAIL_CHIP: Record<
  Availability,
  { label: string; color: "success" | "warning" | "default" }
> = {
  free: { label: "Free", color: "success" },
  pack: { label: "Unlockable", color: "warning" },
  unpublished: { label: "Not in game", color: "default" },
};

const ICON = 44;

function IconWell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Box
      title={title}
      sx={{
        width: ICON,
        height: ICON,
        flexShrink: 0,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        background: (theme) =>
          theme.palette.mode === "dark" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
}

function SourceRow({
  kindLabel,
  title,
  subtitle,
  chance,
  icons,
  links,
}: {
  kindLabel: string;
  title: string;
  subtitle?: string;
  chance?: number;
  icons?: ReactNode;
  links?: { label: string; to: string }[];
}) {
  const odds = formatAcquireOdds(chance, true).replace(/^ · /, "");
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: icons
          ? {
              xs: "auto minmax(0, 1fr)",
              sm: "auto minmax(0, 1fr) auto",
            }
          : {
              xs: "minmax(0, 1fr)",
              sm: "minmax(0, 1fr) auto",
            },
        gap: { xs: 0.75, sm: 1.25 },
        alignItems: "center",
        px: 1.1,
        py: 0.85,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        background: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      }}
    >
      {icons ? (
        <Stack
          direction="row"
          spacing={0.65}
          alignItems="center"
          sx={{ gridRow: { xs: "1 / 3", sm: "auto" } }}
        >
          {icons}
        </Stack>
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "text.secondary",
            lineHeight: 1.2,
            mb: 0.2,
          }}
        >
          {kindLabel}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.1 }}>
            {subtitle}
          </Typography>
        ) : null}
        {links && links.length > 0 ? (
          <Stack direction="row" spacing={1.25} sx={{ mt: 0.4 }} flexWrap="wrap">
            {links.map((link) => (
              <Link
                key={link.to}
                component={RouterLink}
                to={link.to}
                variant="caption"
                underline="hover"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.35 }}
              >
                {link.label} <OpenInNewIcon sx={{ fontSize: 12 }} />
              </Link>
            ))}
          </Stack>
        ) : null}
      </Box>
      {odds ? (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: "warning.light",
            whiteSpace: "nowrap",
            justifySelf: { sm: "end" },
            gridColumn: { xs: icons ? "2" : "1", sm: "auto" },
          }}
          title={odds}
        >
          {odds}
        </Typography>
      ) : null}
    </Box>
  );
}

function CosmeticIcon({ cosmeticId, label }: { cosmeticId: string; label?: string }) {
  return (
    <IconWell title={label ?? cosmeticId}>
      <SpriteSkin skin={cosmeticId} alt={label ?? cosmeticId} scale={1.55} />
    </IconWell>
  );
}

function CosmoSourceIcons({
  src,
  cosmeticId,
  label,
}: {
  src: CosmeticAcquireSource;
  cosmeticId: string;
  label?: string;
}) {
  return (
    <>
      <CosmeticIcon cosmeticId={cosmeticId} label={label} />
      {src.packId ? (
        <IconWell title={src.packName ?? src.packId}>
          <ItemImage itemName={src.packId} size={36} />
        </IconWell>
      ) : null}
      {src.vendorId ? (
        <IconWell title={src.vendorName ?? src.vendorId}>
          <NpcImage npcId={src.vendorId} scale={1.35} tooltip={false} />
        </IconWell>
      ) : null}
      {src.exchangeNpcId ? (
        <IconWell title={src.exchangeNpcName ?? src.exchangeNpcId}>
          <NpcImage npcId={src.exchangeNpcId} scale={1.35} tooltip={false} />
        </IconWell>
      ) : null}
    </>
  );
}

/** Drop path: cosmetic · jar/bundle · monster (or table item). */
function DropSourceIcons({
  src,
  cosmeticId,
  label,
}: {
  src: CosmeticAcquireSource;
  cosmeticId: string;
  label?: string;
}) {
  return (
    <>
      <CosmeticIcon cosmeticId={cosmeticId} label={label} />
      {src.dropItemKey ? (
        <IconWell title={src.note ?? src.dropItemKey}>
          <ItemImage itemName={src.dropItemKey} size={36} />
        </IconWell>
      ) : null}
      {src.dropSourceType === "monster" && src.dropSourceKey ? (
        <IconWell title={src.dropSourceName ?? src.dropSourceKey}>
          <MonsterImage monsterName={src.dropSourceKey} scale={1.55} tooltip={false} />
        </IconWell>
      ) : null}
      {src.dropSourceType === "table" && src.dropSourceKey ? (
        <IconWell title={src.dropSourceName ?? src.dropSourceKey}>
          <ItemImage itemName={src.dropSourceKey} size={36} />
        </IconWell>
      ) : null}
    </>
  );
}

/** Selected / equipped cosmetic inspector — status chips + icon-led unlock paths. */
export function AcquirePanel({
  cosmeticId,
  sources,
  entry,
  availability,
  propLabels,
  compatibilityNotes,
}: {
  cosmeticId: string | undefined;
  sources: CosmeticAcquireSource[];
  entry?: CosmeticEntry;
  availability?: Availability;
  propLabels?: string[];
  compatibilityNotes?: string[];
}) {
  if (!cosmeticId) {
    return (
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          border: "1px dashed",
          borderColor: "divider",
          textAlign: "left",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Select an appearance to see how it’s unlocked — shells, pack odds, drops, and shop links.
        </Typography>
      </Box>
    );
  }

  const cosmo = sources.filter((s) => s.kind === "cosmo");
  const drops = sources.filter((s) => s.kind === "drop");
  const isClass = sources.some((s) => s.kind === "class");
  const avail = availability ?? acquireAvailability(sources);
  const chip = AVAIL_CHIP[avail];
  const animated = entry ? isAnimatedCosmeticType(entry.sheetType) : false;
  const unpublished = avail === "unpublished";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.85,
        px: 1.25,
        py: 1.15,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: unpublished ? "warning.dark" : "divider",
        background: (theme) =>
          unpublished
            ? theme.palette.mode === "dark"
              ? "rgba(255, 167, 38, 0.08)"
              : "rgba(237, 108, 2, 0.08)"
            : theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
        textAlign: "left",
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ gap: 0.75 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            {entry?.label ?? cosmeticId}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.2 }}>
            {[
              entry ? COSMETIC_SLOT_LABEL[entry.slot] : null,
              entry?.sheetType && entry.sheetType !== "emote" ? entry.sheetType : null,
              entry?.label && entry.label !== entry.id ? entry.id : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
          <Chip size="small" label={chip.label} color={chip.color} variant="filled" />
          {animated ? (
            <Chip size="small" label="Animated" color="warning" variant="outlined" />
          ) : null}
          {isClass ? (
            <Chip size="small" label="Class default" color="success" variant="outlined" />
          ) : null}
        </Stack>
      </Stack>

      {unpublished ? (
        <Typography
          variant="body2"
          sx={{ color: "warning.light", fontWeight: 600, lineHeight: 1.4 }}
        >
          No class default, cosmo pack, or drop-table row for this id in G (WIP / staff-only).
        </Typography>
      ) : null}

      <Stack spacing={0.65}>
        {isClass && cosmo.length === 0 && drops.length === 0 ? (
          <SourceRow
            kindLabel="Class"
            title="Starting look"
            subtitle="Included free on a class outfit"
          />
        ) : null}

        {cosmo.map((src) => (
          <SourceRow
            key={`${src.packId ?? "pack"}-${src.note ?? "cx"}-${src.weight ?? 0}`}
            kindLabel={src.note?.includes("bundle") ? "Bundle pack" : "Cosmo pack"}
            title={src.packName ?? src.packId ?? "Unknown pack"}
            subtitle={[
              src.shells != null ? `${src.shells} shells` : null,
              src.vendorName ? `buy at ${src.vendorName}` : null,
              src.exchangeNpcName ? `exchange at ${src.exchangeNpcName}` : null,
              src.note && !src.note.includes("bundle") ? src.note : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            chance={src.chance}
            icons={
              <CosmoSourceIcons
                src={src}
                cosmeticId={cosmeticId}
                label={entry?.label ?? cosmeticId}
              />
            }
            links={
              src.packId
                ? [
                    { label: "Item", to: itemDeepLink(src.packId) },
                    { label: "Drop table", to: dropsDeepLink(src.packId) },
                  ]
                : undefined
            }
          />
        ))}

        {drops.map((src) => {
          const link = dropSourceDeepLink(src);
          return (
            <SourceRow
              key={`${src.dropSourceType}-${src.dropSourceKey}-${src.note ?? "cx"}-${
                src.chance ?? 0
              }`}
              kindLabel={src.note ?? "Drop"}
              title={src.dropSourceName ?? src.dropSourceKey ?? "Unknown"}
              subtitle={
                src.dropSourceType
                  ? `${src.dropSourceType} drop${
                      src.dropSourceKey && src.dropSourceKey !== src.dropSourceName
                        ? ` · ${src.dropSourceKey}`
                        : ""
                    }`
                  : undefined
              }
              chance={src.chance}
              icons={
                <DropSourceIcons
                  src={src}
                  cosmeticId={cosmeticId}
                  label={entry?.label ?? cosmeticId}
                />
              }
              links={link ? [{ label: "Source", to: link }] : undefined}
            />
          );
        })}
      </Stack>

      {propLabels && propLabels.length > 0 ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
          {propLabels.map((flag) => (
            <Chip key={flag} size="small" label={flag} variant="outlined" />
          ))}
        </Stack>
      ) : null}

      {compatibilityNotes && compatibilityNotes.length > 0 ? (
        <Typography variant="caption" color="warning.light">
          {compatibilityNotes.join(" · ")}
        </Typography>
      ) : null}
    </Box>
  );
}
