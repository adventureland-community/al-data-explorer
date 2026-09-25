import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { ItemInfoPValues } from "typed-adventureland";

import { ITEM_ATTR_KEYS } from "../Shared/querySearch";
import { gradeFilterOptions } from "./bankAnalysis";
import {
  BANK_SEARCH_SYNTAX_HELP,
  BankAdvancedSearchForm,
  BankSearchFlag,
  serializeAdvancedSearchForm,
} from "./bankSearchQuery";

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

export function bankAdvancedFormHasValues(form: BankAdvancedSearchForm): boolean {
  return Boolean(serializeAdvancedSearchForm(form).trim());
}

export type BankAdvancedSearchPanelProps = {
  form: BankAdvancedSearchForm;
  onChange: (next: BankAdvancedSearchForm) => void;
  typeOptions: string[];
  categoryOptions: string[];
  setOptions: { key: string; label: string }[];
  search: string;
  onApply: () => void;
  onClear: () => void;
};

/** Advanced bank filter form for the QuerySearchBar popover. */
export function BankAdvancedSearchPanel({
  form,
  onChange,
  typeOptions,
  categoryOptions,
  setOptions,
  search,
  onApply,
  onClear,
}: BankAdvancedSearchPanelProps) {
  const [syntaxOpen, setSyntaxOpen] = useState(false);
  const preview = serializeAdvancedSearchForm(form);
  const fieldSx = { minWidth: 0 };

  const multiMenuProps = {
    disablePortal: true,
    PaperProps: { sx: { maxHeight: 280 } },
  } as const;

  const patch = (partial: Partial<BankAdvancedSearchForm>) => {
    onChange({ ...form, ...partial });
  };

  const toggleFlag = (key: BankSearchFlag) => {
    onChange({
      ...form,
      flags: { ...form.flags, [key]: !form.flags[key] },
    });
  };

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

  const setLabelByKey: Record<string, string> = {};
  for (const option of setOptions) {
    setLabelByKey[option.key] = option.label;
  }

  return (
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

        <FormControl size="small" fullWidth>
          <InputLabel id="bank-opt-attr">Attribute</InputLabel>
          <Select
            labelId="bank-opt-attr"
            label="Attribute"
            value={form.attrKey || ""}
            onChange={(event) => patch({ attrKey: String(event.target.value) })}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {ITEM_ATTR_KEYS.map((key) => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Attr min"
          size="small"
          fullWidth
          value={form.attrMin}
          onChange={(event) => patch({ attrMin: event.target.value })}
          disabled={!form.attrKey}
        />
        <TextField
          label="Attr max"
          size="small"
          fullWidth
          value={form.attrMax}
          onChange={(event) => patch({ attrMax: event.target.value })}
          disabled={!form.attrKey}
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
            onClick={onClear}
            disabled={!bankAdvancedFormHasValues(form) && !search.trim()}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onApply}
            disabled={!bankAdvancedFormHasValues(form) && !search.trim()}
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
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                {row.example}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
