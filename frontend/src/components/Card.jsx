import React from "react";
import "../styles/Card.css";

export const Card = ({ children, className = "" }) => {
  return <div className={`card ${className}`}>{children}</div>;
};

export const StatCard = ({ icon, label, value, trend, color = "primary" }) => {
  return (
    <Card className={`stat-card stat-card-${color}`}>
      <div className='stat-header'>
        <span className='stat-icon'>{icon}</span>
        <h3 className='stat-label'>{label}</h3>
      </div>
      <div className='stat-value'>{value}</div>
      {trend && (
        <p className={`stat-trend ${trend > 0 ? "positive" : "negative"}`}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% from last week
        </p>
      )}
    </Card>
  );
};

export const SummaryCard = ({
  title,
  description,
  stat,
  icon,
  color = "blue",
}) => {
  return (
    <Card className={`summary-card summary-card-${color}`}>
      <div className='summary-icon'>{icon}</div>
      <h4>{title}</h4>
      <p className='summary-description'>{description}</p>
      <div className='summary-stat'>{stat}</div>
    </Card>
  );
};

export default Card;
