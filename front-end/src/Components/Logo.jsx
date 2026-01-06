import React from "react";

// Polyva Logo Component - 3D Cube with gradient
export default function Logo({ size = 32, showText = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#fdba74" />
          </linearGradient>
          <linearGradient id="logoGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="logoGradient3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        
        {/* Outer hexagon frame - top right */}
        <path
          d="M50 5 L90 27 L90 50 L75 58 L75 35 L50 20 L50 5Z"
          fill="url(#logoGradient1)"
        />
        
        {/* Outer hexagon frame - bottom right */}
        <path
          d="M90 50 L90 73 L50 95 L50 72 L75 58 L90 50Z"
          fill="url(#logoGradient2)"
        />
        
        {/* Outer hexagon frame - left side */}
        <path
          d="M50 5 L50 20 L25 35 L10 27 L10 50 L25 58 L25 35 L50 20 L50 5Z"
          fill="url(#logoGradient3)"
        />
        
        {/* Inner structure - left vertical */}
        <path
          d="M10 27 L10 73 L25 82 L25 58 L10 50 L10 27Z"
          fill="url(#logoGradient2)"
        />
        
        {/* Bottom left */}
        <path
          d="M10 73 L50 95 L50 72 L25 58 L25 82 L10 73Z"
          fill="url(#logoGradient1)"
        />
        
        {/* Inner cube - top */}
        <path
          d="M35 42 L50 33 L65 42 L50 51 L35 42Z"
          fill="url(#logoGradient1)"
        />
        
        {/* Inner cube - left face */}
        <path
          d="M35 42 L35 58 L50 67 L50 51 L35 42Z"
          fill="url(#logoGradient3)"
        />
        
        {/* Inner cube - right face */}
        <path
          d="M50 51 L50 67 L65 58 L65 42 L50 51Z"
          fill="url(#logoGradient2)"
        />
      </svg>
      
      {showText && (
        <span className="font-bold text-lg bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
          Polyva
        </span>
      )}
    </div>
  );
}

// Simple icon version for smaller spaces
export function LogoIcon({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoIconGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#fdba74" />
        </linearGradient>
        <linearGradient id="logoIconGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id="logoIconGradient3" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      
      {/* Outer hexagon frame - top right */}
      <path
        d="M50 5 L90 27 L90 50 L75 58 L75 35 L50 20 L50 5Z"
        fill="url(#logoIconGradient1)"
      />
      
      {/* Outer hexagon frame - bottom right */}
      <path
        d="M90 50 L90 73 L50 95 L50 72 L75 58 L90 50Z"
        fill="url(#logoIconGradient2)"
      />
      
      {/* Outer hexagon frame - left side */}
      <path
        d="M50 5 L50 20 L25 35 L10 27 L10 50 L25 58 L25 35 L50 20 L50 5Z"
        fill="url(#logoIconGradient3)"
      />
      
      {/* Inner structure - left vertical */}
      <path
        d="M10 27 L10 73 L25 82 L25 58 L10 50 L10 27Z"
        fill="url(#logoIconGradient2)"
      />
      
      {/* Bottom left */}
      <path
        d="M10 73 L50 95 L50 72 L25 58 L25 82 L10 73Z"
        fill="url(#logoIconGradient1)"
      />
      
      {/* Inner cube - top */}
      <path
        d="M35 42 L50 33 L65 42 L50 51 L35 42Z"
        fill="url(#logoIconGradient1)"
      />
      
      {/* Inner cube - left face */}
      <path
        d="M35 42 L35 58 L50 67 L50 51 L35 42Z"
        fill="url(#logoIconGradient3)"
      />
      
      {/* Inner cube - right face */}
      <path
        d="M50 51 L50 67 L65 58 L65 42 L50 51Z"
        fill="url(#logoIconGradient2)"
      />
    </svg>
  );
}
