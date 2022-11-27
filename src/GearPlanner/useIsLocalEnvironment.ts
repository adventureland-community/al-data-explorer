import { useMemo } from "react";

export default () => useMemo(() => process.env.NODE_ENV !== "production", []);
