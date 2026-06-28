import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import "../styles/MainLayout.css";

const MainLayout = ({ children, title, subtitle }) => {
  return (
    <div className='main-layout'>
      <Sidebar />
      <div className='main-content'>
        <Header title={title} subtitle={subtitle} />
        <main className='page-container'>{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
