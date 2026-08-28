import SearchIcon from "@mui/icons-material/Search";
import { Input, InputAdornment, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";

export function Search({
  doSearch,
  value: controlledValue,
  placeholder = "Search by name or key",
  sx,
  variant = "standard",
  size = "medium",
  fullWidth = false,
}: {
  doSearch: (search: string) => void;
  value?: string;
  placeholder?: string;
  sx?: object;
  variant?: "standard" | "outlined";
  size?: "small" | "medium";
  fullWidth?: boolean;
}) {
  const [search, setSearch] = useState(controlledValue ?? "");

  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== search) {
      setSearch(controlledValue);
    }
  }, [controlledValue, search]);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    setSearch(value);
  };

  useEffect(() => {
    const timeOutId = setTimeout(() => doSearch(search), 500);
    return () => clearTimeout(timeOutId);
  }, [doSearch, search]);

  if (variant === "outlined") {
    return (
      <TextField
        id="search"
        placeholder={placeholder}
        value={search}
        onChange={onSearch}
        autoComplete="off"
        size={size}
        fullWidth={fullWidth}
        sx={{ minWidth: 200, flex: fullWidth ? "1 1 auto" : "1 1 200px", ...sx }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />
    );
  }

  return (
    <Input
      id="search"
      placeholder={placeholder}
      value={search}
      onChange={onSearch}
      autoComplete="off"
      sx={{ minWidth: 200, flex: "1 1 200px", ...sx }}
    />
  );
}
