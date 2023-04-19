import { Input } from "@mui/material";
import React, { useEffect, useState } from "react";

export function Search({ doSearch }: { doSearch: (search: string) => void }) {
  const [search, setSearch] = useState("");

  const onSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    setSearch(value);
  };

  useEffect(() => {
    const timeOutId = setTimeout(() => doSearch(search), 500);
    return () => clearTimeout(timeOutId);
  }, [doSearch, search]);

  return <Input id="search" placeholder="Search" onChange={onSearch} autoComplete="off" />;
}
