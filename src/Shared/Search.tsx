import { Input } from "@mui/material";
import React, { useEffect, useState } from "react";

export function Search({
  doSearch,
  value: controlledValue,
  placeholder = "Search by name or key",
  sx,
}: {
  doSearch: (search: string) => void;
  value?: string;
  placeholder?: string;
  sx?: object;
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
