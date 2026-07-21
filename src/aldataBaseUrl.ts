/** Base URL for earthiverse ALData. Override with REACT_APP_ALDATA_URL for local stacks. */
export const ALDATA_BASE_URL =
  process.env.REACT_APP_ALDATA_URL?.replace(/\/$/, "") || "https://aldata.earthiverse.ca";
