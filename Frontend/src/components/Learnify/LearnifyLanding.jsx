import React from 'react';
import './Learnify.css';

export default function LearnifyLanding() {
    return (
        <div className="learnify-app">
            {/* Header */}
            <nav className="lf-nav">
                <div className="lf-logo">Learnify</div>
                <div className="lf-nav-links">
                    <a href="#" className="lf-nav-link">Subjects <ChevronDown /></a>
                    <a href="#" className="lf-nav-link">Courses <ChevronDown /></a>
                    <a href="#" className="lf-nav-link">Degrees</a>
                    <a href="#" className="lf-nav-link">For business</a>
                </div>
                <div className="lf-nav-actions">
                    <button className="lf-btn lf-btn-ghost">Sign up</button>
                    <button className="lf-btn lf-btn-orange">Login</button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="lf-hero">
                <div className="lf-hero-content">
                    <h1 className="lf-h1">
                        Find the right<br />
                        <span className="lf-orange-text">course</span> for you
                    </h1>
                    <p className="lf-hero-subtext">
                        See your personalised recommendations<br />
                        based on your interests and goals
                    </p>
                    <div className="lf-hero-actions">
                        <button className="lf-btn lf-btn-orange" style={{ padding: '1.2rem 2.5rem', fontSize: '1.2rem' }}>Find course</button>
                        <a href="#" className="lf-blog-link">View our blog <ArrowUpRight /></a>
                    </div>
                </div>

                {/* Teachers Avatars */}
                <div className="lf-teachers-box">
                    <span className="lf-teachers-label">Certified teachers only</span>
                    <div className="lf-avatars">
                        <div className="lf-avatar" style={{ backgroundColor: '#fccc42' }}></div>
                        <div className="lf-avatar" style={{ backgroundColor: '#be94f5' }}></div>
                        <div className="lf-avatar" style={{ backgroundColor: '#ff5734' }}></div>
                        <div className="lf-avatar" style={{ backgroundColor: '#f7f7f5' }}></div>
                        <div className="lf-avatar lf-avatar-count">135+</div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="lf-stats-container">
                    <div className="lf-stat-card lf-stat-white">
                        <span className="lf-badge lf-badge-purple">Education</span>
                        <div className="lf-stat-label">subjects</div>
                        <div className="lf-stat-value">+40</div>
                    </div>
                    <div className="lf-stat-card lf-stat-purple">
                        <span className="lf-badge lf-badge-yellow">Online</span>
                        <div className="lf-stat-label">courses</div>
                        <div className="lf-stat-value">+120</div>
                    </div>
                    <div className="lf-stat-card lf-stat-yellow">
                        <span className="lf-badge lf-badge-white">★★★★★ 5.0</span>
                        <div className="lf-stat-label">learner reviews</div>
                        <div className="lf-stat-value">+180k</div>
                    </div>
                </div>

                {/* Illustration placeholder */}
                <div className="lf-hero-illustration">
                    {/* We'll use CSS shapes closely resembling the flying pencil illustration */}
                    <div className="lf-flying-girl-placeholder">
                        {/* Just a symbolic icon or text if we can't draw SVG right away, but I'll add SVG later */}
                        <svg width="400" height="300" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Stars */}
                            <path d="M150 50 L160 80 L190 85 L165 105 L175 135 L150 115 L125 135 L135 105 L110 85 L140 80 Z" fill="#fccc42" />
                            <path d="M350 150 L355 165 L370 167 L357 177 L362 192 L350 182 L338 192 L343 177 L330 167 L345 165 Z" fill="#fccc42" />
                            <path d="M220 250 L223 258 L231 259 L225 265 L227 273 L220 268 L213 273 L215 265 L209 259 L217 258 Z" fill="#fccc42" />

                            {/* Cloud */}
                            <path d="M320 200 Q320 180 340 180 Q360 170 370 190 Q390 190 380 210 Q370 230 340 230 Q300 230 320 200 Z" stroke="#151313" strokeWidth="3" fill="white" />

                            {/* Pencil */}
                            <rect x="150" y="200" width="220" height="40" rx="10" transform="rotate(-15 150 200)" fill="#be94f5" stroke="#151313" strokeWidth="4" />
                            {/* Pencil tip */}
                            <path d="M145 195 L110 220 L155 235 Z" fill="white" stroke="#151313" strokeWidth="4" />
                            <path d="M130 207 L110 220 L135 228 Z" fill="#151313" />
                        </svg>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Icons
function ChevronDown() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    );
}

function ArrowUpRight() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
    );
}
