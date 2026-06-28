import React from "react";
import "../styles/Header.css";

const Header = ({ title, subtitle }) => {
  return (
    <header className='header'>
      <div className='header-content'>
        <div className='header-text'>
          <h2 className='header-title'>{title}</h2>
          {subtitle && <p className='header-subtitle'>{subtitle}</p>}
        </div>
        <div className='header-actions'>
          <button
            className='header-btn notification-btn'
            aria-label='Notifications'>
            🔔 <span className='notification-badge'>3</span>
          </button>
          <button className='header-btn profile-btn' aria-label='Profile'>
            👤
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
