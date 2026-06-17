import React from 'react';
import './TheShift.css';

const TheShift: React.FC = () => {
  return (
    <section className="shift-section section-padding">
      <div className="shift-background">
        <div className="architectural-lines"></div>
      </div>
      
      <div className="container shift-content">
        <div className="shift-text-block">
          <p className="shift-kicker">The Paradigm Shift</p>
          <h2 className="shift-title">
            This is not rendering software.<br />
            <span className="text-gradient">This is cognitive spatial interpretation.</span>
          </h2>
          <div className="shift-divider"></div>
          <p className="shift-description">
            We bridge the gap between technical execution and human perception. By analyzing spatial metrics, lighting behavior, and material continuity, we translate geometry into commercial narrative.
          </p>
        </div>
      </div>
    </section>
  );
};

export default TheShift;
