import { SxProps, Theme } from "@mui/material";

/** Shared table cell styles for drop simulator panels. */
export const simNumericCellSx: SxProps<Theme> = {
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  fontSize: "0.8125rem",
  minWidth: 72,
};

export const simTableSx: SxProps<Theme> = {
  width: "100%",
  tableLayout: "auto",
  "& .MuiTableCell-root": {
    py: 1,
    px: 1.25,
    verticalAlign: "middle",
    borderBottom: "1px solid",
    borderColor: (theme) =>
      theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  },
  "& .MuiTableCell-head": {
    fontWeight: 600,
    fontSize: "0.75rem",
    color: "text.secondary",
    whiteSpace: "nowrap",
    borderBottom: "1px solid",
    borderColor: "divider",
  },
  "& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root": {
    borderBottom: "none",
  },
  "& .MuiTableCell-root:first-of-type": {
    minWidth: 220,
    width: "40%",
  },
};

export const simPanelPaperSx: SxProps<Theme> = {
  p: 2,
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
};
