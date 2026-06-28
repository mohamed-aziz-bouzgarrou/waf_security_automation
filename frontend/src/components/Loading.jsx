import React from "react";
import "../styles/Loading.css";

export const LoadingSpinner = ({ size = "medium" }) => {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className='spinner-ring'></div>
      <p>Loading...</p>
    </div>
  );
};

export const ProgressBar = ({ value, max = 100, showLabel = true }) => {
  const percentage = (value / max) * 100;

  return (
    <div className='progress-container'>
      <div className='progress-bar'>
        <div
          className='progress-fill'
          style={{ width: `${percentage}%` }}></div>
      </div>
      {showLabel && (
        <span className='progress-label'>{Math.round(percentage)}%</span>
      )}
    </div>
  );
};

export default { LoadingSpinner, ProgressBar };
