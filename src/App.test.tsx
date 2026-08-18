import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("shows waiting until game data loads", () => {
  render(<App />);
  expect(screen.getByText("WAITING!")).toBeInTheDocument();
});
