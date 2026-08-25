import { Dialog, DialogContent, DialogTitle, Grid } from "@mui/material";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { GItem, ItemKey, ItemType, OffhandType, SlotType, WeaponType } from "typed-adventureland";

import { GDataContext, GItems } from "../GDataContext";
import { ItemSourcesPanel } from "../Items/components/ItemSourcesPanel";
import { ItemPicker, ItemPickerRow } from "../Shared/ItemPicker";
import { SelectedCharacterClass } from "./types";

export type RowItem = ItemPickerRow;

function buildSlotFilter(
  slot: SlotType | false,
  selectedCharacterClass?: SelectedCharacterClass,
): ((itemName: ItemKey, gItem: GItem) => boolean) | undefined {
  if (!slot) return undefined;

  const validTypes: ItemType[] = [];
  const validWeaponTypes: Array<WeaponType | OffhandType> = [];

  switch (slot) {
    case "mainhand":
      validTypes.push("weapon");
      if (selectedCharacterClass) {
        validWeaponTypes.push(...(Object.keys(selectedCharacterClass.mainhand) as WeaponType[]));
        validWeaponTypes.push(...(Object.keys(selectedCharacterClass.doublehand) as WeaponType[]));
      }
      break;
    case "offhand":
      if (selectedCharacterClass) {
        validTypes.push(...(Object.keys(selectedCharacterClass.offhand) as ItemType[]));
        validWeaponTypes.push(...(Object.keys(selectedCharacterClass.offhand) as OffhandType[]));
      }
      break;
    default:
      validTypes.push(slot.replace("1", "").replace("2", "") as ItemType);
      break;
  }

  return (itemName: ItemKey, gItem: GItem) => {
    const validType =
      validTypes.some((x) => x === gItem.type) || (gItem.wtype && gItem.type === "weapon");
    const validWeaponType = gItem.wtype ? validWeaponTypes.some((x) => x === gItem.wtype) : true;
    const validClass = selectedCharacterClass
      ? !gItem.class || gItem.class.some((x) => x === selectedCharacterClass.className)
      : true;
    return Boolean(validType && validWeaponType && validClass);
  };
}

export function GearSelectDialog({
  slot,
  items,
  onSelectGear,
  selectedCharacterClass,
}: {
  slot: SlotType | false;
  items?: GItems;
  onSelectGear: (slot: SlotType, item?: RowItem) => void;
  selectedCharacterClass?: SelectedCharacterClass;
}) {
  const G = useContext(GDataContext);
  const [open, setOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<ItemKey | null>(null);

  useEffect(() => {
    if (slot) {
      setOpen(true);
      setFocusKey(null);
    }
  }, [slot]);

  const filterItem = useMemo(
    () => buildSlotFilter(slot, selectedCharacterClass),
    [selectedCharacterClass, slot],
  );

  if (!G) {
    return <>WAITING!</>;
  }

  const handleClose = () => {
    setOpen(false);
    if (slot) {
      onSelectGear(slot);
    }
  };

  const onSelectItem = (row: ItemPickerRow) => {
    setOpen(false);
    if (slot) {
      onSelectGear(slot, row);
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="lg"
      open={open}
      onClose={handleClose}
      scroll="paper"
      aria-labelledby="scroll-dialog-title"
    >
      <DialogTitle id="scroll-dialog-title">Choose {slot}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} md={focusKey ? 8 : 12}>
            <ItemPicker
              items={items}
              filterItem={filterItem}
              onSelect={onSelectItem}
              onFocusItem={setFocusKey}
              searchAttributes
            />
          </Grid>
          {focusKey && (
            <Grid item xs={12} md={4}>
              <ItemSourcesPanel itemKey={focusKey} G={G} compact showMarket={false} />
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
