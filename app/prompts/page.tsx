"use client";

import React, { useMemo, useState } from "react";
import { Clipboard, ClipboardCheck, Search } from "lucide-react";

const Container = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

type PromptItem = {
  id: string;
  title: string;
  body: string;
  note?: string;
};

type PromptGroup = {
  id: string;
  title: string;
  category: "System" | "Workflow" | "Maps" | "Vegetation / Shoreline";
  description?: string;
  badge?: string;
  items: PromptItem[];
};

const PROMPT_GROUPS: PromptGroup[] = [
  {
    id: "system-full",
    title: "System Instruction · Full Workflow (Tasks 1–5)",
    category: "System",
    badge: "Core System Prompt",
    description:
      "Primary system instruction for Gemini / Google AI Studio covering Tasks 1–5 (land-use change, FRAGSTATS, maps, audience tailoring, vegetation).",
    items: [
      {
        id: "system-full-body",
        title: "Full Tasks 1–5 System Instruction",
        body: `You are an expert in land-use change interpretation from Year 1 (e.g., 2010) to Year 2 (e.g., 2024). You must analyze land-use transitions using only the provided data, including the transition matrix and Fragstats metrics. You will be also provided with maps to help you interpret the changes spatially.

Your task is to:

Task 1. Summarize Land-Use Change Using the Four CSV Files

Summarize land-use change patterns for the reclassified classes:
1 = Water, 2 = Developed, 3 = Forest, 4 = Shrub, 5 = Herbaceous, 6 = Nonvascular, 7 = Sparse Vegetation.

Use the following inputs:

NLCD_Transition_Tables.csv
– Shows how land transitions from Year 1 to Year 2 (counts and percentages).

NLCD_Normalized_Ranked.csv
– Ranks transition flows between land-use classes.

NLCD_ChiSquare_Results.csv
– Includes chi-square values, observed vs. expected transitions, and statistical significance.

NLCD_Intensity_Analysis.csv
– Provides gain intensity, loss intensity, and transition intensity.

Produce a concise summary of overall patterns and major transitions.

Task 2. Interpret FRAGSTATS Metrics and Integrate with Task 1 Findings

Use the FRAGSTATS outputs to describe spatial structure and configuration changes:

FRAGSTATS_ClassLevel.csv
– Class-level indicators showing how each land class changed spatially.

FRAGSTATS_LandscapeLevel.csv
– Landscape-level indicators reflecting overall spatial configuration.

Integrate these findings with Task 1 to produce a comprehensive summary of land-use change.

Task 3. Interpret Spatial Patterns Using the Maps with Task 1, 2 Findings

Interpret the spatial distribution of land-use transitions using the provided maps.

Describe where major transitions occur.

Reference visible features (roads, landmarks, intersections, neighborhood patterns) to pinpoint locations.

Identify areas that require attention and explain why, using only the patterns and evidence visible on the maps.

Only maps for land classes that received transitions will be provided. Each map includes a title and legend.

Task 4. Tailor Explanations for Different Audiences with Task 1, 2, 3 Findings

Be prepared to explain findings for:

- Technical experts
- Planning practitioners
- General public
- Site managers

Each explanation should match the audience’s level of technical familiarity.

Task 5. Interpret the Vegetation Structure Assessment results and interpret the transition with Task 1, 2, 3, 4 findings.

General Rules

- No hallucination. Do not infer patterns or transitions that are not supported by the data.
- Evidence-based only. All interpretations must be grounded in the provided statistics, maps, and metrics.
- Focus strictly on reclassified land-use results.
- Objective and data-driven. Do not speculate or introduce external information.

GEMINI Responses

Prompt attempt 2 [11-20-2025]: https://aistudio.google.com/prompts/1Y_az_fexZrjMz9GfIQoJEjWm8UZptSSh`,
      },
    ],
  },

  {
    id: "system-task1",
    title: "System Instruction · Task 1 Only",
    category: "System",
    badge: "Task 1 Focus",
    description:
      "Slimmed-down system prompt where the model is currently working only on Task 1 (land-use change summary).",
    items: [
      {
        id: "system-task1-body",
        title: "Task 1 System Instruction (CSV-only)",
        body: `You are an expert in land-use change interpretation from Year 1 (e.g., 2010) to Year 2 (e.g., 2024). You must analyze land-use transitions using only the provided data, including the transition matrix and Fragstats metrics. You will be also provided with maps to help you interpret the changes spatially.

You will have multiple tasks for this work. You currently work on Task1.

Task 1. Summarize Land-Use Change Using the Four CSV Files

Summarize land-use change patterns for the reclassified classes:
1 = Water, 2 = Developed, 3 = Forest, 4 = Shrub, 5 = Herbaceous, 6 = Nonvascular, 7 = Sparse Vegetation.

Use the following inputs:

NLCD_Transition_Tables.csv
– Shows how land transitions from Year 1 to Year 2 (counts and percentages).

NLCD_Normalized_Ranked.csv
– Ranks transition flows between land-use classes.

NLCD_ChiSquare_Results.csv
– Includes chi-square values, observed vs. expected transitions, and statistical significance.

NLCD_Intensity_Analysis.csv
– Provides gain intensity, loss intensity, and transition intensity.

Produce a concise summary of overall patterns and major transitions.

General Rules

- No hallucination. Do not infer patterns or transitions that are not supported by the data.
- Evidence-based only. All interpretations must be grounded in the provided statistics, maps, and metrics.
- Focus strictly on reclassified land-use results.
- Objective and data-driven. Do not speculate or introduce external information.

Produce a concise land use change summary of overall patterns and major transitions between different land use types. In the summary, address who are the Active Gainer, Active Loser, as well as who gain most (the primary “sink” for the land user transitions), who lost most.

[please also explain the statistics significance from table xxxxx]`,
      },
    ],
  },

  // -------------------- PROMPT ATTEMPT 1 --------------------
  {
    id: "attempt-1",
    title: "Prompt Attempt 1 · Stepwise NLCD & FRAGSTATS Workflow",
    category: "Workflow",
    badge: "Attempt 1",
    description:
      "Decomposes the workflow into sequential prompts focused on NLCD tables, ranked flows, chi-square, intensities, FRAGSTATS, and map-based spatial patterns.",
    items: [
      {
        id: "a1-p1",
        title: "Prompt 1 – Land Cover Change Table",
        body: `Prompt 1: interpret this Land Cover Change Table and summary the change pattern.

Input – Only NLCD transition table

Output – Summary of Land-Use Change Patterns

This includes the:
(1) Overall Stability vs. Change
(2) Transitions: major and minor
(3) Summary of the changes`,
      },
      {
        id: "a1-p2",
        title: "Prompt 2 – Normalized Ranked Results",
        body: `Prompt 2: attached is the rank in terms of transition. Combine this result with earlier findings discovered from [filename]. Interpret the results and summarize the pattern.

Input – NLCD_Normalized_Ranked.csv

Output – Combined Summary of Land-Use Change Patterns

What’s expected in the answer:

- The Ranked Change Intensities data solidifies the conclusion that the landscape is experiencing selective urbanization. The process follows a clear path of least resistance:
  - Primary Target: Herbaceous land (High Intensity, 28.85%).
  - Secondary Target: Forest land (Moderate Intensity, 21.6%).
  - Insignificant Drivers: Natural shifts between vegetation types or water bodies are "Low" or "Very Low" intensity, confirming that human development is the sole driver of significant landscape change during this period.`,
      },
      {
        id: "a1-p3",
        title: "Prompt 3 – Chi-Square Significance",
        body: `Prompt 3: “This file is showing chi-squared to indicate whether the change is significant. Combining these findings with previous results, interpret the results and summarize the pattern.”

Input – NLCD_ChiSquare_Results.csv

Output – Combined Summary of Land-Use Change Patterns`,
      },
      {
        id: "a1-p4",
        title: "Prompt 4 – Intensity Analysis (Gain / Loss / Transition)",
        body: `Prompt 4: “Attached file has two tables: one is the gain and loss, one is showing the transition intensity. Also combine with earlier findings to interpret the results and summarize the pattern.”

Input – NLCD_Intensity_Analysis.csv

Output – Combined Summary of Land-Use Change Patterns`,
      },
      {
        id: "a1-p5",
        title: "Prompt 5 – FRAGSTATS Class-Level",
        body: `Prompt 5: “This file is the FRAGSTATS results. Combine with earlier findings, interpret the results and summarize the pattern.”

Input – FRAGSTATS_ClassLevel.csv

Output – Combined Summary of Land-Use Change Patterns (Final Synthesis)`,
      },
      {
        id: "a1-p6",
        title: "Prompt 6 – Map: Changes into Developed",
        body: `Prompt 6:
“This map shows land-use changes into Developed land, and the legend is included.
Please interpret the spatial patterns based on the map.
Describe where the major transitions occur and reference landmarks, streets, or identifiable features visible on the map to help pinpoint the locations.”

Input – A map with pixels that indicate the land use changes into development, with legend and title.

Output – Interpretation of Spatial Patterns with landmarks.`,
      },
      {
        id: "a1-p7",
        title: "Prompt 7 – Map: Changes into Forest",
        body: `Prompt 7:
“This map shows land-use changes into forest, and the legend is included.
Please interpret the spatial patterns based on the map.
Describe where the major transitions occur and reference landmarks, streets, or identifiable features visible on the map to help pinpoint the locations.”

Input – A map with pixels that indicate the land use changes into forest, with legend and title.

Output – Interpretation of Spatial Patterns with landmarks.`,
      },
      {
        id: "a1-p8",
        title: "Prompt 8 – Map: Changes into Herbaceous",
        body: `Prompt 8:
“This map shows land-use changes into herbaceous, and the legend is included.
Please interpret the spatial patterns based on the map.
Describe where the major transitions occur and reference landmarks, streets, or identifiable features visible on the map to help pinpoint the locations.”

Input – A map with pixels that indicate the land use changes into herbaceous, with legend and title.

Output – Interpretation of Spatial Patterns with landmarks.

Note: Even if the text in the prompt is accidentally typed wrong, the results should still be based on the input image.`,
      },
    ],
  },

  // -------------------- PROMPT ATTEMPT 3 --------------------
  {
    id: "attempt-3",
    title: "Prompt Attempt 3 · Updated Multi-Task Workflow",
    category: "Workflow",
    badge: "Attempt 3 · 11-24-2025",
    description:
      "Refined version that makes gain and loss intensity files explicit, and structures Tasks 1–5 as separate prompts.",
    items: [
      {
        id: "a3-p1",
        title: "Prompt 1 – Task 1 with Explicit Intensity Files",
        body: `Prompt 1
You are an expert in land-use change interpretation from Year 1 (e.g., 2010) to Year 2 (e.g., 2024). You must analyze land-use transitions using only the provided data, including the transition matrix and Fragstats metrics. You will be also provided with maps to help you interpret the changes spatially.

You will have multiple tasks for this work. You currently work on Task 1.

Task 1. Summarize Land-Use Change Using the CSV Files

Summarize land-use change patterns for the reclassified classes:

1 = Water, 2 = Developed, 3 = Forest, 4 = Shrub, 5 = Herbaceous, 6 = Nonvascular, 7 = Sparse Vegetation.

Use the following inputs:

NLCD_Transition_Tables.csv
– Shows how land transitions from Year 1 to Year 2 (counts and percentages).

NLCD_Normalized_Ranked.csv
– Ranks transition flows between land-use classes.

NLCD_ChiSquare_Results.csv
– Includes chi-square values, observed vs. expected transitions, and statistical significance.

NLCD_Intensity_Analysis.csv
– transition intensity.

NLCD_Intensity_Analysis_Gain_Reclass.csv and NLCD_Intensity_Analysis_Loss_Reclass.csv
– provide gain intensity and loss intensity, respectively.

Produce a concise summary of overall patterns and major transitions.

General Rules

- No hallucination. Do not infer patterns or transitions that are not supported by the data.
- Evidence-based only. All interpretations must be grounded in the provided statistics, maps, and metrics.
- Focus strictly on reclassified land-use results.
- Objective and data-driven. Do not speculate or introduce external information.

Produce a concise land use change summary of overall patterns and major transitions between different land use types.`,
      },
      {
        id: "a3-p2",
        title: "Prompt 2 – Task 2 FRAGSTATS Integration",
        body: `Prompt 2:
Now, the next step will be focus on Fragstats results.

Task 2. Interpret FRAGSTATS Metrics and Integrate with Task 1 Findings

Use the FRAGSTATS outputs to describe spatial structure and configuration changes:

FRAGSTATS_ClassLevel.csv
– Class-level indicators showing how each land class changed spatially.

FRAGSTATS_LandscapeLevel.csv
– Landscape-level indicators reflecting overall spatial configuration.

Integrate these findings with Task 1 to produce a comprehensive summary of land-use change.`,
      },
      {
        id: "a3-p3",
        title: "Prompt 3 – Task 3 Spatial Patterns Using Maps",
        body: `Prompt 3:
Now we moved on to Task 3.

Task 3. Interpret Spatial Patterns Using the Maps with Task 1, 2 Findings

Interpret the spatial distribution of land-use transitions using the provided maps.

Describe where major transitions occur.

Reference visible features (roads, landmarks, intersections, neighborhood patterns) to pinpoint locations.

Identify areas that require attention and explain why, using only the patterns and evidence visible on the maps.

Only maps for land classes that received transitions will be provided. Each map includes a title and legend.`,
      },
      {
        id: "a3-p4",
        title: "Prompt 4 – Task 4 Audience-Specific Explanations",
        body: `Prompt 4:
Now, move on to Task 4.

Task 4. Tailor Explanations for Different Audiences with Task 1, 2, 3 Findings

Be prepared to explain findings for:

- Technical experts
- Planning practitioners
- General public
- Site managers

Each explanation should match the audience’s level of technical familiarity.`,
      },
      {
        id: "a3-p5",
        title: "Prompt 5 – Vegetation Structure & Ecological Identity",
        body: `Prompt 5:
The attached summarizes vegetation-structure transitions across different categories, as well as the value or grading assigned to each transition. Using the definitions provided in the table, the grading information from the CSV file, and the earlier findings, interpret the transition results shown in the CSV file.

You must determine the ecological identity and health of the landscape by cross-referencing Quantitative Metrics (from a provided CSV summary) against a Standardized Scoring Rubric (the table). Use these definitions to evaluate the land.`,
      },
    ],
  },

  // -------------------- PROMPT ATTEMPT 2 (SECOND VERSION) --------------------
  {
    id: "attempt-2",
    title: "Prompt Attempt 2 · Alternate Multi-Task Workflow",
    category: "Vegetation / Shoreline",
    badge: "Attempt 2 · 11-20-2025",
    description:
      "Earlier alternate attempt with Tasks 1–4 plus a shoreline-specific recommendation prompt.",
    items: [
      {
        id: "a2-p1",
        title: "Prompt 1 – Multi-Task Setup (Tasks 1–4)",
        body: `Prompt 1
You are an expert in land-use change interpretation from Year 1 (e.g., 2010) to Year 2 (e.g., 2024). You must analyze land-use transitions using only the provided data, including the transition matrix and Fragstats metrics. You will be also provided with maps to help you interpret the changes spatially.

You will have multiple tasks for this work. You currently work on Task1.

Task 1. Summarize Land-Use Change Using the Four CSV Files

Summarize land-use change patterns for the reclassified classes:
1 = Water, 2 = Developed, 3 = Forest, 4 = Shrub, 5 = Herbaceous, 6 = Nonvascular, 7 = Sparse Vegetation.

Use the following inputs:

NLCD_Transition_Tables.csv
– Shows how land transitions from Year 1 to Year 2 (counts and percentages).

NLCD_Normalized_Ranked.csv
– Ranks transition flows between land-use classes.

NLCD_ChiSquare_Results.csv
– Includes chi-square values, observed vs. expected transitions, and statistical significance.

NLCD_Intensity_Analysis.csv
– Provides gain intensity, loss intensity, and transition intensity.

Produce a concise summary of overall patterns and major transitions.

General Rules

- No hallucination. Do not infer patterns or transitions that are not supported by the data.
- Evidence-based only. All interpretations must be grounded in the provided statistics, maps, and metrics.
- Focus strictly on reclassified land-use results.
- Objective and data-driven. Do not speculate or introduce external information.

Produce a concise land use change summary of overall patterns and major transitions between different land use types.`,
      },
      {
        id: "a2-p2",
        title: "Prompt 2 – Task 2 (FRAGSTATS Integration)",
        body: `Prompt 2:
Now, the next step will be focus on Fragstats results.

Task 2. Interpret FRAGSTATS Metrics and Integrate with Task 1 Findings

Use the FRAGSTATS outputs to describe spatial structure and configuration changes:

FRAGSTATS_ClassLevel.csv
– Class-level indicators showing how each land class changed spatially.

FRAGSTATS_LandscapeLevel.csv
– Landscape-level indicators reflecting overall spatial configuration.

Integrate these findings with Task 1 to produce a comprehensive summary of land-use change.`,
      },
      {
        id: "a2-p3",
        title: "Prompt 3 – Task 3 (Spatial Maps)",
        body: `Prompt 3:
Now we moved on to Task 3.

Task 3. Interpret Spatial Patterns Using the Maps with Task 1, 2 Findings

Interpret the spatial distribution of land-use transitions using the provided maps.

Describe where major transitions occur.

Reference visible features (roads, landmarks, intersections, neighborhood patterns) to pinpoint locations.

Identify areas that require attention and explain why, using only the patterns and evidence visible on the maps.

Only maps for land classes that received transitions will be provided. Each map includes a title and legend.`,
      },
      {
        id: "a2-p4",
        title: "Prompt 4 – Task 4 (Audience-Specific Summaries)",
        body: `Prompt 4:
Now, move on to Task 4.

Task 4. Tailor Explanations for Different Audiences with Task 1, 2, 3 Findings

Be prepared to explain findings for:

- Technical experts
- Planning practitioners
- General public
- Site managers

Each explanation should match the audience’s level of technical familiarity.`,
      },
      {
        id: "a2-p5",
        title: "Prompt 5 – Shoreline Management Recommendations",
        body: `Prompt 5:
Now, we are focusing on monitoring shoreline task. Write more on shoreline management suggestions / recommendations based on all the results.`,
      },
    ],
  },
];

