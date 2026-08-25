import { Autocomplete, Chip, TextField } from "@mui/material";

/** Multi-select filter with chip badges (MUI Autocomplete multiple). */
export function MultiFilterAutocomplete({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      value={value}
      onChange={(_, next) => onChange(next)}
      disableCloseOnSelect
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={key} size="small" label={option} {...tagProps} />;
        })
      }
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder ?? label} />
      )}
    />
  );
}
