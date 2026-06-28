# WAF Automation Project - Setup Guide

A comprehensive Docker-based project for security scanning and WAF automation using OWASP ZAP, n8n, MongoDB, and a full-stack application.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose**: Usually comes with Docker Desktop
- **Git**: [Install Git](https://git-scm.com/download)

To verify installations, run:

```bash
docker --version
docker-compose --version
git --version
```

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/mohamed-aziz-bouzgarrou/waf_security_automation.git
cd "waf automation docker"
```

### 2. Start the Project with Docker Compose

Navigate to the project root directory and run:

```bash
docker-compose up -d
```

This command will:

- Build and start all services in detached mode (running in the background)
- Create necessary volumes for data persistence
- Set up networking between containers
  This will take some time

**To view logs in real-time:**

```bash
docker-compose logs -f
```

**To stop the services:**

```bash
docker-compose down
```

---

## 🔐 Service Credentials & Access Information

### 📊 N8N (Workflow Automation)

- **URL**: http://localhost:5678
- **Email**: `admin@email.com`
- **Password**: `Admin123?`
- **Port**: 5678
- **Description**: Automation and workflow orchestration platform

### 💻 Backend API

- **URL**: http://localhost:3000
- **Port**: 3000
- **Environment**: Production
- **Database**: MongoDB (mongodb://mongo:27017/waf-automation)
- **Connected Services**: ZAP, N8N

### 🎨 Frontend Application

- **URL**: http://localhost:5173
- **Port**: 5173
- **Description**: React + Vite frontend application

### 🗄️ MongoDB Database

- **Connection String**: `mongodb://localhost:27017`
- **Port**: 27017
- **Database Name**: `waf-automation`
- **Data Location**: `./mongo_data` (persisted locally)

### 🛡️ OWASP ZAP Security Scanner

- **URL**: http://localhost:8080
- **Port**: 8080
- **API Disabled**: API key authentication is disabled (api.disablekey=true)
- **Mode**: Daemon mode with no key required

---

## 🔧 Environment Variables

## 📁 Service Dependencies

```
frontend → depends on → backend
backend → depends on → mongo, zap
n8n → depends on → mongo, zap
zap → no dependencies
mongo → no dependencies
```

---

## 🔄 Common Docker Commands

### View Running Containers

```bash
docker ps
```

### View All Containers (including stopped)

```bash
docker ps -a
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs n8n
docker-compose logs mongo
docker-compose logs zap

# Follow logs in real-time
docker-compose logs -f
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Remove All Containers and Data

```bash
docker-compose down -v
```

---

## ✅ Verification Steps

After running `docker-compose up -d`, verify all services are running:

1. **Check Docker containers:**

   ```bash
   docker ps
   ```

   You should see 5 containers: `n8n1`, `backend`, `frontend`, `mongo`, `zap`

2. **Test Frontend**: Open http://localhost:5173 in your browser

3. **Test Backend**: Open http://localhost:3000 in your browser

4. **Test N8N Interface**:
   - Go to http://localhost:5678
   - Login with `admin` / `admin123`

5. **Test MongoDB Connection:**

   ```bash
   # You can use MongoDB Compass or any client
   # Connection string: mongodb://localhost:27017
   ```

6. **Test ZAP API**: Open http://localhost:8080 in your browser
