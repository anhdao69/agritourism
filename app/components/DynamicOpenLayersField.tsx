"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
// Import leaflet-draw styles
import "leaflet-draw/dist/leaflet.draw.css"; 
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import proj4 from "proj4";

// ---- FIX: use an `any` view for defs lookups/calls ----
const proj4Any = proj4 as unknown as {
  defs: any; // allow index + call form
};
// expose proj4
if (typeof window !== "undefined") {
  (window as any).proj4 = proj4Any;
  if (!proj4Any.defs["EPSG:5070"]) {
    proj4Any.defs(
      "EPSG:5070",
      "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs"
    );
  }
  if (!proj4Any.defs["ESRI:102003"]) {
    proj4Any.defs(
      "ESRI:102003",
      "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs"
    );
  }
  if (!proj4Any.defs["CUSTOM:AEA_WGS84"]) {
    proj4Any.defs(
      "CUSTOM:AEA_WGS84",
      "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
    );
  }
}

// --- NEW TYPE: The component will now handle GeoJSON objects ---
type GeoJSONValue = object | null;

interface OpenLayersFieldProps {
  field: {
    label: string;
    required?: boolean;
    defaultCenter?: [number, number]; // [lon, lat]
    defaultZoom?: number;
  };
  value: GeoJSONValue; // Changed from LatLng
  onChange: (value: GeoJSONValue) => void; // Changed from (LatLng) => void
  disabled: boolean;
  tifUrl?: string;
}

// Leaflet marker icon fix
const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function GeoTiffOverlay({
  url,
  opacity,
  onLoaded,
  onError,
}: {
  url: string;
  opacity: number;
  onLoaded?: (b: L.LatLngBounds) => void;
  onError?: (msg: string) => void;
}) {
  const map = useMap();
  const layerRef = useRef<GeoRasterLayer<any> | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const ab = await res.arrayBuffer();
        const georaster = await parseGeoraster(ab);
        const layer = new GeoRasterLayer({ georaster, opacity, resolution: 256 });
        if (cancelled) return;
        layer.addTo(map);
        layerRef.current = layer;
        const bounds = layer.getBounds();
        if (bounds?.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
        onLoaded?.(bounds);
      } catch (e: any) {
        console.error("GeoTIFF load error:", e);
        onError?.(e?.message ?? "Failed to load GeoTIFF.");
      }
    })();
    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [url, map, onLoaded, onError]);
  useEffect(() => {
    if (layerRef.current) layerRef.current.setOpacity(opacity);
  }, [opacity]);
  return null;
}

// Invalidate size when height changes (so tiles reflow)
function InvalidateOnResize({ nonce }: { nonce: number }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [nonce, map]);
  return null;
}

// Component to handle clearing layers from outside the map
function LayerClearer({ 
  shouldClear, 
  onCleared,
  featureGroupRef 
}: { 
  shouldClear: boolean; 
  onCleared: () => void;
  featureGroupRef: React.RefObject<L.FeatureGroup>;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (shouldClear && featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      onCleared();
    }
  }, [shouldClear, onCleared, featureGroupRef, map]);
  
  return null;
}

