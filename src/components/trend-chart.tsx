"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Locale } from "@/i18n/dictionaries";

// Same validated series colour as the progress screen (dataviz palette, light surface).
const SERIES = "#0d9488";
const GRID = "#e5e5e5";
const AXIS_TEXT = "#737373";

export type TrendPoint = { date: string; value: number };

function shortDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** One small series over time. Oldest point first; the title names the measure. */
export function TrendChart({
  title,
  points,
  locale,
  kind = "line",
}: {
  title: string;
  points: TrendPoint[];
  locale: Locale;
  kind?: "line" | "bar";
}) {
  const data = points.map((p) => ({ label: shortDate(p.date, locale), value: p.value }));
  const axis = {
    tick: { fontSize: 11, fill: AXIS_TEXT },
    tickLine: false,
    axisLine: false,
  } as const;

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" minTickGap={24} {...axis} />
              <YAxis width={36} domain={["auto", "auto"]} {...axis} />
              <Tooltip cursor={{ stroke: GRID }} labelClassName="text-xs" wrapperClassName="text-xs" />
              <Line
                type="monotone"
                dataKey="value"
                name={title}
                stroke={SERIES}
                strokeWidth={2}
                dot={{ r: 4, fill: SERIES, strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" minTickGap={24} {...axis} />
              <YAxis width={36} {...axis} />
              <Tooltip cursor={{ fill: "transparent" }} labelClassName="text-xs" wrapperClassName="text-xs" />
              <Bar dataKey="value" name={title} fill={SERIES} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
