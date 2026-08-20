import React from 'react';

export default function About() {
    return (
        <div className="about-container">
            <div className="blob blob-yellow" style={{ top: '-10%', right: '10%' }}></div>
            <div className="blob blob-purple" style={{ bottom: '20%', left: '-5%' }}></div>

            <div className="about-content">
                <h1 className="about-title">Why Learnify<span className="text-accent">Tutor</span>?</h1>

                <div className="about-glass">
                    <p className="about-text">
                        <strong>The Problem:</strong> Generic AI chatbots give unverified answers and often just hand students the solution without teaching the underlying concept.
                    </p>
                    <p className="about-text">
                        <strong>The Solution:</strong> An adaptive AI tutor built for genuine learning. LearnifyTutor ensures every explanation is grounded in real course material, avoiding hallucinations and guesswork.
                    </p>

                    <h2 className="about-section-heading">Core Principles</h2>
                    <ul className="about-list">
                        <li>
                            <span className="list-icon">✅</span>
                            <strong>Cited Answers:</strong> Explanations point directly to the provided course documents.
                        </li>
                        <li>
                            <span className="list-icon">🧩</span>
                            <strong>Prerequisite-Aware:</strong> The AI identifies missing foundational knowledge before explaining complex topics.
                        </li>
                        <li>
                            <span className="list-icon">🎓</span>
                            <strong>No Answer-Handing:</strong> On graded assignments, the tutor strictly teaches the concept rather than doing the work for you.
                        </li>
                    </ul>

                    <h2 className="about-section-heading">Who it's for</h2>
                    <p className="about-text">
                        <strong>Students</strong> get an on-demand tutor that adapts to their learning gaps. <br />
                        <strong>Teachers</strong> gain deep insights into class-wide misconceptions and full control over the AI's knowledge base.
                    </p>
                </div>
            </div>
        </div>
    );
}
