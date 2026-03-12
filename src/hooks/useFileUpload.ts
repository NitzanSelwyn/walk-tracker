import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { generateRouteColor, type ParsedRoute } from "../lib/gpx";

export function useFileUpload() {
  const generateUploadUrl = useMutation(api.routes.generateUploadUrl);
  const saveRoute = useMutation(api.routes.saveRoute);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File, parsedRoute: ParsedRoute, name?: string) => {
      setUploading(true);
      try {
        // Step 1: Get signed upload URL from Convex
        const url = await generateUploadUrl();

        // Step 2: Upload the GPX file to Convex storage
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/gpx+xml" },
          body: file,
        });
        const { storageId } = await response.json();

        // Step 3: Save route metadata linking to the stored file
        await saveRoute({
          name: name || parsedRoute.name,
          gpxFileId: storageId,
          geojson: JSON.stringify(parsedRoute.geojson),
          distanceKm: parsedRoute.distanceKm,
          boundingBox: parsedRoute.boundingBox,
          color: generateRouteColor(),
          startedAt: parsedRoute.startedAt,
        });
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, saveRoute],
  );

  return { upload, uploading };
}
