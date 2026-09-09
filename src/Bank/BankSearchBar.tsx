import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Popover,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ItemInfoPValues } from "typed-adventureland";
import { gradeFilterOptions } from "./bankAnalysis";
import { AggregatedBankItem } from "./bankItems";
import {
  advancedSearchFormFromQuery,
  BANK_SEARCH_SYNTAX_HELP,
  BankAdvancedSearchForm,
  BankSearchFlag,
  EMPTY_BANK_ADVANCED_SEARCH,
  parseBankSearchQuery,
  serializeAdvancedSearchForm,
} from "./bankSearchQuery";
import { GDataContext } from "../GDataContext";

const TITLE_OPTIONS: ItemInfoPValues[] = [
  "lucky",
  "festive",
  "shiny",
  "legacy",
  "glitched",
  "gooped",
  "firehazard",
  "superfast",
];

const CLASS_OPTIONS = ["warrior", "priest", "merchant", "mage", "ranger", "rogue", "paladin"];

const FLAG_OPTIONS: { key: BankSearchFlag; label: string }[] = [
  { key: "exchange", label: "Exchange" },
  { key: "upgrade", label: "Upgrade" },
  { key: "compound", label: "Compound" },
  { key: "craft", label: "Craft" },
  { key: "event", label: "Event" },
  { key: "legacy", label: "Legacy" },
];

type BankSearchBarProps = {
  items: AggregatedBankItem[];
  search: string;
  onSearch: (query: string) => void;
};

function formHasValues(form: BankAdvancedSearchForm): boolean {
  return Boolean(serializeAdvancedSearchForm(form).trim());
}