export default function PromptLibraryPage() {
  const [query, setQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROMPT_GROUPS;
    return PROMPT_GROUPS.filter((group) => {
      if (group.title.toLowerCase().includes(q)) return true;
      if (group.description && group.description.toLowerCase().includes(q)) return true;
      return group.items.some(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q)
      );
    });
  }, [query]);

  function handleCopy(text: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => {
          setCopiedKey(key);
          setTimeout(() => {
            setCopiedKey((prev) => (prev === key ? null : prev));
          }, 1500);
        },
        () => {
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 1500);
        }
      );
    }
  }

  function copyGroup(group: PromptGroup) {
    const combined = group.items
      .map((item) => `${item.title}\n\n${item.body}`)
      .join("\n\n\n-------------------------\n\n");
    handleCopy(combined, `group-${group.id}`);
  }

  return (
    <main className="min-h-screen bg-white relative">
      {/* Background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-amber-50" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <Container className="py-8 sm:py-12 space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-600/5 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Prompt Library · LandCover AI
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">
            Land-Use Change Prompt Library
          </h1>
          <p className="text-sm sm:text-base text-emerald-900/80 max-w-3xl">
            A curated collection of system instructions and task prompts used for
            land-use change analysis (NLCD transitions, FRAGSTATS, spatial
            interpretation, vegetation structure, and shoreline management).
            Click any prompt to expand and copy it directly into Google AI Studio
            or Gemini.
          </p>
        </header>

        {/* Search */}
        <section className="rounded-2xl border border-emerald-900/10 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-900/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search prompts by task, keyword (e.g., “Fragstats”, “shoreline”, “Task 3 maps”)…"
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-9 py-2.5 text-sm text-emerald-950 shadow-inner outline-none ring-emerald-600/20 placeholder:text-emerald-900/40 focus:border-emerald-600/40 focus:ring"
              />
            </div>
            <span className="hidden sm:inline text-xs text-emerald-900/60">
              {filteredGroups.length} groups ·{" "}
              {filteredGroups.reduce((sum, g) => sum + g.items.length, 0)} prompts
            </span>
          </div>
        </section>

        {/* Prompt groups */}
        <section className="space-y-6">
          {filteredGroups.map((group) => (
            <article
              key={group.id}
              className="rounded-2xl border border-emerald-900/10 bg-white/80 p-5 sm:p-6 shadow-sm"
            >
              <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-emerald-950">
                      {group.title}
                    </h2>
                    <span className="inline-flex items-center rounded-full border border-emerald-900/15 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                      {group.category}
                    </span>
                    {group.badge && (
                      <span className="inline-flex items-center rounded-full border border-amber-900/20 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
                        {group.badge}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs sm:text-sm text-emerald-900/70 max-w-3xl">
                      {group.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => copyGroup(group)}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-900/15 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm hover:bg-emerald-50"
                >
                  {copiedKey === `group-${group.id}` ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Copied group
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-3.5 w-3.5" />
                      Copy all
                    </>
                  )}
                </button>
              </header>

              <div className="space-y-3">
                {group.items.map((item, idx) => (
                  <details
                    key={item.id}
                    className="group border border-emerald-900/10 rounded-xl bg-emerald-50/40"
                    open={idx === 0}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-emerald-950">
                      <span className="flex-1">
                        {item.title}
                        {item.note && (
                          <span className="ml-2 text-[11px] font-normal text-emerald-900/60">
                            {item.note}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopy(item.body, item.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-900/10 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
                      >
                        {copiedKey === item.id ? (
                          <>
                            <ClipboardCheck className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Clipboard className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </summary>
                    <div className="border-t border-emerald-900/10 bg-white/80 px-3 py-3 rounded-b-xl">
                      <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-800 font-mono">
                        {item.body}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </article>
          ))}

          {filteredGroups.length === 0 && (
            <div className="rounded-2xl border border-emerald-900/10 bg-white/80 p-6 text-sm text-emerald-900/70 text-center">
              No prompts matched your search. Try a different keyword (e.g.,
              “Fragstats”, “Chi-square”, “shoreline”, “Task 5”).
            </div>
          )}
        </section>
      </Container>
    </main>
  );
}
