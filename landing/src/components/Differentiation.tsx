import React from 'react';
import { Check, X } from 'lucide-react';
import './Differentiation.css';

const Differentiation: React.FC = () => {
  return (
    <section className="differentiation-section section-padding">
      <div className="container">
        
        <div className="diff-header text-center">
          <h2 className="section-title">Beyond Visualization.</h2>
          <p className="section-description mx-auto">
            Traditional tools stop at the retina. We build Spatial Intelligence Infrastructure that engages the cognitive process of valuation.
          </p>
        </div>

        <div className="diff-table-container">
          <table className="diff-table">
            <thead>
              <tr>
                <th className="feature-col">Capability</th>
                <th className="trad-col">Traditional Visualizers</th>
                <th className="our-col">Cognitive Infrastructure</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="feature-col">Output Generation</td>
                <td className="trad-col">Static Pixels & Textures</td>
                <td className="our-col highlight">Perception Metrics & Analytics</td>
              </tr>
              <tr>
                <td className="feature-col">Commercial Utility</td>
                <td className="trad-col">Basic Display</td>
                <td className="our-col highlight">Automated Narrative & Copy</td>
              </tr>
              <tr>
                <td className="feature-col">Risk Assessment</td>
                <td className="trad-col"><X size={18} className="icon-x" /> None</td>
                <td className="our-col highlight"><Check size={18} className="icon-check" /> Spatial Friction Detection</td>
              </tr>
              <tr>
                <td className="feature-col">Value Justification</td>
                <td className="trad-col">Requires Human Sales Pitch</td>
                <td className="our-col highlight">Data-backed Luxury Indication</td>
              </tr>
              <tr>
                <td className="feature-col">Execution Alignment</td>
                <td className="trad-col"><X size={18} className="icon-x" /> None</td>
                <td className="our-col highlight"><Check size={18} className="icon-check" /> Format & Joint Continuity Scoring</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
};

export default Differentiation;
