import React from 'react';

interface RadarChartProps {
  data: {
    label: string;
    value: number; // 0-100
  }[];
  size?: number;
  color?: string;
  fillColor?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 280,
  color = '#38bdf8',
  fillColor = 'rgba(56, 189, 248, 0.25)',
}) => {
  const center = size / 2;
  const radius = (size / 2) * 0.72;
  const total = data.length;

  // Compute polygon points for background grid rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (value: number, index: number, maxRadius: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Polygon points for the actual data
  const dataPoints = data.map((d, i) => {
    const { x, y } = getCoordinates(d.value, i, radius);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background web rings */}
        {rings.map((ringFactor, ringIdx) => {
          const ringPoints = data.map((_, i) => {
            const { x, y } = getCoordinates(100, i, radius * ringFactor);
            return `${x},${y}`;
          }).join(' ');

          return (
            <polygon
              key={ringIdx}
              points={ringPoints}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray={ringFactor < 1 ? '3 3' : undefined}
              className="opacity-60"
            />
          );
        })}

        {/* Axis Spokes from center to edge */}
        {data.map((_, i) => {
          const { x, y } = getCoordinates(100, i, radius);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              className="opacity-50"
            />
          );
        })}

        {/* Data polygon with glow */}
        <polygon
          points={dataPoints}
          fill={fillColor}
          stroke={color}
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
        />

        {/* Data points dots */}
        {data.map((d, i) => {
          const { x, y } = getCoordinates(d.value, i, radius);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill={color}
                stroke="#0f172a"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={color}
                className="opacity-20 animate-ping"
              />
            </g>
          );
        })}

        {/* Labels positioned around perimeter */}
        {data.map((d, i) => {
          const labelDist = radius + 22;
          const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);

          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[10px] font-mono font-bold fill-slate-300 select-none"
            >
              {d.label} ({d.value})
            </text>
          );
        })}
      </svg>
    </div>
  );
};
