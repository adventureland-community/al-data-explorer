import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  EMPTY_NPC_ADVANCED,
  npcAdvancedHasValues,
  serializeNpcAdvancedForm,
  type NpcAdvancedForm,
} from "./npcSearchQuery";

export type NpcAdvancedSearchPanelProps = {
  form: NpcAdvancedForm;
  onChange: (next: NpcAdvancedForm) => void;
  onApply: () => void;
  onClear: () => void;
};

/** Advanced NPC filter form for the QuerySearchBar popover. */
export function NpcAdvancedSearchPanel({
  form,
  onChange,
  onApply,
  onClear,
}: NpcAdvancedSearchPanelProps) {
  const preview = serializeNpcAdvancedForm(form);

  const patch = (partial: Partial<NpcAdvancedForm>) => {
    onChange({ ...form, ...partial });
  };

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">Search options</Typography>
      <TextField
        label="Name contains"
        size="small"
        fullWidth
        value={form.anyWords}
        onChange={(e) => patch({ anyWords: e.target.value })}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1.25,
        }}
      >
        <TextField
          label="Role"
          size="small"
          placeholder="merchant"
          value={form.role}
          onChange={(e) => patch({ role: e.target.value })}
        />
        <TextField
          label="Map"
          size="small"
          placeholder="main"
          value={form.map}
          onChange={(e) => patch({ map: e.target.value })}
        />
        <TextField
          label="Token"
          size="small"
          value={form.token}
          onChange={(e) => patch({ token: e.target.value })}
        />
        <TextField
          label="Quest"
          size="small"
          value={form.quest}
          onChange={(e) => patch({ quest: e.target.value })}
        />
      </Box>
      <TextField
        label="Sells item"
        size="small"
        fullWidth
        placeholder="hpot0"
        value={form.sells}
        onChange={(e) => patch({ sells: e.target.value })}
      />
      <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={form.shopOnly}
              onChange={(e) => patch({ shopOnly: e.target.checked })}
            />
          }
          label="Shop only"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={form.movingOnly}
              onChange={(e) => patch({ movingOnly: e.target.checked })}
            />
          }
          label="Moving"
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={form.includeIgnored}
              onChange={(e) => patch({ includeIgnored: e.target.checked })}
            />
          }
          label="Include ignored"
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" component="code">
        {preview || "Query preview"}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" onClick={onClear}>
          Clear
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onApply}
          disabled={!npcAdvancedHasValues(form)}
        >
          Search
        </Button>
      </Stack>
    </Stack>
  );
}

export { EMPTY_NPC_ADVANCED };
