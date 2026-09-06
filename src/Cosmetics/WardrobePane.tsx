import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";

import { ClassLook } from "../gameData/characterLook";
import {
  AcquireBrowseMeta,
  acquireSourcesFor,
  CosmeticAcquireSource,
  formatAcquireSummary,
} from "../gameData/cosmeticAcquisition";
import { CosmeticBundle, bundleTileEntry } from "../gameData/cosmeticBundles";
import { SavedOutfit } from "../gameData/cosmeticOutfits";
import {
  AcquireFilter,
  COSMETIC_SLOT_LABEL,
  CosmeticEntry,
  CosmeticSlot,
  CosmeticSort,
} from "../gameData/cosmeticsCatalog";
import { AcquirePanel } from "./AcquirePanel";
import { ClassOutfitPreset, ClassOutfitStrip } from "./ClassOutfitStrip";
import { CosmeticTile } from "./CosmeticTile";
import { SavedOutfitsStrip } from "./SavedOutfitsStrip";
import { WardrobeToolbar } from "./WardrobeToolbar";

/** Right-hand wardrobe: search, acquire panel, outfits, filters, tile grid. */
export function WardrobePane({
  activeSlot,
  slotHint,
  look,
  equipped,
  focusId,
  draftQuery,
  onDraftQuery,
  panelId,
  panelSources,
  propLabels,
  compatNotes,
  classPresets,
  previewFacing,
  onApplyLook,
  saved,
  outfitName,
  onOutfitNameChange,
  onSaveOutfit,
  onDeleteOutfit,
  acquireFilter,
  sortMode,
  sheetType,
  typeOptions,
  onAcquire,
  onSort,
  onSheetType,
  showingBundles,
  bundles,
  filtered,
  catalog,
  acquireIndex,
  browseMeta,
  onEquipEntry,
}: {
  activeSlot: CosmeticSlot;
  slotHint: string;
  look: ClassLook;
  equipped: string | undefined;
  focusId: string | undefined;
  draftQuery: string;
  onDraftQuery: (q: string) => void;
  panelId: string | undefined;
  panelSources: CosmeticAcquireSource[];
  propLabels: string[];
  compatNotes: string[];
  classPresets: ClassOutfitPreset[];
  previewFacing: number;
  onApplyLook: (look: ClassLook) => void;
  saved: SavedOutfit[];
  outfitName: string;
  onOutfitNameChange: (name: string) => void;
  onSaveOutfit: () => void;
  onDeleteOutfit: (id: string) => void;
  acquireFilter: AcquireFilter;
  sortMode: CosmeticSort;
  sheetType: string;
  typeOptions: string[];
  onAcquire: (value: AcquireFilter) => void;
  onSort: (value: CosmeticSort) => void;
  onSheetType: (value: string | null) => void;
  showingBundles: boolean;
  bundles: CosmeticBundle[];
  filtered: CosmeticEntry[];
  catalog: CosmeticEntry[];
  acquireIndex: Map<string, CosmeticAcquireSource[]>;
  browseMeta: AcquireBrowseMeta;
  onEquipEntry: (entry: CosmeticEntry, preview?: ClassLook) => void;
}) {
  const panelEntry = (() => {
    if (!panelId) return undefined;
    const fromCatalog = catalog.find((e) => e.id === panelId);
    if (fromCatalog) return fromCatalog;
    const bundle = bundles.find((b) => b.id === panelId);
    return bundle ? bundleTileEntry(bundle) : undefined;
  })();
  return (
    <Box
      sx={{
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1, md: 1.25 },
        p: { xs: 1.25, sm: 1.75, md: 2 },
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {COSMETIC_SLOT_LABEL[activeSlot]} collection
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {showingBundles
              ? `${bundles.length} bundles`
              : `${filtered.length} appearance${filtered.length === 1 ? "" : "s"}`}
            {equipped ? ` · wearing ${equipped}` : " · nothing equipped"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.35, whiteSpace: "normal", lineHeight: 1.35 }}
          >
            {slotHint}
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search id…"
          value={draftQuery}
          onChange={(e) => onDraftQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 220, md: 260 }, flexShrink: 0 }}
        />
      </Stack>

      <AcquirePanel
        cosmeticId={panelId}
        sources={panelSources}
        entry={panelEntry}
        availability={panelId ? browseMeta.availabilityById.get(panelId) : undefined}
        propLabels={propLabels}
        compatibilityNotes={compatNotes}
      />

      <ClassOutfitStrip
        presets={classPresets}
        currentLook={look}
        facing={previewFacing}
        onSelect={onApplyLook}
      />

      <SavedOutfitsStrip
        saved={saved}
        outfitName={outfitName}
        facing={previewFacing}
        onOutfitNameChange={onOutfitNameChange}
        onSave={onSaveOutfit}
        onLoad={onApplyLook}
        onDelete={onDeleteOutfit}
      />

      <WardrobeToolbar
        acquireFilter={acquireFilter}
        sortMode={sortMode}
        sheetType={sheetType}
        typeOptions={typeOptions}
        onAcquire={onAcquire}
        onSort={onSort}
        onSheetType={onSheetType}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(auto-fill, minmax(96px, 1fr))",
            sm: "repeat(auto-fill, minmax(104px, 1fr))",
            md: "repeat(auto-fill, minmax(112px, 1fr))",
          },
          gap: { xs: 0.85, md: 1 },
          alignContent: "start",
          pr: 0.5,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {showingBundles ? (
          bundles.map((bundle) => {
            const entry = bundleTileEntry(bundle);
            const sources = acquireSourcesFor(acquireIndex, bundle.id);
            return (
              <CosmeticTile
                key={bundle.id}
                entry={{ ...entry, kind: "bundle" }}
                base={look}
                previewLook={bundle.look}
                selected={false}
                availability={browseMeta.availabilityById.get(bundle.id) ?? "unpublished"}
                acquireSummary={formatAcquireSummary(sources)}
                direction={previewFacing}
                onSelect={() => onEquipEntry(entry, bundle.look)}
              />
            );
          })
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              gridColumn: "1 / -1",
              py: 6,
              px: 2,
              textAlign: "center",
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              No matches
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Try another search or clear the acquire / type filters.
            </Typography>
          </Box>
        ) : (
          filtered.map((entry) => {
            const sources = acquireSourcesFor(acquireIndex, entry.id);
            return (
              <CosmeticTile
                key={entry.id}
                entry={entry}
                base={look}
                selected={entry.kind === "emote" ? focusId === entry.id : equipped === entry.id}
                availability={browseMeta.availabilityById.get(entry.id) ?? "unpublished"}
                acquireSummary={formatAcquireSummary(sources)}
                direction={previewFacing}
                onSelect={(next) => onEquipEntry(next)}
              />
            );
          })
        )}
      </Box>
    </Box>
  );
}
