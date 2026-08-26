import { Box, Typography } from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { ItemInfo, SlotType } from "typed-adventureland";

import { GDataContext, GItems } from "../GDataContext";
import {
  loadoutHasDoublehandConflict,
  withDoublehandEquipInvariant,
} from "../gameData/loadoutStats";
import { itemInfoFromPickerRow, ItemPickerRow } from "../Shared/ItemPicker";
import { ClassChipPicker } from "./ClassChipPicker";
import { GearPaperDoll } from "./GearPaperDoll";
import { GearPickDialog } from "./GearPickDialog";
import { gearSlotFilter } from "./gearSlotFilter";
import { SelectedCharacterClass } from "./types";

export type LoadoutPickerVariant = "planner" | "luck";

/**
 * Shared Loadout picker shell: class chips, paper doll, slot pick with Title/Stat scroll, remove.
 * Hosts keep Save/Load/Import, level, and result panels.
 */
export function LoadoutPickerShell({
  gear,
  onGearChange,
  selectedClass,
  onSelectClass,
  onClearClass,
  classes,
  items,
  variant,
  hint,
}: {
  gear: { [slot in SlotType]?: ItemInfo };
  onGearChange: (gear: { [slot in SlotType]?: ItemInfo }) => void;
  selectedClass?: SelectedCharacterClass;
  onSelectClass: (characterClass: SelectedCharacterClass) => void;
  onClearClass: () => void;
  classes: SelectedCharacterClass[];
  items?: GItems;
  variant: LoadoutPickerVariant;
  hint?: string;
}) {
  const G = useContext(GDataContext);
  const [selectedSlot, setSelectedSlot] = useState<SlotType | false>(false);

  const filterItem = useMemo(() => {
    if (!selectedSlot) return undefined;
    return gearSlotFilter(selectedSlot, selectedClass);
  }, [selectedClass, selectedSlot]);

  if (!G) return null;

  const catalog = items ?? G.items;
  const dhConflict = loadoutHasDoublehandConflict(selectedClass, gear, catalog);

  const removeFromSlot = (slot: SlotType) => {
    onGearChange(withDoublehandEquipInvariant(selectedClass, gear, slot, undefined, catalog));
  };

  const onSelect = (slot: SlotType, row: ItemPickerRow) => {
    setSelectedSlot(false);
    onGearChange(
      withDoublehandEquipInvariant(selectedClass, gear, slot, itemInfoFromPickerRow(row), catalog),
    );
  };

  const pickTitle =
    variant === "luck"
      ? (s: SlotType) => (gear[s] ? `Edit luck gear — ${s}` : `Choose luck gear — ${s}`)
      : (s: SlotType) => (gear[s] ? `Edit ${s}` : `Choose ${s}`);

  const classPicker = (
    <ClassChipPicker
      classes={classes}
      selectedClass={selectedClass}
      onSelect={onSelectClass}
      onClear={onClearClass}
      orientation={variant === "luck" ? "vertical" : "horizontal"}
    />
  );

  const doll = (
    <GearPaperDoll
      gear={gear}
      onSlotClick={setSelectedSlot}
      onRemoveSlot={removeFromSlot}
      dhConflict={dhConflict}
    />
  );

  return (
    <>
      {variant === "luck" ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", gap: 2.5, alignItems: "center" }}>
            <Box sx={{ flexShrink: 0 }}>{classPicker}</Box>
            {doll}
          </Box>
          {hint ? (
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              sx={{ maxWidth: 280 }}
            >
              {hint}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>{classPicker}</Box>
          {doll}
          {hint ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {hint}
            </Typography>
          ) : null}
        </>
      )}
      <GearPickDialog
        slot={selectedSlot}
        items={catalog}
        title={pickTitle}
        filterItem={filterItem}
        onSelect={onSelect}
        onClose={() => setSelectedSlot(false)}
        searchPlaceholder={
          variant === "luck"
            ? "Search items by name, key, or type — set Lucky / Festive title above"
            : undefined
        }
        statColumn={variant === "luck" ? "luck" : undefined}
        titleId={variant === "luck" ? "luck-gear-pick-title" : "scroll-dialog-title"}
        classKey={selectedClass?.className}
        showAffixes
        initialItem={selectedSlot ? gear[selectedSlot] : undefined}
      />
    </>
  );
}
