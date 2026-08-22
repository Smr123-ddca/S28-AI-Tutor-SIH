import React from 'react';
import TinyShapes from './TinyShapes';

export default function Home({ role, setView }) {
    const isStudent = role === 'student';

    const getFeatures = () => {
        if (isStudent) {
            return [
                {
                    title: "Ask anything",
                    description: "Chat with an AI tutor that explains concepts from real course material.",
                    icon: "💬"
                },
                {
                    title: "Every answer is sourced",
                    description: "Explanations are tagged with the exact material they come from, so you can verify what you're being told.",
                    icon: "🔍"
                },
                {
                    title: "Fills in the gaps",
                    description: "If you're missing a prerequisite concept, the tutor notices and teaches that first.",
                    icon: "🧩"
                },
                {
                    title: "No shortcuts on graded work",
                    description: "The tutor won't just hand you homework answers, it teaches the concept instead.",
                    icon: "🎓"
                },
                {
                    title: "Talk to your AI avatar",
                    description: "Engage with a personalized AI companion.",
                    icon: "🤖",
                    comingSoon: true
                },
                {
                    title: "Your chat history, saved",
                    description: "Review past sessions to reinforce learning.",
                    icon: "🕰️",
                    comingSoon: true
                }
            ];
        } else {
            return [
                {
                    title: "See where your class struggles",
                    description: "A misconceptions dashboard showing which concepts trip students up class-wide.",
                    icon: "📊"
                },
                {
                    title: "Upload your material",
                    description: "Add your own course documents so the tutor answers strictly from what you've taught.",
                    icon: "📄"
                },
                {
                    title: "Review before it teaches",
                    description: "Uploaded material and prerequisite structure can be reviewed and corrected by you before it's used.",
                    icon: "✅"
                },
                {
                    title: "Root-cause insight",
                    description: "Not just what students got wrong, but the underlying gap causing it.",
                    icon: "🧠"
                },
                {
                    title: "See the prerequisite map",
                    description: "Visualize concept dependencies for your curriculum.",
                    icon: "🗺️",
                    comingSoon: true
                },
                {
                    title: "Invite co-teachers",
                    description: "Collaborate seamlessly across the entire faculty.",
                    icon: "👥",
                    comingSoon: true
                }
            ];
        }
    };

    return (
        <div className="home-container">
            {/* Background Blobs */}
            <div className="blob blob-purple"></div>
            <div className="blob blob-yellow"></div>
            <div className="blob blob-orange"></div>
            <div className="blob blob-green"></div>

            {/* Floating Messy Shapes */}
            <TinyShapes />

            {/* Hero Section */}
            <header className="hero-section" style={{ display: 'flex', alignItems: 'center', gap: '3rem', textAlign: 'left', maxWidth: '1000px' }}>
                <div style={{ flex: 1 }}>
                    <h1 className="hero-title" style={{ textAlign: 'left', fontSize: '3.5rem' }}>
                        {isStudent ? "Master concepts, " : "Empower your "}
                        <span className="text-accent">{isStudent ? "not just facts." : "students."}</span>
                    </h1>
                    <p className="hero-subtitle" style={{ textAlign: 'left' }}>
                        {isStudent
                            ? "Your adaptive AI tutor grounded strictly in your coursework."
                            : "Monitor misconceptions, customize material, and guide learning effectively."}
                    </p>
                    <button
                        className="primary-btn hero-cta"
                        onClick={() => setView('app')}
                    >
                        {isStudent ? "Start learning" : "Go to dashboard"}
                    </button>
                </div>

                {/* Robot Illustration Area */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                </div>
            </header>

            {/* Feature Showcase */}
            <section className="features-section">
                <div className="features-grid">
                    {getFeatures().map((feature, idx) => (
                        <div key={idx} className={`feature-card ${feature.comingSoon ? 'coming-soon-card' : ''}`}>
                            {feature.comingSoon && <span className="coming-soon-badge">Coming soon</span>}
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Closing CTA */}
            <section className="closing-cta-section">
                <div className="closing-content">
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                        Ready to {isStudent ? 'dive in' : 'manage your class'}?
                    </h2>
                    <button
                        className="primary-btn"
                        onClick={() => setView('app')}
                        style={{ padding: '1rem 2.5rem', fontSize: '1.2rem' }}
                    >
                        {isStudent ? "Start learning" : "Go to dashboard"}
                    </button>
                </div>
            </section>
        </div>
    );
}
