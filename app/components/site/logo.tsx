// app/components/site/logo.tsx
import React from "react";

export default function Logo({ withText = false }: { withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-semibold shadow-md">
        AG
      </div>
      {withText && (
        <div>
          <p className="text-lg font-semibold text-emerald-900">Agritourism Directory</p>
          <p className="text-xs text-emerald-800/70">Find farms, orchards, vineyards & stays</p>
        </div>
      )}
    </div>
  );
}
