import { Box } from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";

import { QuerySearchBar } from "../Shared/QuerySearchBar";
import { GDataContext } from "../GDataContext";
import { AggregatedBankItem } from "./bankItems";
import { BankAdvancedSearchPanel, bankAdvancedFormHasValues } from "./BankAdvancedSearchPanel";
import {
  advancedSearchFormFromQuery,
  BankAdvancedSearchForm,
  buildBankSearchSuggestions,
  EMPTY_BANK_ADVANCED_SEARCH,
  parseBankSearchQuery,
  serializeAdvancedSearchForm,
} from "./bankSearchQuery";

type BankSearchBarProps = {
  items: AggregatedBankItem[];
  search: string;
  onSearch: (query: string) => void;
};

/** Bank query search with suggestions + advanced options popover. */
export function BankSearchBar({ items, search, onSearch }: BankSearchBarProps) {
  const G = useContext(GDataContext);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BankAdvancedSearchForm>(EMPTY_BANK_ADVANCED_SEARCH);

  useEffect(() => {
    if (!open) return;
    setForm(advancedSearchFormFromQuery(parseBankSearchQuery(search)));
  }, [open, search]);

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

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const item of items) {
      if (item.category) categories.add(item.category);
    }
    return Array.from(categories).sort();
  }, [items]);

  const itemNames = useMemo(() => items.map((i) => i.name), [items]);

  const suggestions = useMemo(
    () => (draft: string) =>
      buildBankSearchSuggestions(draft, {
        types: typeOptions,
        categories: categoryOptions,
        itemNames,
      }),
    [categoryOptions, itemNames, typeOptions],
  );

  const apply = () => {
    onSearch(serializeAdvancedSearchForm(form));
    setOpen(false);
  };

  const clear = () => {
    setForm(EMPTY_BANK_ADVANCED_SEARCH);
    onSearch("");
    setOpen(false);
  };

  return (
    <Box sx={{ flex: "1 1 auto", minWidth: 200, width: "100%" }}>
      <QuerySearchBar
        context="bank"
        value={search}
        onChange={onSearch}
        suggestions={suggestions}
        debounceMs={300}
        onClear={() => setForm(EMPTY_BANK_ADVANCED_SEARCH)}
        advanced={{
          open,
          onToggle: () => setOpen((was) => !was),
          onClose: () => setOpen(false),
          content: (
            <BankAdvancedSearchPanel
              form={form}
              onChange={setForm}
              typeOptions={typeOptions}
              categoryOptions={categoryOptions}
              setOptions={setOptions}
              search={search}
              onApply={apply}
              onClear={clear}
            />
          ),
          active: Boolean(search.trim()) || bankAdvancedFormHasValues(form),
        }}
      />
    </Box>
  );
}
