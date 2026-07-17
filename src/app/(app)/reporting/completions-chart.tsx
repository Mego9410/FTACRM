"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** 12-month completions bar chart — brand gold, calm styling per the design system. */
export function CompletionsChart({
  data,
}: {
  data: { month: string; completions: number; value: number }[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E7E4" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8C8C88" }} axisLine={{ stroke: "#E7E7E4" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#8C8C88" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "#F4F4F3" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E7E7E4",
              boxShadow: "0 10px 28px rgba(15,15,10,.08)",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />
          <Bar dataKey="completions" fill="#E4AD25" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
