import { useState, useCallback } from "react";
import { parseGpx, type ParsedRoute } from "../lib/gpx";

export function useGpxParser() {
  const [parsedRoute, setParsedRoute] = useState<ParsedRoute | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const text = await file.text();
      const result = parseGpx(text);
      setParsedRoute(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse GPX file");
      setParsedRoute(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParsedRoute(null);
    setError(null);
  }, []);

  return { parsedRoute, parsing, error, parseFile, reset };
}
