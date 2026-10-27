import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { ItemKey } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { ItemInstanceLabel } from "../Shared/ItemInstanceLabel";
import { decodeListShareSnapshot, listToShareSnapshot, listsShareUrl } from "./listShareState";
import {
  addEntry,
  appendImportedEntries,
  createList,
  deleteList,
  filterShoppingEntries,
  getLastUsedListId,
  getList,
  importSnapshotAsNewList,
  loadListsDocument,
  promoteEntry,
  removeEntry,
  renameList,
  setEntryChecked,
  setLastUsedList,
  sortEntriesNewestFirst,
} from "./listsStore";
import type {
  ListShareSnapshot,
  ListsDocument,
  ListType,
  NamedList,
  ShoppingFilter,
} from "./types";

function ListPicker({
  type,
  doc,
  selectedId,
  onSelect,
  onDoc,
}: {
  type: ListType;
  doc: ListsDocument;
  selectedId: string;
  onSelect: (id: string) => void;
  onDoc: (doc: ListsDocument) => void;
}) {
  const lists = doc.lists.filter((l) => l.type === type);
  const [newName, setNewName] = useState("");
  const [rename, setRename] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selected = lists.find((l) => l.id === selectedId);

  useEffect(() => {
    setRename(selected?.name ?? "");
  }, [selected?.id, selected?.name]);

  return (
    <Stack spacing={1.5}>
      <FormControl size="small" fullWidth>
        <InputLabel id={`${type}-list-label`}>
          {type === "wishlist" ? "Wishlist" : "Shopping list"}
        </InputLabel>
        <Select
          labelId={`${type}-list-label`}
          label={type === "wishlist" ? "Wishlist" : "Shopping list"}
          value={selectedId}
          onChange={(e) => {
            const id = String(e.target.value);
            onSelect(id);
            onDoc(setLastUsedList(type, id));
          }}
        >
          {lists.map((list) => (
            <MenuItem key={list.id} value={list.id}>
              {list.name} ({list.entries.length})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Rename"
          value={rename}
          onChange={(e) => setRename(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button
          size="small"
          variant="outlined"
          disabled={!selected || !rename.trim() || rename.trim() === selected.name}
          onClick={() => onDoc(renameList(selectedId, rename.trim()))}
        >
          Save
        </Button>
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="New list"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button
          size="small"
          variant="contained"
          disabled={!newName.trim()}
          onClick={() => {
            const { doc: next, list } = createList(type, newName.trim());
            onDoc(next);
            onSelect(list.id);
            setNewName("");
          }}
        >
          Create
        </Button>
      </Stack>
      <Button
        size="small"
        color="error"
        variant="text"
        disabled={!selected}
        onClick={() => setConfirmDelete(true)}
      >
        Delete list…
      </Button>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete “{selected?.name}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the list and all of its entries. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const next = deleteList(selectedId);
              onDoc(next);
              const fallback =
                getLastUsedListId(next, type) ?? next.lists.find((l) => l.type === type)?.id;
              if (fallback) onSelect(fallback);
              setConfirmDelete(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function EntryRow({
  list,
  entryId,
  onDoc,
  shoppingTargets,
}: {
  list: NamedList;
  entryId: string;
  onDoc: (doc: ListsDocument) => void;
  shoppingTargets: NamedList[];
}) {
  const entry = list.entries.find((e) => e.id === entryId);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState(shoppingTargets[0]?.id ?? "");

  if (!entry) return null;

  const itemInfo = entry.itemKey
    ? ({
        name: entry.itemKey as ItemKey,
        ...(entry.level != null ? { level: entry.level } : {}),
        ...(entry.p ? { p: entry.p } : {}),
        ...(entry.stat_type ? { stat_type: entry.stat_type } : {}),
      } as import("typed-adventureland").ItemInfo)
    : null;

  return (
    <Paper variant="outlined" sx={{ p: 1.25 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        {list.type === "shopping" ? (
          <Checkbox
            checked={Boolean(entry.checked)}
            onChange={(_, checked) => onDoc(setEntryChecked(list.id, entry.id, checked))}
            sx={{ mt: -0.5 }}
            inputProps={{ "aria-label": "Mark bought" }}
          />
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {itemInfo ? (
            <ItemInstanceLabel itemInfo={itemInfo} size={36} includeLevel={entry.level != null} />
          ) : (
            <Typography variant="body2">{entry.note ?? "(empty)"}</Typography>
          )}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
            <Chip size="small" label={`×${entry.qty}`} />
            {itemInfo && entry.note ? (
              <Typography variant="caption" color="text.secondary">
                {entry.note}
              </Typography>
            ) : null}
          </Stack>
        </Box>
        <Stack spacing={0.5} alignItems="flex-end">
          {list.type === "wishlist" ? (
            <Button size="small" onClick={() => setPromoteOpen(true)}>
              Promote
            </Button>
          ) : null}
          <Button
            size="small"
            color="inherit"
            onClick={() => onDoc(removeEntry(list.id, entry.id))}
          >
            Remove
          </Button>
        </Stack>
      </Stack>

      <Dialog open={promoteOpen} onClose={() => setPromoteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Promote to shopping list</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="promote-target">Shopping list</InputLabel>
            <Select
              labelId="promote-target"
              label="Shopping list"
              value={promoteTarget}
              onChange={(e) => setPromoteTarget(String(e.target.value))}
            >
              {shoppingTargets.map((target) => (
                <MenuItem key={target.id} value={target.id}>
                  {target.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoteOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!promoteTarget}
            onClick={() => {
              onDoc(promoteEntry(list.id, entry.id, promoteTarget));
              setPromoteOpen(false);
            }}
          >
            Copy to shopping
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function ImportDialog({
  snapshot,
  doc,
  onDoc,
  onClose,
}: {
  snapshot: ListShareSnapshot;
  doc: ListsDocument;
  onDoc: (doc: ListsDocument) => void;
  onClose: () => void;
}) {
  const targets = doc.lists.filter((l) => l.type === snapshot.type);
  const [mode, setMode] = useState<"new" | "append">("new");
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import shared {snapshot.type}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>{snapshot.name}</strong> · {snapshot.entries.length} entries (read-only preview
          imported below)
        </Typography>
        <Stack spacing={0.75} sx={{ maxHeight: 240, overflow: "auto", mb: 2 }}>
          {snapshot.entries.map((row) => {
            const key = `${row.itemKey ?? ""}:${row.level ?? ""}:${row.p ?? ""}:${
              row.stat_type ?? ""
            }:${row.qty}:${row.note ?? ""}`;
            return (
              <Typography key={key} variant="caption" component="div">
                {row.itemKey
                  ? `${row.itemKey}${row.level != null ? ` +${row.level}` : ""} ×${row.qty}`
                  : row.note}{" "}
                {row.note && row.itemKey ? `— ${row.note}` : ""}
              </Typography>
            );
          })}
        </Stack>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, v) => v && setMode(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="new">Import as new list</ToggleButton>
          <ToggleButton value="append" disabled={!targets.length}>
            Append to existing
          </ToggleButton>
        </ToggleButtonGroup>
        {mode === "append" ? (
          <FormControl fullWidth size="small">
            <InputLabel id="import-target">List</InputLabel>
            <Select
              labelId="import-target"
              label="List"
              value={targetId}
              onChange={(e) => setTargetId(String(e.target.value))}
            >
              {targets.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Dismiss</Button>
        <Button
          variant="contained"
          onClick={() => {
            if (mode === "new") {
              onDoc(importSnapshotAsNewList(snapshot).doc);
            } else if (targetId) {
              onDoc(appendImportedEntries(targetId, snapshot));
            }
            onClose();
          }}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ListsPage() {
  const G = useContext(GDataContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [doc, setDoc] = useState(() => loadListsDocument());
  const [namespace, setNamespace] = useState<ListType>("wishlist");
  const [filter, setFilter] = useState<ShoppingFilter>("active");
  const [freeText, setFreeText] = useState("");
  const [itemKey, setItemKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [sharePreview, setSharePreview] = useState<ListShareSnapshot | null>(null);

  const wishlistId =
    getLastUsedListId(doc, "wishlist") ?? doc.lists.find((l) => l.type === "wishlist")?.id ?? "";
  const shoppingId =
    getLastUsedListId(doc, "shopping") ?? doc.lists.find((l) => l.type === "shopping")?.id ?? "";
  const [selectedWishlistId, setSelectedWishlistId] = useState(wishlistId);
  const [selectedShoppingId, setSelectedShoppingId] = useState(shoppingId);

  useEffect(() => {
    if (!selectedWishlistId && wishlistId) setSelectedWishlistId(wishlistId);
  }, [selectedWishlistId, wishlistId]);
  useEffect(() => {
    if (!selectedShoppingId && shoppingId) setSelectedShoppingId(shoppingId);
  }, [selectedShoppingId, shoppingId]);

  const selectedId = namespace === "wishlist" ? selectedWishlistId : selectedShoppingId;
  const selected = getList(doc, selectedId);

  useEffect(() => {
    const encoded = searchParams.get("list");
    if (!encoded) return;
    const snap = decodeListShareSnapshot(encoded);
    if (snap) setSharePreview(snap);
    const next = new URLSearchParams(searchParams);
    next.delete("list");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const refresh = useCallback((next: ListsDocument) => {
    setDoc(next);
  }, []);

  const visibleEntries = useMemo(() => {
    if (!selected) return [];
    const base =
      selected.type === "shopping"
        ? filterShoppingEntries(selected.entries, filter)
        : selected.entries;
    return sortEntriesNewestFirst(base);
  }, [selected, filter]);

  const shoppingTargets = doc.lists.filter((l) => l.type === "shopping");

  return (
    <Box sx={{ p: 2, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Lists
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Wishlists for long-term wants. Shopping lists for buy-now runs. Promote copies a wishlist
        row onto a shopping list. Data stays in this browser; share links are snapshots.
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
        <Paper variant="outlined" sx={{ p: 2, width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={namespace}
            onChange={(_, v) => v && setNamespace(v)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="wishlist">Wishlists</ToggleButton>
            <ToggleButton value="shopping">Shopping</ToggleButton>
          </ToggleButtonGroup>
          {namespace === "wishlist" ? (
            <ListPicker
              type="wishlist"
              doc={doc}
              selectedId={selectedWishlistId}
              onSelect={setSelectedWishlistId}
              onDoc={refresh}
            />
          ) : (
            <ListPicker
              type="shopping"
              doc={doc}
              selectedId={selectedShoppingId}
              onSelect={setSelectedShoppingId}
              onDoc={refresh}
            />
          )}
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {selected ? (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ sm: "center" }}
                justifyContent="space-between"
              >
                <Typography variant="h6">{selected.name}</Typography>
                <Stack direction="row" spacing={1}>
                  {selected.type === "shopping" ? (
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={filter}
                      onChange={(_, v) => v && setFilter(v)}
                    >
                      <ToggleButton value="active">Active</ToggleButton>
                      <ToggleButton value="bought">Bought</ToggleButton>
                      <ToggleButton value="all">All</ToggleButton>
                    </ToggleButtonGroup>
                  ) : null}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyIcon fontSize="small" />}
                    onClick={() => {
                      const url = listsShareUrl(listToShareSnapshot(selected));
                      navigator.clipboard.writeText(url).then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1500);
                      });
                    }}
                  >
                    {copied ? "Copied" : "Share"}
                  </Button>
                </Stack>
              </Stack>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Add entry
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                  <TextField
                    size="small"
                    label="Item key (optional)"
                    value={itemKey}
                    onChange={(e) => setItemKey(e.target.value.trim())}
                    placeholder="firestaff"
                    error={Boolean(itemKey && G && !G.items[itemKey as ItemKey])}
                    helperText={
                      itemKey && G && !G.items[itemKey as ItemKey] ? "Unknown item key" : undefined
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Note"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    disabled={
                      (!itemKey && !freeText.trim()) ||
                      Boolean(itemKey && G && !G.items[itemKey as ItemKey])
                    }
                    onClick={() => {
                      refresh(
                        addEntry(selected.id, {
                          itemKey: itemKey || undefined,
                          note: freeText.trim() || undefined,
                          qty: 1,
                        }),
                      );
                      setFreeText("");
                      setItemKey("");
                    }}
                  >
                    Add
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Level / Title / Stat scroll can be set when adding from{" "}
                  <Link component={RouterLink} to="/items">
                    item detail
                  </Link>
                  .
                </Typography>
              </Paper>

              <Stack spacing={1}>
                {visibleEntries.length === 0 ? (
                  <Typography color="text.secondary">No entries in this view.</Typography>
                ) : (
                  visibleEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      list={selected}
                      entryId={entry.id}
                      onDoc={refresh}
                      shoppingTargets={shoppingTargets}
                    />
                  ))
                )}
              </Stack>
            </Stack>
          ) : (
            <Typography color="text.secondary">Create a list to get started.</Typography>
          )}
        </Box>
      </Stack>

      {sharePreview ? (
        <ImportDialog
          snapshot={sharePreview}
          doc={doc}
          onDoc={refresh}
          onClose={() => setSharePreview(null)}
        />
      ) : null}
    </Box>
  );
}
