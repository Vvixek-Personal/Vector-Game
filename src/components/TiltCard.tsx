import React, { type ReactNode } from "react";
import { useTilt } from "../hooks/useTilt";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxTilt?: number;
  scale?: number;
  className?: string;
  disabled?: boolean;
  withGlare?: boolean;
}

export default function TiltCard({
  children,
  maxTilt = 8,
  scale = 1.02,
  className = "",
  disabled = false,
  withGlare = true,
  ...rest
}: TiltCardProps) {
  const { ref, tiltProps, glareStyle } = useTilt({ maxTilt, scale, disabled });

  return (
    <div
      ref={ref}
      {...rest}
      {...tiltProps}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...tiltProps.style,
        ...(rest.style || {}),
      }}
    >
      {children}
      {withGlare && !disabled && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 pointer-events-none rounded-[inherit]"
          style={glareStyle}
        />
      )}
    </div>
  );
}
