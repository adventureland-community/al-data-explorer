import { useMemo } from "react";

export default () => useMemo(() => {
    return process.env.NODE_ENV !== "production";
}, []);
