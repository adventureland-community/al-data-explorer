import { Box } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { GDataContext } from "../GDataContext";
import { ClassLook, classLooks } from "../gameData/characterLook";
import {
  acquireSourcesFor,
  buildAcquireBrowseMeta,
  buildCosmeticAcquireIndex,
  CosmeticAcquireSource,
  slotAcquireHint,
} from "../gameData/cosmeticAcquisition";
import { listCosmeticBundles } from "../gameData/cosmeticBundles";
import {
  deleteSavedOutfit,
  loadSavedOutfits,
  saveOutfit,
  SavedOutfit,
} from "../gameData/cosmeticOutfits";
import { applyCosmeticCompatibility, cosmeticPropLabels } from "../gameData/cosmeticProps";
import {
  AcquireFilter,
  clearCosmeticSlot,
  COSMETIC_SLOT_ORDER,
  CosmeticEntry,
  CosmeticSlot,
  CosmeticSort,
  decodeLook,
  defaultDressingLook,
  encodeLook,
  equipCosmetic,
  equippedId,
  filterCosmetics,
  formatOutfitText,
  listCosmetics,
  sheetTypesForSlot,
  sortCosmetics,
  undressLook,
} from "../gameData/cosmeticsCatalog";
import { LoadingState } from "../Shared/LoadingState";
import { ClassOutfitPreset } from "./ClassOutfitStrip";
import { DressingStage } from "./DressingStage";
import { WardrobePane } from "./WardrobePane";

const SLOT_PARAM = "slot";
const Q_PARAM = "q";
const TYPE_PARAM = "type";
const LOOK_PARAM = "look";
const ACQUIRE_PARAM = "acq";
const SORT_PARAM = "sort";

