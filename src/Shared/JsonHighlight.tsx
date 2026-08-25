import { Box } from "@mui/material";
import { Fragment, useMemo } from "react";

export type JsonTokenKind = "key" | "string" | "number" | "boolean" | "null" | "punct" | "plain";

export type JsonToken = {
  kind: JsonTokenKind;
  text: string;
  offset: number;
};

/** Tokenize pretty-printed JSON for syntax coloring (no dependency). */
export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;

  const push = (kind: JsonTokenKind, textValue: string, offset: number) => {
    if (textValue.length === 0) return;
    tokens.push({ kind, text: textValue, offset });
  };

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === '"') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      const quoted = text.slice(i, j);
      let k = j;
      while (k < text.length && (text[k] === " " || text[k] === "\t")) k += 1;
      push(text[k] === ":" ? "key" : "string", quoted, i);
      i = j;
      continue;
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let j = i + 1;
      while (j < text.length && /[0-9.eE+-]/.test(text[j]!)) j += 1;
      push("number", text.slice(i, j), i);
      i = j;
      continue;
    }

    if (text.startsWith("true", i)) {
      push("boolean", "true", i);
      i += 4;
      continue;
    }
    if (text.startsWith("false", i)) {
      push("boolean", "false", i);
      i += 5;
      continue;
    }
    if (text.startsWith("null", i)) {
      push("null", "null", i);
      i += 4;
      continue;
    }

    if ("{}[]:,".includes(ch)) {
      push("punct", ch, i);
      i += 1;
      continue;
    }

    let j = i + 1;
    while (j < text.length) {
      const next = text[j]!;
      if (
        next === '"' ||
        next === "-" ||
        (next >= "0" && next <= "9") ||
        "{}[]:,".includes(next) ||
        text.startsWith("true", j) ||
        text.startsWith("false", j) ||
        text.startsWith("null", j)
      ) {
        break;
      }
      j += 1;
    }
    push("plain", text.slice(i, j), i);
    i = j;
  }

  return tokens;
}

const TOKEN_COLOR: Record<JsonTokenKind, string> = {
  key: "#9cdcfe",
  string: "#ce9178",
  number: "#b5cea8",
  boolean: "#569cd6",
  null: "#569cd6",
  punct: "#d4d4d4",
  plain: "#cfcfcf",
};

export function JsonHighlight({ value }: { value: unknown }): JSX.Element {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const tokens = useMemo(() => tokenizeJson(text), [text]);

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        fontSize: 11,
        lineHeight: 1.35,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {tokens.map((token) => (
        <Fragment key={token.offset}>
          <Box component="span" sx={{ color: TOKEN_COLOR[token.kind] }}>
            {token.text}
          </Box>
        </Fragment>
      ))}
    </Box>
  );
}
