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
import { useState } from "react";

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
  size?: "small" | "medium";
};

function AddDialog({
  open,
  type,
  draft,
  onClose,
  onAdded,
}: {
  open: boolean;
  type: ListType;
  draft: NewListEntryInput;
  onClose: () => void;
  onAdded: () => void;
}) {
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

export function AddToListButtons({ draft, size = "small" }: Props) {
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
          onClose={() => setOpenType(null)}
          onAdded={() => undefined}
        />
      ) : null}
    </>
  );
}
