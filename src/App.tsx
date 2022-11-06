import React, { createContext, useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import axios from "axios";
import { StatType } from "adventureland";
import Divider from "@mui/material/Divider";
import { GearPlanner } from "./GearPlanner/GearPlanner";
import { base_gold, CustomGData, GDataContext } from "./GDataContext";
import {
  createTheme,
  CssBaseline,
  Link,
  Tab,
  Tabs,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import {
  Outlet,
  Link as RouterLink,
  useLocation,
  matchPath,
} from "react-router-dom";

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
    [prefersDarkMode]
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
      .then(function (response) {
        // handle success
        setG({...response.data, base_gold});
      })
      .catch(function (error) {
        // handle error
        console.log(error);
      })
      .then(function () {
        // always executed
      });
  }, [G]);

  if (!G) {
    return <>WAITING!</>;
  }

  const statType: StatType[] = [
    "armor",
    "attack",
    "dex",
    "for",
    "frequency",
    "gold",
    "hp",
    "int",
    "lifesteal",
    "luck",
    "mp_cost",
    "range",
    "resistance",
    "speed",
    "str",
    "vit",
  ];
  // const columns = ["name", "g", ...statType];
  // const columns = [
  //   {
  //     id: "name",
  //     numeric: false,
  //     label: "Name",
  //   },
  //   {
  //     id: "class",
  //     numeric: true,
  //     label: "Class",
  //     component: (x: string[]) => (x ? x.join(",") : ""),
  //   },
  //   {
  //     id: "type",
  //     numeric: true,
  //     label: "Type",
  //   },
  //   {
  //     id: "wtype",
  //     numeric: true,
  //     label: "W Type", // Merge with type?
  //   },
  //   {
  //     id: "tier",
  //     numeric: true,
  //     label: "Tier",
  //   },
  //   {
  //     id: "armor",
  //     numeric: true,
  //     label: "Armor",
  //   },
  // ];
  // console.log(G.items);
  // const rows = G.items
  //   ? Object.entries(G.items).map(([itemName, item]) => {
  //       const row = {
  //         itemName,
  //         ...item,
  //       };

  //       return row;
  //     })
  //   : [];

  // const classes = G.classes
  //   ? Object.entries(G.classes).map(([className, item]) => {
  //       return className;
  //     })
  //   : [];
  // const itemTypes = [
  //   ...new Set(G.items ? Object.values(G.items).map((i) => i.type) : []),
  // ];
  // // TODO: filtering, by class, by type, by stat properties (search field?)
  // // was thinking filters could be pills at least some of them?

  // const filterByClass = (x: any) => {
  //   // TODO: we should toggle filters on / off
  //   console.log(x);
  // };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* <Routes /> */}
      <GDataContext.Provider value={G}>
        <div className="App">
          <Menu />
          {/* Actually render the page here */}
          <Outlet />
          {/* <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header> */}
          {/* {classes.map((c) => (
            <Chip label={c} variant="outlined" onClick={() => filterByClass(c)} />
          ))} */}
          <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
          {/* {itemTypes.map((c) => (
            <Chip label={c} variant="outlined" onClick={() => filterByClass(c)} />
          ))} */}
          {/* <TableContainer component={Paper}>
            <Table
              stickyHeader
              sx={{ minWidth: 650 }}
              size="small"
              aria-label="a dense table"
            >
              <TableHead>
                <TableRow>
                  <TableCell>itemName</TableCell>
                  {columns.map((c) => {
                    return (
                      <TableCell key={c.id} align={c.numeric ? "right" : "left"}>
                        {c.label}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.itemName}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {row.itemName}
                    </TableCell>
                    {columns.map((c) => {
                      const property = (row as any)[c.id];
                      return (
                        <TableCell
                          key={row.itemName + c.id}
                          align={c.numeric ? "right" : "left"}
                        >
                          {c.component ? c.component(property) : property}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer> */}
          <Divider sx={{ marginTop: 2, marginBottom: 2 }} />
          data v{G?.version} | {G ? new Date(G.timestamp).toLocaleString() : ""}
        </div>
      </GDataContext.Provider>
    </ThemeProvider>
  );
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

function Menu() {
  const routeMatch = useRouteMatch(["/", "/market", "/gear", "/monsters"]);
  const currentTab = routeMatch?.pattern?.path ?? "/market";

  return (
    <Tabs value={currentTab} centered sx={{ marginBottom: "15px" }}>
      <Tab label="Monsters" value="/monsters" to="/monsters" component={RouterLink} />
      <Tab label="Market" value="/market" to="/market" component={RouterLink} />
      <Tab
        label="Gear Planner"
        value="/gear"
        to="/gear"
        component={RouterLink}
      />
    </Tabs>
  );
}

export default App;
