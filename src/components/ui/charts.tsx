"use client";

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

interface ChartProps {
  data: any[];
  xKey?: string;
  yKey?: string;
  valueFormatter?: (v: number) => string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function LineChart({ data, xKey = 'date', yKey = 'amount', valueFormatter }: ChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)} />
          <Tooltip
            formatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            wrapperStyle={{ outline: 'none' }}
          />
          <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MultiLineProps {
  data: any[];
  xKey?: string;
  lines: Array<{ dataKey: string; name?: string; color?: string }>;
  valueFormatter?: (v: number) => string;
}

export function MultiLineChart({ data, xKey = 'date', lines, valueFormatter }: MultiLineProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)} />
          <Tooltip
            formatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            wrapperStyle={{ outline: 'none' }}
          />
          <Legend />
          {lines.map((l, idx) => (
            <Line key={l.dataKey} type="monotone" dataKey={l.dataKey} name={l.name} stroke={l.color || ['#8884d8','#10b981','#ef4444','#f59e0b'][idx % 4]} dot={false} />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChart({ data, xKey = 'category', yKey = 'count', valueFormatter }: ChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis tickFormatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)} />
          <Tooltip
            formatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            wrapperStyle={{ outline: 'none' }}
            cursor={{ fill: 'transparent' }}
          />
          <Bar dataKey={yKey}>
            {data.map((entry: any, index: number) => {
              const val = Number(entry?.[yKey] ?? 0);
              const fill = val >= 0 ? '#22C55E' : '#EF4444'; // green for positive/zero, red for negative
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PieChart({ data, xKey = 'name', yKey = 'count', valueFormatter }: ChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey={yKey}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v)=> valueFormatter ? valueFormatter(Number(v)) : String(v)}
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: 8 }}
            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
            labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            wrapperStyle={{ outline: 'none' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}