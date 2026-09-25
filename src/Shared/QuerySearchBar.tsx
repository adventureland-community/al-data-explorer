import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Paper,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  applyQuerySearchSuggestion,
  getSearchContextProfile,
  trailingFieldContext,
  type QuerySearchMenu,
  type QuerySearchSuggestion,
  type SearchContextId,
} from "./querySearch";

export type QuerySearchBarProps = {
  value: string;
  onChange: (next: string) => void;
  /** Strict surface profile — drives ops, placeholder, footer. */
  context: SearchContextId;
  /**
   * Sectioned suggestions. Prefer a function of the live draft so callers do not
   * mirror draft state via onDraftChange.
   */
  suggestions: QuerySearchMenu | ((draft: string) => QuerySearchMenu);
  /** Debounce commit (default 200ms). Pass 0 for immediate. */
  debounceMs?: number;
  /** Optional advanced options control (Bank / Items / Monsters / NPCs). */
  advanced?: {
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
    content: ReactNode;
    active?: boolean;
  };
  onClear?: () => void;
  fullWidth?: boolean;
  size?: "small" | "medium";
  /** Override profile placeholder. */
  placeholder?: string;
  sx?: object;
};

/**
 * Shared MUI query search field — icon, clear, sectioned suggestions, keyboard nav.
 * Op lists come only from the active profile + caller suggestions (never a global mega-list).
 * Advanced options: Bank / Items / Monsters / NPCs.
 */
export function QuerySearchBar({
  value,
  onChange,
  context,
  suggestions: suggestionsProp,
  debounceMs = 200,
  advanced,
  onClear,
  fullWidth = true,
  size = "small",
  placeholder: placeholderOverride,
  sx,
}: QuerySearchBarProps) {
  const profile = getSearchContextProfile(context);
  const [draft, setDraft] = useState(value);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const navRef = useRef(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (debounceMs <= 0) {
      if (draft !== value) onChange(draft);
      return undefined;
    }
    const timer = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [debounceMs, draft, onChange, value]);

  useLayoutEffect(() => {
    if (!advanced?.open || !anchorRef.current) return;
    setPopoverWidth(anchorRef.current.offsetWidth);
  }, [advanced?.open]);

  const suggestions = useMemo(
    () => (typeof suggestionsProp === "function" ? suggestionsProp(draft) : suggestionsProp),
    [draft, suggestionsProp],
  );

  const { flat } = suggestions;
  const { footer } = profile;

  const pick = useCallback(
    (row: QuerySearchSuggestion) => {
      const trailing = trailingFieldContext(draft, profile.trailingOps, profile.aliases);
      const next = applyQuerySearchSuggestion(draft, row, trailing);
      setDraft(next);
      onChange(next);
      setHi(0);
      navRef.current = false;
      const keepsOpen = !!(row.insert && /:$/u.test(row.insert));
      const nextTrailing = trailingFieldContext(next, profile.trailingOps, profile.aliases);
      setMenuOpen(keepsOpen || !!nextTrailing);
      window.setTimeout(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        const len = el.value.length;
        try {
          el.setSelectionRange(len, len);
        } catch {
          /* ignore */
        }
      }, 0);
    },
    [draft, onChange, profile.aliases, profile.trailingOps],
  );

  const clear = () => {
    setDraft("");
    onChange("");
    onClear?.();
    setMenuOpen(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (!menuOpen || flat.length === 0) {
      if (event.key === "Escape") setMenuOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      navRef.current = true;
      setHi((h) => (h + 1) % flat.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      navRef.current = true;
      setHi((h) => (h - 1 + flat.length) % flat.length);
      return;
    }
    if (event.key === "Enter") {
      if (navRef.current && flat[hi]) {
        event.preventDefault();
        pick(flat[hi]);
      } else {
        setMenuOpen(false);
        if (draft !== value) onChange(draft);
      }
      return;
    }
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  };

  const queryActive = Boolean(value.trim());
  let flatIndex = 0;

  return (
    <Box
      ref={anchorRef}
      sx={{ position: "relative", width: fullWidth ? "100%" : undefined, ...sx }}
    >
      <TextField
        inputRef={inputRef}
        id={`query-search-${context}`}
        placeholder={placeholderOverride ?? profile.placeholder}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          setMenuOpen(true);
          setHi(0);
          navRef.current = false;
        }}
        onFocus={() => {
          setMenuOpen(true);
          setHi(0);
          navRef.current = false;
        }}
        onBlur={() => {
          window.setTimeout(() => setMenuOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        size={size}
        fullWidth={fullWidth}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {queryActive || draft ? (
                <Tooltip title="Clear search">
                  <IconButton size="small" edge="end" aria-label="Clear search" onClick={clear}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              {advanced ? (
                <Tooltip title="Show search options">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Show search options"
                    aria-expanded={advanced.open}
                    aria-haspopup="dialog"
                    color={advanced.active || advanced.open ? "primary" : "default"}
                    onClick={advanced.onToggle}
                  >
                    <FilterListIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </InputAdornment>
          ),
        }}
      />

      {menuOpen && flat.length > 0 ? (
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            zIndex: 20,
            left: 0,
            right: 0,
            mt: 0.5,
            maxHeight: 320,
            overflow: "auto",
            border: 1,
            borderColor: "divider",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <List dense disablePadding>
            {suggestions.sections.map((section) => {
              const sectionStart = flatIndex;
              const nodes = section.rows.map((row, i) => {
                const index = sectionStart + i;
                flatIndex += 1;
                return (
                  <ListItemButton
                    key={`${section.title}-${row.label}-${index}`}
                    selected={index === hi}
                    onMouseEnter={() => {
                      navRef.current = true;
                      setHi(index);
                    }}
                    onClick={() => pick(row)}
                  >
                    <ListItemText
                      primary={row.label}
                      secondary={row.hint}
                      primaryTypographyProps={{ variant: "body2" }}
                      secondaryTypographyProps={{ variant: "caption" }}
                    />
                  </ListItemButton>
                );
              });
              return (
                <Box key={section.title} component="li" sx={{ listStyle: "none" }}>
                  <ListSubheader
                    sx={{
                      lineHeight: "32px",
                      bgcolor: "background.paper",
                      typography: "caption",
                      fontWeight: 600,
                    }}
                  >
                    {section.title}
                  </ListSubheader>
                  {nodes}
                </Box>
              );
            })}
          </List>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", px: 1.5, py: 0.75, borderTop: 1, borderColor: "divider" }}
          >
            {footer}
          </Typography>
        </Paper>
      ) : null}

      {advanced ? (
        <Popover
          open={advanced.open}
          anchorEl={anchorRef.current}
          onClose={advanced.onClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            elevation: 8,
            sx: {
              mt: 0.5,
              width: popoverWidth,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: "min(70vh, 560px)",
              overflow: "auto",
              p: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? theme.palette.grey[900]
                  : theme.palette.background.paper,
              backgroundImage: "none",
              border: 1,
              borderColor: "divider",
            },
          }}
        >
          {advanced.content}
        </Popover>
      ) : null}
    </Box>
  );
}
