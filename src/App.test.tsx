import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("shows loading state until game data loads", () => {
  render(<App />);
  expect(screen.getByText(/Loading game data/i)).toBeInTheDocument();
});
