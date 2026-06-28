/**
 * Example Integration: Scan Details Page with Dual Webhook Support
 * 
 * Shows how to integrate ScanResultsWithCLI component into your existing
 * scan viewing flow with proper error handling and state management.
 * 
 * File: frontend/src/pages/ScanDetails.jsx
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ScanResultsWithCLI from "../components/ScanResultsWithCLI";
import { apiClient } from "../config/api";
import { API_BASE_URL } from "../config/api";

/**
 * ScanDetails Page
 * Displays full scan results including report and CLI commands
 */
const ScanDetails = () => {
  const { scanId } = useParams();
  const navigate = useNavigate();

  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvalInProgress, setApprovalInProgress] = useState(false);

  // Handle approval of all commands
  const handleApproveAll = async (id, _indices) => {
    setApprovalInProgress(true);

    try {
      const response = await apiClient.post(`/api/scans/${id}/approve`, {
        approveAll: true,
      });

      if (response.data.success) {
        // Show success message
        alert("✓ Scan approved! FortiWeb commands will be applied shortly.");

        // Update local state
        setScanData((prev) => ({
          ...prev,
          status: "APPROVED",
        }));

        // Redirect after delay
        setTimeout(() => {
          navigate("/scan-approval");
        }, 2000);
      } else {
        alert("❌ Approval failed: " + response.data.error);
      }
    } catch (err) {
      console.error("Approval error:", err);
      alert("❌ Error approving scan: " + err.message);
    } finally {
      setApprovalInProgress(false);
    }
  };

  // Handle partial approval (selected commands only)
  const handleApplySelected = async (id, indices) => {
    setApprovalInProgress(true);

    try {
      const response = await apiClient.post(`/api/scans/${id}/approve-partial`, {
        approvedCommandIndices: indices,
      });

      if (response.data.success) {
        alert(
          `✓ Applied ${indices.length} selected fixes! FortiWeb commands will be applied shortly.`
        );

        setScanData((prev) => ({
          ...prev,
          status: "APPROVED",
          approvedCommandIndices: indices,
        }));

        setTimeout(() => {
          navigate("/scan-approval");
        }, 2000);
      } else {
        alert("❌ Approval failed: " + response.data.error);
      }
    } catch (err) {
      console.error("Partial approval error:", err);
      alert("❌ Error applying selected fixes: " + err.message);
    } finally {
      setApprovalInProgress(false);
    }
  };

  // Handle rejection
  const handleRejectScan = async (id) => {
    setApprovalInProgress(true);

    try {
      const reason = prompt(
        "Please provide a reason for rejection (optional):",
        ""
      );

      const response = await apiClient.post(`/api/scans/${id}/reject`, {
        reason: reason || null,
      });

      if (response.data.success) {
        alert("✓ Scan rejected.");

        setScanData((prev) => ({
          ...prev,
          status: "REJECTED",
        }));

        setTimeout(() => {
          navigate("/scan-approval");
        }, 2000);
      } else {
        alert("❌ Rejection failed: " + response.data.error);
      }
    } catch (err) {
      console.error("Rejection error:", err);
      alert("❌ Error rejecting scan: " + err.message);
    } finally {
      setApprovalInProgress(false);
    }
  };

  return (
    <MainLayout
      title="Scan Results"
      subtitle="Review analysis report and FortiWeb remediation commands"
    >
      <div className="py-8">
        <ScanResultsWithCLI
          scanId={scanId}
          apiBaseUrl={API_BASE_URL}
          onApprove={handleApproveAll}
          onReject={handleRejectScan}
          onApplySelected={handleApplySelected}
        />
      </div>
    </MainLayout>
  );
};

export default ScanDetails;
