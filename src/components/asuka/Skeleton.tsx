"use client";
import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 0, style }: SkeletonProps) {
  return (
    <div
      style={{
        width, height, borderRadius,
        background: "linear-gradient(90deg, var(--paper) 0%, #f4f1eb 50%, var(--paper) 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite linear",
        ...style,
      }}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Skeleton style={{ paddingBottom: "100%", height: 0 }} />
      <Skeleton width="40%" height={10} />
      <Skeleton width="80%" height={22} />
      <Skeleton width="60%" height={12} />
      <Skeleton width="35%" height={14} />
    </div>
  );
}
