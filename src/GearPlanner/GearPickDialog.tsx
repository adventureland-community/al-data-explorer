import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { GItem, ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { GDataContext, GItems } from "../GDataContext";
import { ItemPickerRow } from "../Shared/ItemPicker";
import { ItemPickerWithSources } from "../Shared/ItemPickerWithSources";

export function GearPickDialog({
  slot,
  items,
  title,
  filterItem,
  onSelect,
  onClose,
  searchPlaceholder,
  statColumn,
  titleId = "gear-pick-title",
  classKey,
  showAffixes = true,
  initialItem,
}: {
  slot: SlotType | false;
  items?: GItems;
  title: (slot: SlotType) => string;
  filterItem?: (itemName: ItemKey, gItem: GItem) => boolean;
  onSelect: (slot: SlotType, row: ItemPickerRow) => void;
  onClose: (slot: SlotType) => void;
  searchPlaceholder?: string;
  statColumn?: "luck";
  titleId?: string;
  /** Class for Item Stats Context — titles load from G inside the picker. */
  classKey?: string;
  showAffixes?: boolean;
  initialItem?: ItemInfo;
}) {
  const G = useContext(GDataContext);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (slot) setOpen(true);
  }, [slot]);

  if (!G) return null;

  const handleClose = () => {
    setOpen(false);
    if (slot) onClose(slot);
  };

  const onSelectItem = (row: ItemPickerRow) => {
    setOpen(false);
    if (slot) onSelect(slot, row);
  };

  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={handleClose} scroll="paper">
      <DialogTitle id={titleId}>{slot ? title(slot) : ""}</DialogTitle>
      <DialogContent dividers>
        <ItemPickerWithSources
          G={G}
          items={items}
          filterItem={filterItem}
          onSelect={onSelectItem}
          searchAttributes
          searchPlaceholder={searchPlaceholder}
          statColumn={statColumn}
          resetFocusKey={slot}
          classKey={classKey}
          showAffixes={showAffixes}
          slot={slot}
          initialItem={initialItem}
          selectedKey={initialItem?.name}
        />
      </DialogContent>
    </Dialog>
  );
}
