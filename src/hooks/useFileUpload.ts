import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { generateRouteColor, type ParsedRoute } from "../lib/gpx";
import { handleMutationError, showSuccessToast } from "../lib/errorHandling";

export function useFileUpload() {
  const { t } = useTranslation();
  const generateUploadUrl = useMutation(api.routes.generateUploadUrl);
  const saveRoute = useMutation(api.routes.saveRoute);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (file: File, parsedRoute: ParsedRoute, name?: string, routeType?: "walk" | "bike", color?: string) => {
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
          color: color || generateRouteColor(),
          routeType: routeType ?? "walk",
          startedAt: parsedRoute.startedAt,
          avgSpeedKmh: parsedRoute.avgSpeedKmh,
        });
        showSuccessToast(t("success.routeUploaded"));
      } catch (err) {
        handleMutationError(err, t);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, saveRoute, t],
  );

  return { upload, uploading };
}
