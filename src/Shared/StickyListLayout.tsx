import { Box, Paper, TableContainer } from "@mui/material";
import { ReactNode } from "react";

/**
 * Fills the app outlet: toolbar + filters stay put; `children` scroll in the
 * remaining space (use with `<Table stickyHeader>` inside StickyTableShell).
 */
export function StickyListLayout({
  toolbar,
  filters,
  children,
}: {
  toolbar?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        p: 2,
      }}
    >
      {toolbar ? <Box sx={{ flexShrink: 0, mb: 2 }}>{toolbar}</Box> : null}
      {filters ? <Box sx={{ flexShrink: 0, mb: 2 }}>{filters}</Box> : null}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</Box>
    </Box>
  );
}

/** Scroll region for a stickyHeader table (or empty-state content). */
export function StickyTableShell({ children }: { children: ReactNode }) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
      }}
    >
      {children}
    </TableContainer>
  );
}