/** Dressing-room page — URL/state wiring between stage and wardrobe. */
export function DressingRoom() {
  const G = useContext(GDataContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftQuery, setDraftQuery] = useState(searchParams.get(Q_PARAM) ?? "");
  const [compatNotes, setCompatNotes] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | undefined>();
  const [previewFacing, setPreviewFacing] = useState(0);
  const [saved, setSaved] = useState<SavedOutfit[]>(() => loadSavedOutfits());
  const [outfitName, setOutfitName] = useState("");

  const catalog = useMemo(() => (G ? listCosmetics(G) : []), [G]);
  const bundles = useMemo(() => (G ? listCosmeticBundles(G, catalog) : []), [G, catalog]);
  const acquireIndex = useMemo(
    () => (G ? buildCosmeticAcquireIndex(G) : new Map<string, CosmeticAcquireSource[]>()),
    [G],
  );
  const browseMeta = useMemo(() => buildAcquireBrowseMeta(acquireIndex), [acquireIndex]);

  const fallbackLook = useMemo(
    () => (G ? defaultDressingLook(G) : { skin: "marmor6d", cx: {} }),
    [G],
  );

  const slot = (searchParams.get(SLOT_PARAM) as CosmeticSlot | null) ?? "hair";
  const activeSlot: CosmeticSlot = COSMETIC_SLOT_ORDER.includes(slot) ? slot : "hair";
  const query = searchParams.get(Q_PARAM) ?? "";
  const sheetType = searchParams.get(TYPE_PARAM) ?? "";
  const acquireFilter = (searchParams.get(ACQUIRE_PARAM) as AcquireFilter | null) ?? "all";
  const sortMode = (searchParams.get(SORT_PARAM) as CosmeticSort | null) ?? "name";
  const look = useMemo(
    () => decodeLook(searchParams.get(LOOK_PARAM), fallbackLook),
    [searchParams, fallbackLook],
  );

  useEffect(() => {
    if (!focusId) return;
    if (look.skin === focusId) return;
    let owned = false;
    for (const value of Object.values(look.cx)) {
      if (value === focusId) {
        owned = true;
        break;
      }
    }
    if (owned) return;
    const entry = catalog.find((e) => e.id === focusId);
    if (entry?.kind === "emote") return;
    setFocusId(undefined);
  }, [look, focusId, catalog]);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draftQuery === query) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (draftQuery.trim()) next.set(Q_PARAM, draftQuery);
          else next.delete(Q_PARAM);
          return next;
        },
        { replace: true },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [draftQuery, query, setSearchParams]);

  const patchParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setLook = useCallback(
    (nextLook: ClassLook, notes: string[] = []) => {
      setCompatNotes(notes);
      patchParams((next) => {
        next.set(LOOK_PARAM, encodeLook(nextLook));
      });
    },
    [patchParams],
  );

  const setSlot = useCallback(
    (nextSlot: CosmeticSlot) => {
      patchParams((next) => {
        next.set(SLOT_PARAM, nextSlot);
        next.delete(TYPE_PARAM);
      });
    },
    [patchParams],
  );

  const applyLook = useCallback(
    (next: ClassLook) => {
      if (!G) return;
      const applied = applyCosmeticCompatibility(G, next);
      setFocusId(undefined);
      setLook(
        applied.look,
        applied.notes.map((n) => n.message),
      );
    },
    [G, setLook],
  );

  const showingBundles = sheetType === "bundle";

  const filtered = useMemo(() => {
    if (showingBundles) return [];
    const base = filterCosmetics(catalog, {
      slot: activeSlot,
      query,
      sheetType: sheetType || undefined,
      acquire: acquireFilter === "all" ? undefined : acquireFilter,
      availabilityById: browseMeta.availabilityById,
    });
    return sortCosmetics(base, sortMode, {
      shellsById: browseMeta.shellsById,
      chanceById: browseMeta.chanceById,
    });
  }, [catalog, activeSlot, query, sheetType, acquireFilter, browseMeta, sortMode, showingBundles]);

  const typeOptions = useMemo(() => {
    const types = sheetTypesForSlot(catalog, activeSlot);
    if (activeSlot === "skin" && bundles.length) types.push("bundle");
    return types;
  }, [catalog, activeSlot, bundles]);

  const classPresets = useMemo(() => {
    if (!G?.classes) return [] as ClassOutfitPreset[];
    const rows: ClassOutfitPreset[] = [];
    for (const [classKey, gClass] of Object.entries(G.classes)) {
      const looks = classLooks(gClass);
      for (let i = 0; i < looks.length; i += 1) {
        const entry = looks[i];
        if (!entry) continue;
        rows.push({ classKey, lookIndex: i, look: entry });
      }
    }
    return rows;
  }, [G]);

  if (!G) return <LoadingState label="Loading game data…" />;

  const equipped = equippedId(look, activeSlot);
  const panelId = focusId ?? equipped;
  const panelSources = panelId ? acquireSourcesFor(acquireIndex, panelId) : [];
  const slotHint = slotAcquireHint(activeSlot, G);

  const onEquipEntry = (entry: CosmeticEntry, preview?: ClassLook) => {
    setFocusId(entry.id);
    if (entry.sheetType === "bundle" && preview) {
      const applied = applyCosmeticCompatibility(G, preview);
      setLook(
        applied.look,
        applied.notes.map((n) => n.message),
      );
      return;
    }
    if (entry.kind === "emote") {
      setFocusId(entry.id);
      return;
    }
    const result = equipCosmetic(look, entry, G);
    setLook(
      result.look,
      result.notes.map((n) => n.message),
    );
  };

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(300px, 38%) minmax(0, 1fr)",
          lg: "minmax(380px, 480px) minmax(0, 1fr)",
        },
        gridTemplateRows: { xs: "minmax(0, auto) minmax(0, 1fr)", md: "minmax(0, 1fr)" },
        gap: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          minHeight: 0,
          maxHeight: { xs: "46vh", md: "none" },
          borderRight: { md: "1px solid" },
          borderBottom: { xs: "1px solid", md: "none" },
          borderColor: "divider",
          p: { xs: 1.25, sm: 1.75, md: 2 },
          overflow: "auto",
          position: { md: "sticky", lg: "relative" },
          top: 0,
          alignSelf: "stretch",
        }}
      >
        <DressingStage
          look={look}
          activeSlot={activeSlot}
          onFacingChange={setPreviewFacing}
          onSelectSlot={setSlot}
          onClearSlot={(s) => {
            const prevId = equippedId(look, s);
            const next = clearCosmeticSlot(look, s);
            const applied = applyCosmeticCompatibility(G, next);
            if (prevId && focusId === prevId) setFocusId(undefined);
            setLook(
              applied.look,
              applied.notes.map((n) => n.message),
            );
          }}
          onUndress={() => {
            setFocusId(undefined);
            setLook(undressLook(look), []);
          }}
          onReset={() => {
            setFocusId(undefined);
            setLook(defaultDressingLook(G), []);
          }}
          onCopyLink={async () => {
            await navigator.clipboard.writeText(window.location.href);
          }}
          onCopyList={async () => {
            await navigator.clipboard.writeText(formatOutfitText(look));
          }}
        />
      </Box>

      <WardrobePane
        activeSlot={activeSlot}
        slotHint={slotHint}
        look={look}
        equipped={equipped}
        focusId={focusId}
        draftQuery={draftQuery}
        onDraftQuery={setDraftQuery}
        panelId={panelId}
        panelSources={panelSources}
        propLabels={panelId ? cosmeticPropLabels(G, panelId) : []}
        compatNotes={compatNotes}
        classPresets={classPresets}
        previewFacing={previewFacing}
        onApplyLook={applyLook}
        saved={saved}
        outfitName={outfitName}
        onOutfitNameChange={setOutfitName}
        onSaveOutfit={() => {
          setSaved(saveOutfit(outfitName || `Look ${saved.length + 1}`, look));
          setOutfitName("");
        }}
        onDeleteOutfit={(id) => setSaved(deleteSavedOutfit(id))}
        acquireFilter={acquireFilter}
        sortMode={sortMode}
        sheetType={sheetType}
        typeOptions={typeOptions}
        onAcquire={(value) =>
          patchParams((next) => {
            if (value === "all") next.delete(ACQUIRE_PARAM);
            else next.set(ACQUIRE_PARAM, value);
          })
        }
        onSort={(v) =>
          patchParams((next) => {
            if (v === "name") next.delete(SORT_PARAM);
            else next.set(SORT_PARAM, v);
          })
        }
        onSheetType={(t) =>
          patchParams((next) => {
            if (!t) next.delete(TYPE_PARAM);
            else next.set(TYPE_PARAM, t);
          })
        }
        showingBundles={showingBundles}
        bundles={bundles}
        filtered={filtered}
        catalog={catalog}
        acquireIndex={acquireIndex}
        browseMeta={browseMeta}
        onEquipEntry={onEquipEntry}
      />
    </Box>
  );
}
