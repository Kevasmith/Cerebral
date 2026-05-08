import React from 'react';
import { View, Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

// Maps numeric series to (x, y) coords inside a [0..width] × [0..height] box.
// Top padding keeps the line + dots from clipping the upper edge.
function toCoords(points, width, height, padTop = 6, padBottom = 10) {
  const drawH = height - padTop - padBottom;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  return points.map((v, i) => ({
    x: i * stepX,
    y: padTop + (drawH - ((v - min) / range) * drawH),
  }));
}

// Cross-platform trend-line chart.
// Web: inline <svg> with a Gaussian-blurred drop shadow beneath the line.
// Native: stacked rotated View "halo" passes that approximate a soft shadow.
// `fill` adds a subtle gradient/wash beneath the line for atmospheric depth.
export default function TrendLine({
  points,
  color = '#0a9165',
  width,
  height = 56,
  strokeWidth = 2,
  fill = true,
  showDots = true,
  currentIdx,
  currentColor,
  gradId,
}) {
  if (!points || points.length < 2 || !width) return null;

  const coords = toCoords(points, width, height);
  const dotR = 3;
  const activeR = 5;
  const cColor = currentColor ?? color;

  if (IS_WEB) {
    const id = gradId ?? 'tl-' + color.replace(/[^a-zA-Z0-9]/g, '');
    const linePath =
      `M ${coords[0].x},${coords[0].y} ` +
      coords.slice(1).map((c) => `L ${c.x},${c.y}`).join(' ');
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;
    return (
      <View style={{ width, height }}>
        <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            {fill && (
              <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"  stopColor={color} stopOpacity="0.18" />
                <stop offset="55%" stopColor={color} stopOpacity="0.05" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            )}
            <filter id={`${id}-shadow`} x="-10%" y="-10%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>
          </defs>

          {fill && <path d={areaPath} fill={`url(#${id})`} />}

          {/* Soft drop shadow beneath the line */}
          <g transform="translate(0, 3)" opacity="0.45">
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth + 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${id}-shadow)`}
            />
          </g>

          {/* Main line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {showDots &&
            coords.map(({ x, y }, i) => {
              const active = i === currentIdx;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={active ? activeR : dotR}
                  fill={active ? cColor : '#fff'}
                  stroke={color}
                  strokeWidth={active ? 0 : 1.5}
                />
              );
            })}
        </svg>
      </View>
    );
  }

  // ─── Native ────────────────────────────────────────────────────────────────
  // Three stacked "halo" passes simulate a soft shadow without SVG/blur libs.
  // Each pass: thicker, fainter, offset further down. Order matters — passes
  // are rendered before the main line so they sit underneath visually.
  const SHADOW_PASSES = [
    { offset: 2, extra: 3,  opacity: 0.18 },
    { offset: 5, extra: 7,  opacity: 0.10 },
    { offset: 9, extra: 12, opacity: 0.04 },
  ];

  const renderSegments = (offsetY, thickness, opacity, keyPrefix) =>
    coords.slice(0, -1).map((c1, i) => {
      const c2 = coords[i + 1];
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const cx = (c1.x + c2.x) / 2;
      const cy = (c1.y + c2.y) / 2 + offsetY;
      return (
        <View
          key={`${keyPrefix}${i}`}
          style={{
            position: 'absolute',
            left: cx - length / 2,
            top: cy - thickness / 2,
            width: length,
            height: thickness,
            backgroundColor: color,
            opacity,
            borderRadius: thickness / 2,
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      );
    });

  const shadowLayers = fill
    ? SHADOW_PASSES.flatMap((p, idx) =>
        renderSegments(p.offset, strokeWidth + p.extra, p.opacity, `sh${idx}-`),
      )
    : [];

  const lineSegments = renderSegments(0, strokeWidth, 1, 's');

  const dots = showDots
    ? coords.map(({ x, y }, i) => {
        const active = i === currentIdx;
        const r = active ? activeR : dotR;
        return (
          <View
            key={`d${i}`}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: active ? cColor : '#fff',
              borderWidth: active ? 0 : 1.5,
              borderColor: color,
            }}
          />
        );
      })
    : [];

  return (
    <View style={{ width, height, position: 'relative', overflow: 'visible' }}>
      {shadowLayers}
      {lineSegments}
      {dots}
    </View>
  );
}
