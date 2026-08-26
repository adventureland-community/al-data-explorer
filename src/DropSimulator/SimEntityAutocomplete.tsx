import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { ReactNode } from "react";

function OptionPrimarySecondary({ primary, secondary }: { primary: string; secondary?: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Typography variant="body2" noWrap>
        {primary}
      </Typography>
      {secondary ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {secondary}
        </Typography>
      ) : null}
    </Box>
  );
}

export function SimEntityAutocomplete<T extends string>({
  options,
  value,
  label,
  onChange,
  getOptionLabel,
  getPrimaryLabel,
  getSecondaryLabel,
  filterOption,
  renderListIcon,
  renderInputIcon,
  inputIconBoxSx,
}: {
  options: T[];
  value: T | null;
  label: string;
  onChange: (value: T | null) => void;
  getOptionLabel: (key: T) => string;
  getPrimaryLabel: (key: T) => string;
  getSecondaryLabel?: (key: T) => string | undefined;
  filterOption: (key: T, query: string) => boolean;
  renderListIcon: (key: T) => ReactNode;
  renderInputIcon?: (key: T) => ReactNode;
  inputIconBoxSx?: object;
}) {
  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_, next) => onChange(next)}
      getOptionLabel={getOptionLabel}
      filterOptions={(opts, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return opts;
        return opts.filter((key) => filterOption(key, q));
      }}
      sx={{ minWidth: 0, flex: "1 1 280px", maxWidth: "100%" }}
      ListboxProps={{ style: { maxHeight: 360 } }}
      renderOption={(props, option) => (
        <li {...props} key={option}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75 }}>
            {renderListIcon(option)}
            <OptionPrimarySecondary
              primary={getPrimaryLabel(option)}
              secondary={getSecondaryLabel?.(option)}
            />
          </Box>
        </li>
      )}
      renderInput={(inputParams) => (
        <TextField
          {...inputParams}
          label={label}
          size="small"
          InputProps={{
            ...inputParams.InputProps,
            startAdornment: (
              <>
                {value && renderInputIcon ? (
                  <Box sx={{ display: "flex", mr: 0.5, ml: 0.5, ...inputIconBoxSx }}>
                    {renderInputIcon(value)}
                  </Box>
                ) : null}
                {inputParams.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
