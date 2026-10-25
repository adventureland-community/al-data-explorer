import React from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import App, { StandardLayout } from "./App";
import { CustomGData, GDataContext } from "./GDataContext";

test("shows loading state until game data loads", () => {
  render(<App />);
  expect(screen.getByText(/Loading game data/i)).toBeInTheDocument();
});

test("nav links to the GitHub repository", () => {
  const G = { version: 1, timestamp: Date.now() } as unknown as CustomGData;
  render(
    <ThemeProvider theme={createTheme()}>
      <GDataContext.Provider value={G}>
        <MemoryRouter>
          <Routes>
            <Route element={<StandardLayout />}>
              <Route path="/" element={<div>home</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </GDataContext.Provider>
    </ThemeProvider>,
  );

  const link = screen.getByRole("link", { name: /Open AL Data Explorer on GitHub/i });
  expect(link).toHaveAttribute(
    "href",
    "https://github.com/adventureland-community/al-data-explorer",
  );
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});