export default function DynamicOpenLayersField({
  field,
  value,
  onChange,
  disabled,
  tifUrl = "/map_4326.tif",
}: OpenLayersFieldProps) {
  const [loadingTif, setLoadingTif] = useState(true);
  const [tifError, setTifError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [expanded, setExpanded] = useState(true);
  const [shouldClearLayers, setShouldClearLayers] = useState(false);
  const heightPx = expanded ? "70vh" : "400px";
  const sizeNonce = expanded ? 1 : 0;
  
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const initialCenter = useMemo<[number, number]>(() => {
    const ll = field.defaultCenter ?? [-83.8926, 34.3056]; // [lon, lat]
    return [ll[1], ll[0]]; // Leaflet wants [lat, lon]
  }, [field.defaultCenter]);

  const initialZoom = field.defaultZoom ?? 11;

  // --- Download GeoJSON ---
  const handleExport = () => {
    if (!value) {
      alert("No polygon to export.");
      return;
    }
    try {
      const dataStr = JSON.stringify(value, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${field.label.replace(/ /g, "_") || "polygon"}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Failed to export GeoJSON.");
    }
  };

  // --- Delete/Clear Polygon ---
  const handleDelete = useCallback(() => {
    // Clear the value in the parent form
    onChange(null);
    // Trigger layer clearing in the map
    setShouldClearLayers(true);
  }, [onChange]);

  // Callback when layers are cleared
  const handleLayersCleared = useCallback(() => {
    setShouldClearLayers(false);
  }, []);

  // --- Drawing Event Handlers ---
  const onCreated = (e: any) => {
    if (disabled) return;
    
    // Clear any existing layers first (only allow one polygon at a time)
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    
    const layer = e.layer;
    const geoJson = layer.toGeoJSON();
    onChange(geoJson);

    // Add the new layer to the feature group (so it can be edited/deleted)
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
  };

  const onEdited = (e: any) => {
    if (disabled) return;
    const layers = e.layers;
    
    // Get the first (and should be only) layer
    let editedGeoJson: object | null = null;
    layers.eachLayer((layer: any) => {
      editedGeoJson = layer.toGeoJSON();
    });
    
    if (editedGeoJson) {
      onChange(editedGeoJson);
    }
  };

  const onDeleted = (e: any) => {
    if (disabled) return;
    // When polygon is deleted via the map control, clear the value
    onChange(null);
  };

  const fileLabel = tifUrl.split("/").pop() || "map.tif";

  // Check if there's a polygon
  const hasPolygon = value !== null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-emerald-900">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          title={expanded ? "Shrink map" : "Expand map"}
        >
          {expanded ? "Shrink" : "Expand"}
        </button>
      </div>

      {/* Status Messages */}
      {tifError && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          ⚠️ {tifError}
        </div>
      )}
      {!tifError && loadingTif && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          ⏳ Loading overlay <b>{fileLabel}</b>...
        </div>
      )}
      {!loadingTif && !tifError && (
        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          ✓ Overlay <b>{fileLabel}</b> loaded
        </div>
      )}

      {/* Polygon Status */}
      {hasPolygon && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
          <span>✓ Polygon drawn - Ready for analysis</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={disabled}
            className="ml-2 px-2 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="mb-2 flex items-center gap-3 flex-wrap">
        <label className="text-xs text-emerald-900/80">
          Overlay opacity
          <input
            type="range" min={0} max={1} step={0.05} value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="ml-2 align-middle"
          />
          <span className="ml-2 text-emerald-700">{Math.round(opacity * 100)}%</span>
        </label>
        
        {/* Export Button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={!hasPolygon || disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Export polygon as GeoJSON"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export GeoJSON
        </button>
        
        {/* Delete Button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={!hasPolygon || disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Delete polygon"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Polygon
        </button>
      </div>

      {/* MAP CONTAINER */}
      <div
        className="w-full overflow-hidden rounded-lg border border-emerald-200 shadow-sm relative"
        style={{ height: heightPx }}
      >
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl
          scrollWheelZoom
        >
          <InvalidateOnResize nonce={sizeNonce} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoTiffOverlay
            url={tifUrl}
            opacity={opacity}
            onLoaded={() => {
              setLoadingTif(false);
              setTifError(null);
            }}
            onError={(msg) => {
              setTifError(msg || "Failed to load GeoTIFF");
              setLoadingTif(false);
            }}
          />

          {/* Drawing Controls */}
          <FeatureGroup ref={featureGroupRef}>
            {!disabled && (
              <EditControl
                position="topright"
                onCreated={onCreated}
                onEdited={onEdited}
                onDeleted={onDeleted}
                draw={{
                  polygon: {
                    allowIntersection: false,
                    shapeOptions: {
                      color: '#10b981',
                      fillColor: '#10b981',
                      fillOpacity: 0.3,
                      weight: 3,
                    },
                  },
                  marker: false,
                  circle: false,
                  circlemarker: false,
                  rectangle: false,
                  polyline: false,
                }}
                edit={{
                  edit: hasPolygon,
                  remove: hasPolygon,
                }}
              />
            )}
          </FeatureGroup>

          {/* Layer clearer component */}
          <LayerClearer 
            shouldClear={shouldClearLayers} 
            onCleared={handleLayersCleared}
            featureGroupRef={featureGroupRef}
          />
        </MapContainer>

        {/* Floating Delete Button on Map (when polygon exists) */}
        {hasPolygon && !disabled && (
          <button
            type="button"
            onClick={handleDelete}
            className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg shadow-lg hover:bg-rose-700 transition font-medium"
            title="Delete polygon"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Polygon
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-emerald-700">
        <p>
          <strong>Draw:</strong> Click the polygon tool (◇) in the top-right corner to draw.
          {hasPolygon && (
            <span className="ml-2 text-rose-600">
              <strong>Delete:</strong> Click the "Delete Polygon" button or use the trash icon (🗑️) in the map toolbar.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}