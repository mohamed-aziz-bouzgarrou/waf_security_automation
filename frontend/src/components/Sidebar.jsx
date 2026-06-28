import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Sidebar.css";

const Sidebar = () => {
  const location = useLocation();

  const navSections = [
    {
      label: "Dashboard",
      path: "/",
      icon: "📊",
    },
    {
      group: "Scans & Reports",
      items: [
        { label: "Scans", path: "/scans", icon: "🔍" },
        { label: "Reports", path: "/reports", icon: "📄" },
      ],
    },
    {
      label: "Approvals",
      path: "/scan-approval",
      icon: "✓",
    },
    {
      label: "History",
      path: "/history",
      icon: "📜",
    },
    {
      label: "Chatbot",
      path: "/chatbot",
      icon: "💬",
    },
    {
      label: "Settings",
      path: "/settings",
      icon: "⚙️",
    },
  ];

  return (
    <aside className='sidebar'>
      <div className='sidebar-header'>
        <div className='sidebar-logo'>
          <span className='logo-icon'>🔐</span>
          <h1>ZAP Guard</h1>
        </div>
      </div>

      <nav className='sidebar-nav'>
        {navSections.map((section, index) => {
          if (section.group) {
            return (
              <div key={section.group} className='nav-group'>
                <div className='nav-group-label'>{section.group}</div>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-item nav-item-grouped ${isActive ? "active" : ""}`}>
                      <span className='nav-icon'>{item.icon}</span>
                      <span className='nav-label'>{item.label}</span>
                      {isActive && <div className='nav-indicator'></div>}
                    </Link>
                  );
                })}
              </div>
            );
          } else {
            const isActive = location.pathname === section.path;
            return (
              <Link
                key={section.path}
                to={section.path}
                className={`nav-item ${isActive ? "active" : ""}`}>
                <span className='nav-icon'>{section.icon}</span>
                <span className='nav-label'>{section.label}</span>
                {isActive && <div className='nav-indicator'></div>}
              </Link>
            );
          }
        })}
      </nav>

      <div className='sidebar-footer'>
        <div className='user-info'>
          <div className='user-avatar'>👤</div>
          <div className='user-details'>
            <p className='user-name'>Security Admin</p>
            <p className='user-status'>Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
