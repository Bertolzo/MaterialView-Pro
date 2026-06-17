import React from 'react';
import { ChevronRight, Play } from 'lucide-react';
import './Hero.css';

const Hero: React.FC = () => {
  return (
    <section className="hero-section">
      <div className="hero-background">
        <div className="grid-lines"></div>
        <div className="gradient-glow"></div>
      </div>
      
      <div className="container hero-content">
        <div className="hero-text animate-fade-in">
          <h1 className="hero-title">
            Your floor project should not only look beautiful.<br/>
            <span className="text-gradient">It should sell before execution.</span>
          </h1>
          <p className="hero-subtitle delay-100 animate-fade-in">
            AI-powered spatial intelligence that transforms architectural decisions into perceived value, commercial clarity and premium positioning.
          </p>
          
          <div className="hero-actions delay-200 animate-fade-in">
            <button className="btn-primary">
              Analyze Project <ChevronRight size={18} />
            </button>
            <button className="btn-secondary">
              <Play size={18} /> Watch Demo
            </button>
          </div>
        </div>

        <div className="hero-visual delay-300 animate-fade-in">
          <div className="ui-cards-container">
            <div className="floating-card glass-panel card-1 animate-float">
              <div className="card-header">
                <span className="dot dot-green"></span>
                <span className="card-title">Aesthetic Score</span>
              </div>
              <div className="card-value">94<span className="card-unit">/100</span></div>
              <div className="card-label">Premium Perception</div>
            </div>
            
            <div className="floating-card glass-panel card-2 animate-float delay-200">
              <div className="card-header">
                <span className="dot dot-blue"></span>
                <span className="card-title">Commercial Insight</span>
              </div>
              <div className="card-text">High continuity flow detected. Enhances perceived room scale by 18%.</div>
            </div>

            <div className="floating-card glass-panel card-3 animate-float delay-400">
              <div className="card-header">
                <span className="dot dot-gold"></span>
                <span className="card-title">Risk Analysis</span>
              </div>
              <div className="card-metrics">
                <div className="metric"><span>Execution</span><span className="metric-val low">Low</span></div>
                <div className="metric"><span>Visual Friction</span><span className="metric-val low">Low</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
