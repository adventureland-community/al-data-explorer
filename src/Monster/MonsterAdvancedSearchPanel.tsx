import { Box, Button, Stack, TextField, Typography } from "@mui/material";

import {
  EMPTY_MONSTER_ADVANCED,
  MonsterAdvancedForm,
  serializeMonsterAdvancedForm,
} from "./monsterSearchQuery";

export type MonsterAdvancedSearchPanelProps = {
  form: MonsterAdvancedForm;
  onChange: (next: MonsterAdvancedForm) => void;
  onApply: () => void;
  onClear: () => void;
};

/** Advanced monster filter form for the QuerySearchBar popover. */
export function MonsterAdvancedSearchPanel({
  form,
  onChange,
  onApply,
  onClear,
}: MonsterAdvancedSearchPanelProps) {
  const preview = serializeMonsterAdvancedForm(form);

  const patch = (partial: Partial<MonsterAdvancedForm>) => {
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
      <TextField
        label="Item drop"
        size="small"
        fullWidth
        value={form.drop}
        onChange={(e) => patch({ drop: e.target.value })}
      />
      <TextField
        label="Achievement"
        size="small"
        fullWidth
        value={form.achievement}
        onChange={(e) => patch({ achievement: e.target.value })}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1.25,
        }}
      >
        <TextField
          label="HP min"
          size="small"
          type="number"
          value={form.hpMin}
          onChange={(e) => patch({ hpMin: e.target.value })}
        />
        <TextField
          label="HP max"
          size="small"
          type="number"
          value={form.hpMax}
          onChange={(e) => patch({ hpMax: e.target.value })}
        />
        <TextField
          label="Respawn min"
          size="small"
          type="number"
          value={form.respawnMin}
          onChange={(e) => patch({ respawnMin: e.target.value })}
        />
        <TextField
          label="Respawn max"
          size="small"
          type="number"
          value={form.respawnMax}
          onChange={(e) => patch({ respawnMax: e.target.value })}
        />
      </Box>
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
          disabled={!serializeMonsterAdvancedForm(form).trim()}
        >
          Search
        </Button>
      </Stack>
    </Stack>
  );
}

export { EMPTY_MONSTER_ADVANCED };
