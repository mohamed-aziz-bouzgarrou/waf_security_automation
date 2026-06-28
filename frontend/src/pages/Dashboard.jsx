import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card, StatCard } from "../components/Card";
import { LoadingSpinner } from "../components/Loading";
import { n8nScanService } from "../services/n8nScanService";
import "../styles/Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [latestScan, setLatestScan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const scansRes = await n8nScanService.getAllScans();
        if (!scansRes.success) {
          setStats({
            totalScans: 0,
            pendingApproval: 0,
            appliedSuccess: 0,
            needsReview: 0,
          });
          setLatestScan(null);
          return;
        }

        const scans = Array.isArray(scansRes.data) ? scansRes.data : [];

        const pendingApprovalStatuses = new Set([
          "READY_FOR_APPROVAL",
          "REPORT_RECEIVED",
          "CLI_RECEIVED",
          "report_ready",
          "cli_ready",
        ]);

        const pendingApproval = scans.filter((s) =>
          pendingApprovalStatuses.has(s.status),
        ).length;

        const appliedSuccess = scans.filter(
          (s) => s.status === "APPLIED" && s.executionStatus === "SUCCESS",
        ).length;

        const needsReview = scans.filter(
          (s) =>
            (s.status === "APPLIED" && s.executionStatus === "PARTIAL_FAILURE") ||
            s.status === "FAILED",
        ).length;

        setStats({
          totalScans: scans.length,
          pendingApproval,
          appliedSuccess,
          needsReview,
        });

        setLatestScan(scans.length > 0 ? scans[0] : null);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStats({
          totalScans: 0,
          pendingApproval: 0,
          appliedSuccess: 0,
          needsReview: 0,
        });
        setLatestScan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !stats) {
    return (
      <MainLayout title='Dashboard' subtitle='Security Overview'>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  const latestScanTimestamp =
    latestScan?.executionCompletedAt ||
    latestScan?.executionResults?.timestamp ||
    latestScan?.createdAt ||
    latestScan?.updatedAt;

  return (
    <MainLayout title='Dashboard' subtitle='Security Overview & Key Metrics'>
      <div className='dashboard-container'>
        <div className='stats-grid'>
          <StatCard
            icon='🔍'
            label='Total Scans'
            value={stats.totalScans}
            color='primary'
          />
          <StatCard
            icon='⏳'
            label='Pending Approval'
            value={stats.pendingApproval}
            color='warning'
          />
          <StatCard
            icon='✅'
            label='Applied (Success)'
            value={stats.appliedSuccess}
            color='primary'
          />
          <StatCard
            icon='⚠️'
            label='Needs Review'
            value={stats.needsReview}
            color='danger'
          />
        </div>

        <Card className='latest-scan-card'>
          <h3>Latest Scan</h3>
          {latestScan ? (
            <div className='latest-scan-grid'>
              <div className='latest-scan-item'>
                <span className='latest-scan-label'>Scan ID</span>
                <span className='latest-scan-value'>
                  {latestScan.scanId || latestScan._id}
                </span>
              </div>
              <div className='latest-scan-item'>
                <span className='latest-scan-label'>Target</span>
                <span className='latest-scan-value'>{latestScan.target}</span>
              </div>
              <div className='latest-scan-item'>
                <span className='latest-scan-label'>Date</span>
                <span className='latest-scan-value'>
                  {latestScanTimestamp
                    ? new Date(latestScanTimestamp).toLocaleString()
                    : "N/A"}
                </span>
              </div>
            </div>
          ) : (
            <p>No scans available yet.</p>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
