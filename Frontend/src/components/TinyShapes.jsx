import React from 'react';
import './TinyShapes.css';

const shapes = [
    { type: 'triangle', color: 'var(--amber)', top: '10%', left: '8%', animation: 'float 7s ease-in-out infinite' },
    { type: 'circle', color: 'var(--blue)', top: '15%', right: '12%', animation: 'float 8.5s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--green)', top: '55%', left: '5%', animation: 'float 7.2s ease-in-out infinite 1s' },
    { type: 'triangle', color: 'var(--blue-light)', top: '70%', right: '8%', animation: 'float 5.4s ease-in-out infinite' },
    { type: 'circle', color: 'var(--amber-light)', top: '40%', left: '15%', animation: 'float 9.1s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--amber)', top: '30%', right: '20%', animation: 'float 6.8s ease-in-out infinite' },
    { type: 'triangle', color: 'var(--green)', top: '80%', left: '25%', animation: 'float 7.7s ease-in-out infinite reverse' },
    { type: 'circle', color: 'var(--red)', top: '22%', left: '40%', animation: 'float 6.4s ease-in-out infinite' },
    { type: 'square', color: 'var(--blue-light)', top: '85%', right: '25%', animation: 'float 8.2s ease-in-out infinite reverse' },
    { type: 'triangle', color: 'var(--amber)', top: '50%', right: '35%', animation: 'float 7.1s ease-in-out infinite 2s' },
    { type: 'circle', color: 'var(--green)', top: '5%', left: '35%', animation: 'float 9.5s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--amber-light)', top: '12%', right: '45%', animation: 'float 6.3s ease-in-out infinite' },
    { type: 'triangle', color: 'var(--blue)', top: '90%', left: '45%', animation: 'float 5.8s ease-in-out infinite' },
    { type: 'circle', color: 'var(--red)', top: '65%', left: '30%', animation: 'float 7.9s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--gray)', top: '75%', right: '40%', animation: 'float 8.6s ease-in-out infinite 1.5s' },
    { type: 'triangle', color: 'var(--green)', top: '25%', right: '5%', animation: 'float 6.9s ease-in-out infinite' },
    { type: 'circle', color: 'var(--amber-light)', top: '65%', right: '15%', animation: 'float 9.2s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--blue)', top: '45%', left: '50%', animation: 'float 7.4s ease-in-out infinite 0.5s' },
    { type: 'triangle', color: 'var(--red)', top: '35%', left: '60%', animation: 'float 8.1s ease-in-out infinite' },
    { type: 'circle', color: 'var(--amber)', top: '82%', left: '55%', animation: 'float 6.6s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--green)', top: '15%', left: '75%', animation: 'float 7.8s ease-in-out infinite 2s' },
    { type: 'triangle', color: 'var(--blue-light)', top: '55%', right: '55%', animation: 'float 5.9s ease-in-out infinite' },
    { type: 'circle', color: 'var(--amber-light)', top: '40%', right: '8%', animation: 'float 9.7s ease-in-out infinite reverse' },
    { type: 'square', color: 'var(--gray)', top: '95%', right: '65%', animation: 'float 6.2s ease-in-out infinite' },
    { type: 'triangle', color: 'var(--red)', top: '5%', right: '30%', animation: 'float 7.3s ease-in-out infinite reverse' },
];

const Triangle = ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 40 40" className="tiny-svg">
        {/* Messy spilled paint */}
        <polygon points="20,2 38,34 2,34" fill={color} transform="translate(4, -3) rotate(5 20 20)" opacity="0.8" />
        {/* Crisp outline with white inside */}
        <polygon points="20,5 35,35 5,35" fill="white" stroke="#151313" strokeWidth="3" strokeLinejoin="round" />
    </svg>
);

const Circle = ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 40 40" className="tiny-svg">
        {/* Messy spilled paint */}
        <circle cx="20" cy="20" r="16" fill={color} transform="translate(-3, 2)" opacity="0.8" />
        {/* Crisp outline with white inside */}
        <circle cx="20" cy="20" r="14" fill="white" stroke="#151313" strokeWidth="3" />
    </svg>
);

const Square = ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 40 40" className="tiny-svg">
        {/* Messy spilled paint */}
        <rect x="5" y="5" width="28" height="28" fill={color} transform="translate(3, 4) rotate(-4 20 20)" opacity="0.8" rx="2" />
        {/* Crisp outline with white inside */}
        <rect x="6" y="6" width="26" height="26" fill="white" stroke="#151313" strokeWidth="3" rx="3" />
    </svg>
);

export default function TinyShapes() {
    return (
        <div className="tiny-shapes-container">
            {shapes.map((shape, i) => {
                let ShapeComp = Triangle;
                if (shape.type === 'circle') ShapeComp = Circle;
                if (shape.type === 'square') ShapeComp = Square;

                return (
                    <div
                        key={i}
                        className="tiny-shape-wrapper"
                        style={{ top: shape.top, left: shape.left, right: shape.right, animation: shape.animation }}
                    >
                        <ShapeComp color={shape.color} />
                    </div>
                );
            })}
        </div>
    );
}
