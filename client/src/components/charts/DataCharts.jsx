import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#ef4444", "#14b8a6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        background: "var(--color-bg-secondary, #1e293b)",
        border: "1px solid var(--color-border, #334155)",
        padding: "10px",
        borderRadius: "8px",
        color: "var(--color-text-primary, #f8fafc)",
        fontSize: "0.85rem",
        zIndex: 1000
      }}>
        <p className="label" style={{ fontWeight: 600, marginBottom: "4px" }}>{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color || entry.fill, margin: 0 }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function CustomPieChart({ data, dataKey = "value", nameKey = "name", height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomBarChart({ data, xAxisKey = "name", bars = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #334155)" vertical={false} />
          <XAxis dataKey={xAxisKey} stroke="var(--color-text-muted, #94a3b8)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-text-muted, #94a3b8)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-tertiary, #0f172a)", opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
          {bars.map((bar, index) => (
            <Bar key={bar.dataKey} dataKey={bar.dataKey} name={bar.name || bar.dataKey} fill={bar.color || COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CustomLineChart({ data, xAxisKey = "name", lines = [], height = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #334155)" vertical={false} />
          <XAxis dataKey={xAxisKey} stroke="var(--color-text-muted, #94a3b8)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-text-muted, #94a3b8)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || COLORS[index % COLORS.length]}
              strokeWidth={3}
              activeDot={{ r: 6 }}
              dot={{ r: 3, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, icon }) {
  return (
    <div className="section-card" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "380px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {icon && (
          <div style={{ 
            width: "40px", 
            height: "40px", 
            borderRadius: "10px", 
            background: "rgba(99, 102, 241, 0.1)", 
            color: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem"
          }}>
            {icon}
          </div>
        )}
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--color-text-primary, #f8fafc)" }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--color-text-muted, #94a3b8)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