/** Gmail-style search field with a compact “Show search options” popover. */
export function BankSearchBar({ items, search, onSearch }: BankSearchBarProps) {
  const G = useContext(GDataContext);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(search);
  const [open, setOpen] = useState(false);
  const [syntaxOpen, setSyntaxOpen] = useState(false);
  const [form, setForm] = useState<BankAdvancedSearchForm>(EMPTY_BANK_ADVANCED_SEARCH);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (draft !== search) onSearch(draft);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [draft, onSearch, search]);

  useEffect(() => {
    if (!open) return;
    setForm(advancedSearchFormFromQuery(parseBankSearchQuery(search)));
    setSyntaxOpen(false);
  }, [open, search]);

  const setOptions = useMemo(() => {
    const sets = new Set<string>();
    for (const item of items) {
      const setKey = (G?.items[item.name] as { set?: string } | undefined)?.set;
      if (setKey) sets.add(setKey);
    }
    return Array.from(sets)
      .map((key) => ({
        key,
        label: (G?.sets as Record<string, { name?: string }> | undefined)?.[key]?.name ?? key,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [G, items]);

  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    for (const item of items) {
      const type = G?.items[item.name]?.type;
      if (type) types.add(type);
    }
    return Array.from(types).sort();
  }, [G, items]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const item of items) {
      if (item.category) categories.add(item.category);
    }
    return Array.from(categories).sort();
  }, [items]);

  const preview = serializeAdvancedSearchForm(form);
  const queryActive = Boolean(search.trim());

  const patch = (partial: Partial<BankAdvancedSearchForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const toggleFlag = (key: BankSearchFlag) => {
    setForm((prev) => ({
      ...prev,
      flags: { ...prev.flags, [key]: !prev.flags[key] },
    }));
  };

  const apply = () => {
    const next = preview;
    setDraft(next);
    onSearch(next);
    setOpen(false);
  };

  const clear = () => {
    setForm(EMPTY_BANK_ADVANCED_SEARCH);
    setDraft("");
    onSearch("");
    setOpen(false);
  };

  const fieldSx = { minWidth: 0 };
  const popoverWidth = anchorRef.current?.offsetWidth
    ? Math.max(anchorRef.current.offsetWidth, 420)
    : 480;

  const multiMenuProps = {
    disablePortal: true,
    PaperProps: { sx: { maxHeight: 280 } },
  } as const;

  const onMultiChange =
    (key: "types" | "titles" | "classKeys" | "setKeys" | "categories") =>
    (event: SelectChangeEvent<string[]>) => {
      const { value } = event.target;
      patch({ [key]: typeof value === "string" ? value.split(",") : value });
    };

  const renderMultiValue = (selected: string[], labelByValue?: Record<string, string>) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {selected.map((value) => (
        <Chip key={value} size="small" label={labelByValue?.[value] ?? value} />
      ))}
    </Box>
  );

  const setLabelByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of setOptions) {
      map[option.key] = option.label;
    }
    return map;
  }, [setOptions]);

  return (
    <>
      <Box ref={anchorRef} sx={{ flex: "1 1 auto", minWidth: 200, width: "100%" }}>
        <TextField
          id="search"
          placeholder="Search bank — try hpot, mpot or type:weapon"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoComplete="off"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end" sx={{ gap: 0.25 }}>
                {draft.trim() ? (
                  <Tooltip title="Clear search">
                    <IconButton
                      size="small"
                      aria-label="Clear search"
                      onClick={() => {
                        setDraft("");
                        onSearch("");
                        setForm(EMPTY_BANK_ADVANCED_SEARCH);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
                <Tooltip title="Show search options">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Show search options"
                    aria-expanded={open}
                    aria-haspopup="dialog"
                    color={queryActive || open ? "primary" : "default"}
                    onClick={() => setOpen((wasOpen) => !wasOpen)}
                  >
                    <FilterListIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 0.5,
            width: popoverWidth,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "min(70vh, 560px)",
            overflow: "auto",
            p: 2,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? theme.palette.grey[900]
                : theme.palette.background.paper,
            backgroundImage: "none",
            border: 1,
            borderColor: "divider",
          },
        }}
      >
        <Stack spacing={1.25}>
          <Typography variant="subtitle2">Search options</Typography>

          <TextField
            label="Any of these items"
            placeholder="hpot mpot scroll0"
            size="small"
            fullWidth
            value={form.anyWords}
            onChange={(event) => patch({ anyWords: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            label="All of these words"
            placeholder="fire blade"
            size="small"
            fullWidth
            value={form.allWords}
            onChange={(event) => patch({ allWords: event.target.value })}
            sx={fieldSx}
          />
          <TextField
            label="Doesn't have"
            placeholder="cscroll"
            size="small"
            fullWidth
            value={form.exclude}
            onChange={(event) => patch({ exclude: event.target.value })}
            sx={fieldSx}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.25,
            }}
          >
            <FormControl size="small" fullWidth>
              <InputLabel id="bank-opt-type">Type</InputLabel>
              <Select
                labelId="bank-opt-type"
                multiple
                value={form.types}
                onChange={onMultiChange("types")}
                input={<OutlinedInput label="Type" />}
                renderValue={(selected) => renderMultiValue(selected)}
                MenuProps={multiMenuProps}
              >
                {typeOptions.map((type) => (
                  <MenuItem key={type} value={type}>
                    <Checkbox size="small" checked={form.types.includes(type)} />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="bank-opt-title">Title</InputLabel>
              <Select
                labelId="bank-opt-title"
                multiple
                value={form.titles}
                onChange={onMultiChange("titles")}
                input={<OutlinedInput label="Title" />}
                renderValue={(selected) => renderMultiValue(selected)}
                MenuProps={multiMenuProps}
              >
                {TITLE_OPTIONS.map((title) => (
                  <MenuItem key={title} value={title}>
                    <Checkbox size="small" checked={form.titles.includes(title)} />
                    <ListItemText primary={title} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="bank-opt-class">Class</InputLabel>
              <Select
                labelId="bank-opt-class"
                multiple
                value={form.classKeys}
                onChange={onMultiChange("classKeys")}
                input={<OutlinedInput label="Class" />}
                renderValue={(selected) => renderMultiValue(selected)}
                MenuProps={multiMenuProps}
              >
                {CLASS_OPTIONS.map((classKey) => (
                  <MenuItem key={classKey} value={classKey}>
                    <Checkbox size="small" checked={form.classKeys.includes(classKey)} />
                    <ListItemText primary={classKey} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="bank-opt-set">Set</InputLabel>
              <Select
                labelId="bank-opt-set"
                multiple
                value={form.setKeys}
                onChange={onMultiChange("setKeys")}
                input={<OutlinedInput label="Set" />}
                renderValue={(selected) => renderMultiValue(selected, setLabelByKey)}
                MenuProps={multiMenuProps}
              >
                {setOptions.map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    <Checkbox size="small" checked={form.setKeys.includes(option.key)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="bank-opt-category">Category</InputLabel>
              <Select
                labelId="bank-opt-category"
                multiple
                value={form.categories}
                onChange={onMultiChange("categories")}
                input={<OutlinedInput label="Category" />}
                renderValue={(selected) => renderMultiValue(selected)}
                MenuProps={multiMenuProps}
              >
                {categoryOptions.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Checkbox size="small" checked={form.categories.includes(category)} />
                    <ListItemText primary={category} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="bank-opt-grade">Min grade</InputLabel>
              <Select
                labelId="bank-opt-grade"
                label="Min grade"
                value={form.minGrade || "0"}
                onChange={(event) =>
                  patch({
                    minGrade: event.target.value === "0" ? "" : String(event.target.value),
                  })
                }
              >
                {gradeFilterOptions().map((option) => (
                  <MenuItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Min qty"
              size="small"
              fullWidth
              value={form.minQ}
              onChange={(event) => patch({ minQ: event.target.value })}
            />
            <TextField
              label="Min level"
              size="small"
              fullWidth
              value={form.minLevel}
              onChange={(event) => patch({ minLevel: event.target.value })}
            />
          </Box>

          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
            {FLAG_OPTIONS.map(({ key, label }) => (
              <FormControlLabel
                key={key}
                sx={{ mr: 1 }}
                control={
                  <Checkbox
                    size="small"
                    checked={Boolean(form.flags[key])}
                    onChange={() => toggleFlag(key)}
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
              />
            ))}
          </Stack>

          <Box
            sx={{
              px: 1.25,
              py: 0.75,
              borderRadius: 1,
              bgcolor: "action.hover",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              minHeight: 34,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography
              variant="body2"
              component="code"
              sx={{
                fontFamily: "inherit",
                color: preview ? "text.primary" : "text.secondary",
                wordBreak: "break-word",
              }}
            >
              {preview || "Query preview"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Button
              size="small"
              onClick={() => setSyntaxOpen((wasOpen) => !wasOpen)}
              sx={{ textTransform: "none" }}
            >
              {syntaxOpen ? "Hide syntax" : "Show syntax"}
            </Button>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={clear}
                disabled={!formHasValues(form) && !search.trim()}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={apply}
                disabled={!formHasValues(form) && !search.trim()}
              >
                Search
              </Button>
            </Stack>
          </Stack>

          {syntaxOpen && (
            <Stack spacing={0.5} sx={{ pt: 0.5, borderTop: 1, borderColor: "divider" }}>
              {BANK_SEARCH_SYNTAX_HELP.map((row) => (
                <Stack
                  key={row.op}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={0.5}
                  sx={{ columnGap: 1.5 }}
                >
                  <Typography
                    variant="caption"
                    component="code"
                    sx={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      minWidth: 110,
                    }}
                  >
                    {row.op}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {row.meaning}
                  </Typography>
                  <Typography
                    variant="caption"
                    component="code"
                    color="text.secondary"
                    sx={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    }}
                  >
                    {row.example}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </Popover>
    </>
  );
}
