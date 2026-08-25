import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  createTheme,
  CssBaseline,
  Tab,
  Tabs,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Outlet, Link as RouterLink, useLocation, matchPath } from "react-router-dom";

import "./App.css";
import { base_gold, CustomGData, GDataContext } from "./GDataContext";
import { buildGameDataIndexes } from "./gameData/indexes";
import { LoadingState } from "./Shared/LoadingState";

function useRouteMatch(patterns: readonly string[]) {
  const { pathname } = useLocation();

  for (let i = 0; i < patterns.length; i += 1) {
    const pattern = patterns[i];
    const possibleMatch = matchPath(pattern, pathname);
    if (possibleMatch !== null) {
      return possibleMatch;
    }
  }

  return null;
}

function Menu({ compact = false }: { compact?: boolean }) {
  const { pathname } = useLocation();
  const routeMatch = useRouteMatch(["/market", "/gear", "/monsters", "/bank", "/world", "/items"]);
  const itemsSelected = pathname === "/items" || pathname.startsWith("/items/");
  const currentTab = itemsSelected ? "/items" : routeMatch?.pattern?.path ?? false;

  return (
    <Tabs value={currentTab} centered sx={{ marginBottom: compact ? 0 : "15px", flexShrink: 0 }}>
      <Tab label="Items" value="/items" to="/items" component={RouterLink} />
      <Tab label="Gear Planner" value="/gear" to="/gear" component={RouterLink} />
      <Tab label="Monsters" value="/monsters" to="/monsters" component={RouterLink} />
      <Tab label="🌎 Market" value="/market" to="/market" component={RouterLink} />
      <Tab label="🌎 Bank" value="/bank" to="/bank" component={RouterLink} />
      <Tab label="World" value="/world" to="/world" component={RouterLink} />
    </Tabs>
  );
}

function AppFooter() {
  const G = useContext(GDataContext);
  return (
    <Box
      component="footer"
      sx={{
        flexShrink: 0,
        borderTop: 1,
        borderColor: "divider",
        paddingY: 1,
        textAlign: "center",
      }}
    >
      data v{G?.version} | {G ? new Date(G.timestamp).toLocaleString() : ""}
    </Box>
  );
}

export function StandardLayout() {
  return (
    <>
      <Menu />
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <Outlet />
      </Box>
      <AppFooter />
    </>
  );
}

export function FullBleedLayout() {
  return (
    <>
      <Menu compact />
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Outlet />
      </Box>
    </>
  );
}

function App() {
  const [G, setG] = useState<CustomGData>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode],
  );

  useEffect(() => {
    if (G) {
      return;
    }
    let cancelled = false;
    // Absolute path — relative "data.json" breaks on /items/:key and /items/compare.
    axios
      .get("/data.json")
      .then((response) => {
        if (cancelled) return;
        const loaded = { ...response.data, base_gold } as CustomGData;
        loaded.indexes = buildGameDataIndexes(loaded);
        setG(loaded);
        setLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load /data.json", error);
        setLoadError("Could not load game data. Check that /data.json is available.");
      });
    return () => {
      cancelled = true;
    };
  }, [G, loadAttempt]);

  if (!G) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {loadError ? (
          <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
            <Typography variant="h6" gutterBottom>
              Failed to load
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              {loadError}
            </Typography>
            <Button
              sx={{ mt: 2 }}
              variant="outlined"
              onClick={() => {
                setLoadError(null);
                setLoadAttempt((n) => n + 1);
              }}
            >
              Retry
            </Button>
          </Box>
        ) : (
          <LoadingState />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GDataContext.Provider value={G}>
        <Box
          className="App"
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <Outlet />
        </Box>
      </GDataContext.Provider>
    </ThemeProvider>
  );
}

export default App;
