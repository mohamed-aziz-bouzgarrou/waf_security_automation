import React from "react";
import "../styles/Badges.css";

export const StatusBadge = ({ status, size = "medium" }) => {
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
        return "status-success";
      case "running":
      case "in progress":
        return "status-running";
      case "failed":
      case "error":
        return "status-failed";
      case "pending":
        return "status-pending";
      default:
        return "status-default";
    }
  };

  return (
    <span className={`status-badge ${getStatusClass(status)} ${size}`}>
      {status}
    </span>
  );
};

export const RiskBadge = ({ risk, size = "medium" }) => {
  const getRiskClass = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "risk-high";
      case "medium":
        return "risk-medium";
      case "low":
        return "risk-low";
      case "info":
      case "informational":
        return "risk-info";
      default:
        return "risk-default";
    }
  };

  return (
    <span className={`risk-badge ${getRiskClass(risk)} ${size}`}>{risk}</span>
  );
};

export const ConfidenceBadge = ({ confidence, size = "medium" }) => {
  const getConfidenceClass = (confidence) => {
    if (confidence?.toLowerCase() === "high") {
      return "confidence-high";
    } else if (confidence?.toLowerCase() === "medium") {
      return "confidence-medium";
    }
    return "confidence-low";
  };

  return (
    <span
      className={`confidence-badge ${getConfidenceClass(confidence)} ${size}`}>
      {confidence}
    </span>
  );
};

export default { StatusBadge, RiskBadge, ConfidenceBadge };
