import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface MemberQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  label?: string;
}

export const MemberQrCode: React.FC<MemberQrCodeProps> = ({
  value,
  size = 132,
  className = '',
  darkColor = '#0F1B33',
  lightColor = '#FFFFFF',
  label = 'Member verification QR code',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    setHasError(false);
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 2;
    const renderSize = Math.round(size * dpr);

    QRCode.toCanvas(
      canvas,
      value,
      {
        width: renderSize,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: darkColor,
          light: lightColor,
        },
      },
      (err) => {
        if (!active) return;
        if (err) {
          setHasError(true);
        } else {
          canvas.style.width = `${size}px`;
          canvas.style.height = `${size}px`;
        }
      }
    );

    return () => {
      active = false;
    };
  }, [value, size, darkColor, lightColor]);

  if (hasError) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-xl bg-slate-100 text-[10px] font-mono text-slate-500 p-2 text-center ${className}`}
      >
        QR Unavailable
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      className={`block rounded-lg ${className}`}
    />
  );
};
