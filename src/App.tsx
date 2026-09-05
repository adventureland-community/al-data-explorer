import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import {
  Box,
  Button,
  createTheme,
  CssBaseline,
  IconButton,
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

const THEME_STORAGE_KEY = "al-data-explorer-color-mode";

type ColorMode = "light" | "dark";

function readStoredMode(): ColorMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // ignore
  }
  return null;
}

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

const ThemeModeContext = React.createContext<{
  mode: ColorMode;
  toggleMode: () => void;
}>({ mode: "light", toggleMode: () => undefined });

function Menu({ compact = false }: { compact?: boolean }) {
  const { mode, toggleMode } = useContext(ThemeModeContext);
  const { pathname } = useLocation();
  const routeMatch = useRouteMatch([
    "/market",
    "/gear",
    "/monsters",
    "/bank",
    "/world",
    "/items",
    "/drops",
    "/classes",
  ]);
  const itemsSelected = pathname === "/items" || pathname.startsWith("/items/");
  const classesSelected =
    pathname === "/classes" ||
    pathname.startsWith("/classes/") ||
    pathname === "/skills" ||
    pathname.startsWith("/skills/");
  const currentTab = itemsSelected
    ? "/items"
    : classesSelected
    ? "/classes"
    : routeMatch?.pattern?.path ?? false;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        marginBottom: compact ? 0 : "15px",
        flexShrink: 0,
      }}
    >
      <Tabs value={currentTab} centered sx={{ flex: 1 }}>
        <Tab label="Items" value="/items" to="/items" component={RouterLink} />
        <Tab label="Gear Planner" value="/gear" to="/gear" component={RouterLink} />
        <Tab label="Monsters" value="/monsters" to="/monsters" component={RouterLink} />
        <Tab label="Classes" value="/classes" to="/classes" component={RouterLink} />
        <Tab label="Drops" value="/drops" to="/drops" component={RouterLink} />
        <Tab label="🌎 Market" value="/market" to="/market" component={RouterLink} />
        <Tab label="🌎 Bank" value="/bank" to="/bank" component={RouterLink} />
        <Tab label="World" value="/world" to="/world" component={RouterLink} />
      </Tabs>
      <IconButton
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleMode}
        size="small"
        sx={{ mr: 1 }}
      >
        {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Box>
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
  const [mode, setMode] = useState<ColorMode>(() => readStoredMode() ?? "light");
  const [modeReady, setModeReady] = useState(() => readStoredMode() != null);

  useEffect(() => {
    if (modeReady) return;
    setMode(prefersDarkMode ? "dark" : "light");
    setModeReady(true);
  }, [modeReady, prefersDarkMode]);

  const toggleMode = () => {
    setMode((prev) => {
      const next: ColorMode = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: (t) => {
              const track =
                t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
              const thumb =
                t.palette.mode === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
              const thumbHover =
                t.palette.mode === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
              return {
                "*": {
                  scrollbarWidth: "thin",
                  scrollbarColor: `${thumb} ${track}`,
                },
                "*::-webkit-scrollbar": {
                  width: 8,
                  height: 8,
                },
                "*::-webkit-scrollbar-track": {
                  backgroundColor: track,
                  borderRadius: 8,
                },
                "*::-webkit-scrollbar-thumb": {
                  backgroundColor: thumb,
                  borderRadius: 8,
                  border: "2px solid transparent",
                  backgroundClip: "content-box",
                },
                "*::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: thumbHover,
                },
                "*::-webkit-scrollbar-corner": {
                  backgroundColor: "transparent",
                },
              };
            },
          },
        },
      }),
    [mode],
  );

  const themeModeValue = useMemo(() => ({ mode, toggleMode }), [mode]);

  useEffect(() => {
    if (G) {
      return;
    }
    let cancelled = false;
    // Absolute path — relative "data.json" breaks on /items/:key and /items/compare.
    // Deploy sets REACT_APP_BUILD_ID so CDN/browser cache keys change each release
    // (GitHub Pages serves data.json with max-age=600). Dev busts every load.
    const cacheBust =
      process.env.REACT_APP_BUILD_ID ??
      (process.env.NODE_ENV === "development" ? String(Date.now()) : "0");
    axios
      .get(`/data.json?v=${encodeURIComponent(cacheBust)}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
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
      <ThemeModeContext.Provider value={themeModeValue}>
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
      </ThemeModeContext.Provider>
    );
  }

  return (
    <ThemeModeContext.Provider value={themeModeValue}>
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
    </ThemeModeContext.Provider>
  );
}

export default App;
