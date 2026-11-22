import { ZonePreset } from "./types";

/** UI chips only — persisted plans store label + color, not preset id. */
export const ZONE_PRESETS: readonly ZonePreset[] = [
  { id: "camp", label: "Camp", color: "#4caf50" },
  { id: "safe", label: "Safe", color: "#2196f3" },
  { id: "nogo", label: "No-go", color: "#f44336" },
  { id: "pull", label: "Pull box", color: "#ff9800" },
  { id: "merchant", label: "Merchant park", color: "#9c27b0" },
];

export function zonePresetById(id: string): ZonePreset | undefined {
  return ZONE_PRESETS.find((preset) => preset.id === id);
}
