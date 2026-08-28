import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import { ItemInfoPValues } from "typed-adventureland";
import { AggregatedBankItem } from "./bankItems";
import { BankItemFilters, EMPTY_BANK_FILTERS, gradeFilterOptions } from "./bankAnalysis";
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

const FLAG_OPTIONS: { key: keyof BankItemFilters["flags"]; label: string }[] = [
  { key: "exchange", label: "Exchange" },
  { key: "upgrade", label: "Upgrade" },
  { key: "compound", label: "Compound" },
  { key: "craftable", label: "Craft" },
  { key: "event", label: "Event" },
  { key: "legacy", label: "Legacy" },
];

type BankFiltersProps = {
  items: AggregatedBankItem[];
  filters: BankItemFilters;
  onChange: (filters: BankItemFilters) => void;
};

export function hasActiveBankFilters(filters: BankItemFilters) {
  return (
    filters.titles.length > 0 ||
    filters.classes.length > 0 ||
    filters.setKeys.length > 0 ||
    filters.types.length > 0 ||
    filters.minGrade > 0 ||
    Object.values(filters.flags).some(Boolean)
  );
}

function countActiveFilters(filters: BankItemFilters) {
  let count =
    filters.titles.length + filters.classes.length + filters.setKeys.length + filters.types.length;
  if (filters.minGrade > 0) count++;
  count += Object.values(filters.flags).filter(Boolean).length;
  return count;
}

export function BankFilters({ items, filters, onChange }: BankFiltersProps) {
  const G = useContext(GDataContext);
  const active = hasActiveBankFilters(filters);
  const [expanded, setExpanded] = useState(active);

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

  const toggleListValue = <T extends string>(list: T[], value: T, checked: boolean): T[] => {
    if (checked) return list.includes(value) ? list : [...list, value];
    return list.filter((entry) => entry !== value);
  };

  const toggleFlag = (key: keyof BankItemFilters["flags"]) => {
    onChange({
      ...filters,
      flags: { ...filters.flags, [key]: !filters.flags[key] },
    });
  };

  if (!G) return null;

  const activeCount = countActiveFilters(filters);

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_event, isExpanded) => setExpanded(isExpanded)}
      sx={{
        boxShadow: "none",
        "&::before": { display: "none" },
        bgcolor: "transparent",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{
          minHeight: 36,
          px: 0,
          "& .MuiAccordionSummary-content": { my: 0.5, alignItems: "center", gap: 1 },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Filters
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </Typography>
        {active && (
          <Chip
            size="small"
            label="Clear"
            onClick={(event) => {
              event.stopPropagation();
              onChange(EMPTY_BANK_FILTERS);
            }}
            variant="outlined"
          />
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ px: 0, pt: 0, pb: 0.5 }}>
        <Stack spacing={1}>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
            {TITLE_OPTIONS.map((title) => (
              <Chip
                key={title}
                size="small"
                label={title}
                color={filters.titles.includes(title) ? "primary" : "default"}
                variant={filters.titles.includes(title) ? "filled" : "outlined"}
                onClick={() =>
                  onChange({
                    ...filters,
                    titles: toggleListValue(filters.titles, title, !filters.titles.includes(title)),
                  })
                }
              />
            ))}
            {CLASS_OPTIONS.map((classKey) => (
              <Chip
                key={classKey}
                size="small"
                label={classKey.slice(0, 3)}
                title={classKey}
                color={filters.classes.includes(classKey) ? "primary" : "default"}
                variant={filters.classes.includes(classKey) ? "filled" : "outlined"}
                onClick={() =>
                  onChange({
                    ...filters,
                    classes: toggleListValue(
                      filters.classes,
                      classKey,
                      !filters.classes.includes(classKey),
                    ),
                  })
                }
              />
            ))}
            {FLAG_OPTIONS.map(({ key, label }) => (
              <Chip
                key={key}
                size="small"
                label={label}
                color={filters.flags[key] ? "primary" : "default"}
                variant={filters.flags[key] ? "filled" : "outlined"}
                onClick={() => toggleFlag(key)}
              />
            ))}
          </Stack>

          <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="bank-grade-filter">Grade</InputLabel>
              <Select
                labelId="bank-grade-filter"
                label="Grade"
                value={filters.minGrade}
                onChange={(event) => onChange({ ...filters, minGrade: Number(event.target.value) })}
              >
                {gradeFilterOptions().map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {setOptions.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="bank-set-filter">Set</InputLabel>
                <Select
                  labelId="bank-set-filter"
                  label="Set"
                  value={filters.setKeys[0] ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      setKeys: event.target.value ? [String(event.target.value)] : [],
                    })
                  }
                >
                  <MenuItem value="">Any</MenuItem>
                  {setOptions.map((option) => (
                    <MenuItem key={option.key} value={option.key}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {typeOptions.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="bank-type-filter">Type</InputLabel>
                <Select
                  labelId="bank-type-filter"
                  label="Type"
                  value={filters.types[0] ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      types: event.target.value ? [String(event.target.value)] : [],
                    })
                  }
                >
                  <MenuItem value="">Any</MenuItem>
                  {typeOptions.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
