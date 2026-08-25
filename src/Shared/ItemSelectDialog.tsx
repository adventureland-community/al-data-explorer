import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { GItem, ItemKey } from "typed-adventureland";

import { ItemSortKey } from "../gameData/itemFilters";
import { GItems } from "../GDataContext";
import { ItemPicker, ItemPickerRow } from "./ItemPicker";

export function ItemSelectDialog({
  open,
  title,
  items,
  filterItem,
  selectedKey,
  level,
  onLevelChange,
  onSelect,
  onAddAll,
  onClose,
  /** Keep dialog open after each single add (matrix multi-add). */
  stayOpenOnSelect = false,
  showLevelSlider = true,
  defaultSort = "name",
}: {
  open: boolean;
  title: string;
  items: GItems;
  filterItem?: (itemKey: ItemKey, gItem: GItem) => boolean;
  selectedKey?: ItemKey;
  level?: number;
  onLevelChange?: (level: number) => void;
  onSelect: (row: ItemPickerRow) => void;
  onAddAll?: (rows: ItemPickerRow[]) => void;
  onClose: () => void;
  stayOpenOnSelect?: boolean;
  showLevelSlider?: boolean;
  defaultSort?: ItemSortKey;
}) {
  return (
    <Dialog fullWidth maxWidth="lg" open={open} onClose={onClose} scroll="paper">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ItemPicker
          items={items}
          filterItem={filterItem}
          selectedKey={selectedKey}
          level={level}
          onLevelChange={onLevelChange}
          showLevelSlider={showLevelSlider}
          defaultSort={defaultSort}
          onSelect={(row) => {
            onSelect(row);
            if (!stayOpenOnSelect) onClose();
          }}
          onAddAll={
            onAddAll
              ? (rows) => {
                  onAddAll(rows);
                  if (!stayOpenOnSelect) onClose();
                }
              : undefined
          }
        />
      </DialogContent>
      {stayOpenOnSelect && (
        <DialogActions>
          <Button onClick={onClose}>Done</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
