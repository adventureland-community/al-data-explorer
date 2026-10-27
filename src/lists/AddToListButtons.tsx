import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { GItem } from "typed-adventureland";

import { itemTitleDefsFromG } from "../gameData/itemProperties";
import { GDataContext } from "../GDataContext";
import { ItemAffixControls } from "../Shared/ItemAffixControls";
import {
  addEntry,
  createList,
  ensureDestinationList,
  listsOfType,
  loadListsDocument,
  setLastUsedList,
} from "./listsStore";
import type { ListType, NewListEntryInput } from "./types";

type Props = {
  draft: NewListEntryInput;
  /** When set, Title / Stat scroll can be chosen in the add dialog. */
  gItem?: GItem;
  size?: "small" | "medium";
};

function AddDialog({
  open,
  type,
  draft,
  gItem,
  onClose,
  onAdded,
}: {
  open: boolean;
  type: ListType;
  draft: NewListEntryInput;
  gItem?: GItem;
  onClose: () => void;
  onAdded: () => void;
}) {
  const G = useContext(GDataContext);
  const titles = useMemo(() => (G ? itemTitleDefsFromG(G) : undefined), [G]);
  const initial = loadListsDocument();
  const [doc, setDoc] = useState(initial);
  const lists = listsOfType(doc, type);
  const lastId = type === "wishlist" ? doc.lastUsedWishlistId : doc.lastUsedShoppingId;
  const [listId, setListId] = useState(
    lastId && lists.some((l) => l.id === lastId) ? lastId : lists[0]?.id ?? "",
  );
  const [note, setNote] = useState(draft.note ?? "");
  const [qty, setQty] = useState(draft.qty ?? 1);
  const [newName, setNewName] = useState("");
  const [titleKey, setTitleKey] = useState(draft.p ?? "");
  const [statType, setStatType] = useState(draft.stat_type ?? "");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add to {type === "wishlist" ? "wishlist" : "shopping list"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="list-dest-label">List</InputLabel>
            <Select
              labelId="list-dest-label"
              label="List"
              value={listId}
              onChange={(e) => setListId(String(e.target.value))}
            >
              {lists.map((list) => (
                <MenuItem key={list.id} value={list.id}>
                  {list.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="New list name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            helperText="If set, creates a list and adds there instead"
          />
          {draft.itemKey && gItem ? (
            <ItemAffixControls
              titles={titles}
              gItem={gItem}
              titleKey={titleKey}
              onTitleChange={setTitleKey}
              statType={statType}
              onStatTypeChange={setStatType}
            />
          ) : null}
          <TextField
            size="small"
            type="number"
            label="Quantity"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            inputProps={{ min: 1 }}
          />
          <TextField
            size="small"
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            let targetId = listId;
            let nextDoc = doc;
            if (newName.trim()) {
              const created = createList(type, newName.trim());
              nextDoc = created.doc;
              targetId = created.list.id;
            }
            if (!targetId) {
              const ensured = ensureDestinationList(type);
              nextDoc = ensured.doc;
              targetId = ensured.listId;
            }
            nextDoc = addEntry(targetId, {
              ...draft,
              qty,
              note: note.trim() || undefined,
              ...(titleKey ? { p: titleKey } : {}),
              ...(statType ? { stat_type: statType } : {}),
            });
            setLastUsedList(type, targetId);
            setDoc(nextDoc);
            onAdded();
            onClose();
          }}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AddToListButtons({ draft, gItem, size = "small" }: Props) {
  const [openType, setOpenType] = useState<ListType | null>(null);

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size={size} variant="outlined" onClick={() => setOpenType("wishlist")}>
          Add to wishlist
        </Button>
        <Button size={size} variant="outlined" onClick={() => setOpenType("shopping")}>
          Add to shopping list
        </Button>
      </Stack>
      {openType ? (
        <AddDialog
          open
          type={openType}
          draft={draft}
          gItem={gItem}
          onClose={() => setOpenType(null)}
          onAdded={() => undefined}
        />
      ) : null}
    </>
  );
}
