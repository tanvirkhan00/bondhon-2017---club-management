import React, { useEffect, useRef } from 'react';
import { renderQrToCanvas } from '../utils/qrCodeGenerator';

export function getPublicMemberProfileUrl(memberCode: string): string {
  const path = `/members/${encodeURIComponent(memberCode)}`;
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return `https://bondon2017.netlify.app${path}`;
  }
  const host = window.location.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.run.app')
  ) {
    return `https://bondon2017.netlify.app${path}`;
  }
  return `${window.location.origin}${path}`;
}

interface MemberQrCodeProps {
  value: string;
  size?: number;
  marginModules?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  label?: string;
}

export const MemberQrCode: React.FC<MemberQrCodeProps> = ({
  value,
  size = 144,
  marginModules = 4,
  className = '',
  darkColor = '#0A1326',
  lightColor = '#FFFFFF',
  label = 'Member verification QR code',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    try {
      renderQrToCanvas(canvas, value, {
        cssSize: size,
        marginModules,
        darkColor,
        lightColor,
      });
    } catch {
      // Ignore oversized fallback safely
    }
  }, [value, size, marginModules, darkColor, lightColor]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      className={`block rounded-md ${className}`}
    />
  );
};
