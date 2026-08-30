import React from 'react';

export function PromoIllustration() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <style>
        {`
          @keyframes subtle-jitter {
            0% { transform: translate(0, 0) rotate(0deg); }
            2% { transform: translate(0.5px, -0.5px) rotate(0.2deg); }
            4% { transform: translate(-0.5px, 0.5px) rotate(-0.1deg); }
            6% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .promo-illustration-asset {
            max-width: 110%;
            max-height: 110%;
            object-fit: contain;
            mix-blend-mode: multiply; /* Removes white background perfectly against light themes */
            animation: float 6s ease-in-out infinite, subtle-jitter 4s infinite linear;
          }
        `}
      </style>

      <img
        src="/public/pencil-rider.png"
        alt="Learnify Pencil Ride"
        className="promo-illustration-asset"
      />
    </div>
  );
}
