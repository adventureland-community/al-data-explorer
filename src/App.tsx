import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  createTheme,
  CssBaseline,
  Tab,
  Tabs,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { Outlet, Link as RouterLink, useLocation, matchPath } from "react-router-dom";

import "./App.css";
import { base_gold, CustomGData, GDataContext } from "./GDataContext";

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
  const routeMatch = useRouteMatch(["/market", "/gear", "/monsters", "/bank", "/world"]);
  const currentTab = routeMatch?.pattern?.path ?? false;

  return (
    <Tabs value={currentTab} centered sx={{ marginBottom: compact ? 0 : "15px", flexShrink: 0 }}>
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

  console.log("AppRedraw");

  // TODO: move to GDataContext
  useEffect(() => {
    if (G) {
      return;
    }
    console.log("getting data.json");
    axios
      .get("data.json")
      .then((response) => {
        setG({ ...response.data, base_gold });
      })
      .catch((error) => {
        console.log(error);
      });
  }, [G]);

  if (!G) {
    return <>WAITING!</>;
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
