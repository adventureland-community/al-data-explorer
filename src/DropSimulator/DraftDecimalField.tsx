import { TextField, Tooltip } from "@mui/material";
import { InputHTMLAttributes, useEffect, useState } from "react";

/** Partial decimal input while typing; empty string allowed. */
function isDraftDecimal(raw: string): boolean {
  return raw === "" || /^\d*\.?\d*$/.test(raw);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function DraftDecimalField({
  label,
  title,
  value,
  onCommit,
  width = 84,
  inputProps,
  disabled,
  min = 0,
  max = Infinity,
  fallback,
}: {
  label: string;
  title: string;
  value: number;
  onCommit: (value: number) => void;
  width?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  disabled?: boolean;
  min?: number;
  max?: number;
  fallback?: number;
}) {
  const [draft, setDraft] = useState(() => String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === ".") {
      const next = fallback ?? value;
      onCommit(clamp(next, min, max));
      setDraft(String(clamp(next, min, max)));
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed, min, max);
    onCommit(next);
    setDraft(String(next));
  };

  return (
    <Tooltip title={title} arrow placement="top">
      <TextField
        label={label}
        type="text"
        size="small"
        value={draft}
        disabled={disabled}
        inputMode="decimal"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (!isDraftDecimal(raw)) return;
          setDraft(raw);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        inputProps={inputProps}
        sx={{ width }}
      />
    </Tooltip>
  );
}
