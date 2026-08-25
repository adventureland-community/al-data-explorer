import { Box, CircularProgress, Typography } from "@mui/material";

export function LoadingState({ label = "Loading game data…" }: { label?: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        py: 8,
      }}
    >
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
