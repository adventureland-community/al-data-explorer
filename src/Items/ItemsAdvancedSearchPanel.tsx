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

import { ITEM_ATTR_KEYS, type ItemSearchFlag } from "../Shared/querySearch";
import {
  EMPTY_ITEM_CATALOG_ADVANCED,
  ItemCatalogAdvancedForm,
  itemCatalogAdvancedHasValues,
  serializeItemCatalogAdvancedForm,
} from "./itemCatalogAdvancedForm";

const FLAG_OPTIONS: { key: ItemSearchFlag; label: string }[] = [
  { key: "upgrade", label: "Upgrade" },
  { key: "compound", label: "Compound" },
  { key: "craft", label: "Craft" },
  { key: "exchange", label: "Exchange" },
  { key: "event", label: "Event" },
  { key: "legacy", label: "Legacy" },
];

export type ItemsAdvancedSearchPanelProps = {
  form: ItemCatalogAdvancedForm;
  onChange: (next: ItemCatalogAdvancedForm) => void;
  typeOptions: string[];
  wtypeOptions: string[];
  classOptions: string[];
  search: string;
  onApply: () => void;
  onClear: () => void;
};

/** Advanced item catalog filters — serializes into the shared query language. */
export function ItemsAdvancedSearchPanel({
  form,
  onChange,
  typeOptions,
  wtypeOptions,
  classOptions,
  search,
  onApply,
  onClear,
}: ItemsAdvancedSearchPanelProps) {
  const preview = serializeItemCatalogAdvancedForm(form);

  const patch = (partial: Partial<ItemCatalogAdvancedForm>) => {
    onChange({ ...form, ...partial });
  };

  const toggleFlag = (key: ItemSearchFlag) => {
    onChange({
      ...form,
      flags: { ...form.flags, [key]: !form.flags[key] },
    });
  };

  const onMultiChange =
    (key: "types" | "wtypes" | "classKeys") => (event: SelectChangeEvent<string[]>) => {
      const { value } = event.target;
      patch({ [key]: typeof value === "string" ? value.split(",") : value });
    };

  const renderMultiValue = (selected: string[]) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {selected.map((value) => (
        <Chip key={value} size="small" label={value} />
      ))}
    </Box>
  );

  const multiMenuProps = {
    disablePortal: true,
    PaperProps: { sx: { maxHeight: 280 } },
  } as const;

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">Search options</Typography>

      <TextField
        label="Name / words"
        placeholder="fire blade"
        size="small"
        fullWidth
        value={form.anyWords}
        onChange={(event) => patch({ anyWords: event.target.value })}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 1.25,
        }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel id="item-opt-type">Type</InputLabel>
          <Select
            labelId="item-opt-type"
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
          <InputLabel id="item-opt-wtype">Wtype</InputLabel>
          <Select
            labelId="item-opt-wtype"
            multiple
            value={form.wtypes}
            onChange={onMultiChange("wtypes")}
            input={<OutlinedInput label="Wtype" />}
            renderValue={(selected) => renderMultiValue(selected)}
            MenuProps={multiMenuProps}
          >
            {wtypeOptions.map((wtype) => (
              <MenuItem key={wtype} value={wtype}>
                <Checkbox size="small" checked={form.wtypes.includes(wtype)} />
                <ListItemText primary={wtype} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="item-opt-class">Class</InputLabel>
          <Select
            labelId="item-opt-class"
            multiple
            value={form.classKeys}
            onChange={onMultiChange("classKeys")}
            input={<OutlinedInput label="Class" />}
            renderValue={(selected) => renderMultiValue(selected)}
            MenuProps={multiMenuProps}
          >
            {classOptions.map((classKey) => (
              <MenuItem key={classKey} value={classKey}>
                <Checkbox size="small" checked={form.classKeys.includes(classKey)} />
                <ListItemText primary={classKey} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Tier min"
          size="small"
          fullWidth
          value={form.tierMin}
          onChange={(event) => patch({ tierMin: event.target.value })}
        />
        <TextField
          label="Tier max"
          size="small"
          fullWidth
          value={form.tierMax}
          onChange={(event) => patch({ tierMax: event.target.value })}
        />

        <FormControl size="small" fullWidth>
          <InputLabel id="item-opt-attr">Attribute</InputLabel>
          <Select
            labelId="item-opt-attr"
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

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button
          size="small"
          onClick={onClear}
          disabled={!itemCatalogAdvancedHasValues(form) && !search.trim()}
        >
          Clear
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onApply}
          disabled={!itemCatalogAdvancedHasValues(form) && !search.trim()}
        >
          Search
        </Button>
      </Stack>
    </Stack>
  );
}

export { EMPTY_ITEM_CATALOG_ADVANCED };
