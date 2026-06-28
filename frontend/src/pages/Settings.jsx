import React, { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { Card } from "../components/Card";
import { LoadingSpinner } from "../components/Loading";
import { settingsService } from "../services/mockService";
import "../styles/Settings.css";

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await settingsService.getSettings();
        if (response.success) {
          setSettings(response.data);
          setFormData(response.data);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await settingsService.updateSettings(formData);
      if (response.success) {
        setSettings(formData);
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title='Settings' subtitle='System Configuration'>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  if (!formData) {
    return (
      <MainLayout title='Settings' subtitle='System Configuration'>
        <div>Failed to load settings</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title='Settings' subtitle='System Configuration & Preferences'>
      <div className='settings-container'>
        <form onSubmit={handleSaveSettings} className='settings-form'>
          {/* Scan Configuration */}
          <Card className='settings-card'>
            <div className='card-header'>
              <h3>🔍 Scan Configuration</h3>
            </div>
            <div className='settings-fields'>
              <div className='form-group'>
                <label htmlFor='scanTimeout'>Scan Timeout (seconds)</label>
                <input
                  type='number'
                  id='scanTimeout'
                  name='scanTimeout'
                  value={formData.scanTimeout || ""}
                  onChange={handleInputChange}
                  className='form-control'
                />
                <small>Maximum time allowed for a scan to complete</small>
              </div>

              <div className='form-group'>
                <label htmlFor='maxConcurrentScans'>Max Concurrent Scans</label>
                <input
                  type='number'
                  id='maxConcurrentScans'
                  name='maxConcurrentScans'
                  value={formData.maxConcurrentScans || ""}
                  onChange={handleInputChange}
                  className='form-control'
                />
                <small>Number of scans that can run simultaneously</small>
              </div>

              <div className='form-group'>
                <label htmlFor='apiUrl'>API URL</label>
                <input
                  type='text'
                  id='apiUrl'
                  name='apiUrl'
                  value={formData.apiUrl || ""}
                  onChange={handleInputChange}
                  className='form-control'
                />
                <small>OWASP ZAP API endpoint URL</small>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className='settings-card'>
            <div className='card-header'>
              <h3>🔔 Notification Settings</h3>
            </div>
            <div className='settings-fields'>
              <div className='form-group checkbox-group'>
                <label>
                  <input
                    type='checkbox'
                    name='notificationsEnabled'
                    checked={formData.notificationsEnabled || false}
                    onChange={handleInputChange}
                  />
                  <span>Enable Email Notifications</span>
                </label>
              </div>

              <div className='form-group'>
                <label htmlFor='emailNotifications'>
                  Notify on Risk Levels
                </label>
                <div className='checkbox-list'>
                  <label>
                    <input
                      type='checkbox'
                      name='highRiskNotify'
                      defaultChecked={formData.emailNotifications?.includes(
                        "high",
                      )}
                      onChange={(e) => {
                        // Handle high risk checkbox
                      }}
                    />
                    High
                  </label>
                  <label>
                    <input
                      type='checkbox'
                      name='mediumRiskNotify'
                      defaultChecked={formData.emailNotifications?.includes(
                        "medium",
                      )}
                      onChange={(e) => {
                        // Handle medium risk checkbox
                      }}
                    />
                    Medium
                  </label>
                  <label>
                    <input
                      type='checkbox'
                      name='lowRiskNotify'
                      onChange={(e) => {
                        // Handle low risk checkbox
                      }}
                    />
                    Low
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Report Settings */}
          <Card className='settings-card'>
            <div className='card-header'>
              <h3>📊 Report Settings</h3>
            </div>
            <div className='settings-fields'>
              <div className='form-group checkbox-group'>
                <label>
                  <input
                    type='checkbox'
                    name='autoUpdateReports'
                    checked={formData.autoUpdateReports || false}
                    onChange={handleInputChange}
                  />
                  <span>Auto-update Reports on Scan Completion</span>
                </label>
              </div>

              <div className='form-group'>
                <label htmlFor='reportFormat'>Default Report Format</label>
                <select
                  name='reportFormat'
                  id='reportFormat'
                  className='form-control'>
                  <option>PDF</option>
                  <option>HTML</option>
                  <option>JSON</option>
                </select>
              </div>

              <div className='form-group checkbox-group'>
                <label>
                  <input type='checkbox' defaultChecked />
                  <span>Include Executive Summary in Reports</span>
                </label>
              </div>

              <div className='form-group checkbox-group'>
                <label>
                  <input type='checkbox' defaultChecked />
                  <span>Include Detailed Findings</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card className='settings-card'>
            <div className='card-header'>
              <h3>🔐 Security Settings</h3>
            </div>
            <div className='settings-fields'>
              <div className='form-group'>
                <label htmlFor='sessionTimeout'>
                  Session Timeout (minutes)
                </label>
                <input
                  type='number'
                  id='sessionTimeout'
                  name='sessionTimeout'
                  defaultValue='30'
                  className='form-control'
                />
              </div>

              <div className='form-group checkbox-group'>
                <label>
                  <input type='checkbox' defaultChecked />
                  <span>Enable Two-Factor Authentication</span>
                </label>
              </div>

              <div className='form-group checkbox-group'>
                <label>
                  <input type='checkbox' defaultChecked />
                  <span>Require HTTPS for API Connections</span>
                </label>
              </div>

              <div className='form-group checkbox-group'>
                <label>
                  <input type='checkbox' defaultChecked />
                  <span>Enable Audit Logging</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Backup Settings */}
          <Card className='settings-card'>
            <div className='card-header'>
              <h3>💾 Backup Settings</h3>
            </div>
            <div className='settings-fields'>
              <div className='form-group checkbox-group'>
                <label>
                  <input type='checkbox' defaultChecked />
                  <span>Enable Automatic Backups</span>
                </label>
              </div>

              <div className='form-group'>
                <label htmlFor='backupFrequency'>Backup Frequency</label>
                <select
                  name='backupFrequency'
                  id='backupFrequency'
                  className='form-control'>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              <button type='button' className='btn btn-secondary'>
                🔄 Backup Now
              </button>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className='settings-actions'>
            <button type='submit' className='btn btn-primary' disabled={saving}>
              {saving ? "Saving..." : "💾 Save Settings"}
            </button>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={() => setFormData(settings)}>
              ↩️ Discard Changes
            </button>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure? This will reset all settings to defaults.",
                  )
                ) {
                  setFormData(settings);
                }
              }}>
              ⚠️ Reset to Defaults
            </button>
          </div>
        </form>

        {/* System Information */}
        <Card className='settings-card system-info'>
          <div className='card-header'>
            <h3>ℹ️ System Information</h3>
          </div>
          <div className='info-grid'>
            <div className='info-item'>
              <span className='info-label'>Application Version</span>
              <span className='info-value'>1.0.0</span>
            </div>
            <div className='info-item'>
              <span className='info-label'>Last Updated</span>
              <span className='info-value'>2026-02-20</span>
            </div>
            <div className='info-item'>
              <span className='info-label'>Database</span>
              <span className='info-value'>Active</span>
            </div>
            <div className='info-item'>
              <span className='info-label'>OWASP ZAP Version</span>
              <span className='info-value'>2.14.0</span>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
