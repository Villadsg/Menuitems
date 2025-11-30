# Desktop Server Setup Guide

This guide explains how to set up this project across multiple computers while keeping Docker services and data local to your desktop.

## Architecture Overview

- **Desktop**: Runs Docker services (DuckDB + OCR), acts as server for mobile devices
- **Other Computers**: Clone from GitHub, run without Docker dependencies
- **Mobile Apps**: Connect to desktop server via network IP

## Desktop Setup (This Computer)

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with your actual IP address
```

### 2. Start Services
```bash
# Start SvelteKit server (accessible on network)
npm run dev

# Start OCR service (in separate terminal)
cd deepseek-ocr-service
docker-compose up -d
```

### 3. Get Your Network IP
```bash
# Run the IP helper script
./scripts/get-ip.sh
```

This will show:
- Your desktop's network IP address
- Service status
- Configuration URLs for mobile devices

## Remote Computer Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd langtours
npm install
```

### 2. Configure for Remote Desktop
```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local and set:
DESKTOP_SERVER_IP=<your-desktop-ip>
DESKTOP_SERVER_URL=http://<your-desktop-ip>:5173
OCR_SERVICE_URL=http://<your-desktop-ip>:8000
```

### 3. Run Development Server
```bash
# Start in development mode (connects to desktop services)
npm run dev
```

## Mobile App Configuration

### 1. Install Mobile App
```bash
# Build for Android (if needed)
npm run build
npx cap sync android
npx cap open android
```

### 2. Configure Server Connection
1. Open the mobile app
2. Go to Settings
3. Enter Server URL: `http://<desktop-ip>:5173`
4. Test connection

## Network Requirements

### Firewall Settings
Ensure these ports are open on your desktop:
- `5173` - SvelteKit development server
- `8000` - OCR service

### Router Configuration
- All devices must be on the same network
- Desktop should have a static IP or DHCP reservation

## Troubleshooting

### Can't Connect from Remote Computer
1. Check firewall settings on desktop
2. Verify desktop services are running: `./scripts/get-ip.sh`
3. Test connection: `curl http://<desktop-ip>:5173/api/db`

### Mobile App Connection Issues
1. Ensure devices are on same WiFi network
2. Check server URL format in app settings
3. Try IP address instead of hostname

### Docker Services Not Starting
```bash
cd deepseek-ocr-service
docker-compose logs    # Check for errors
docker-compose down && docker-compose up -d
```

## File Structure

### Local Only (Not in Git)
- `deepseek-ocr-service/` - Docker OCR service
- `data/` - DuckDB database and photos
- `*.duckdb*` - Database files
- `.env.local` - Local environment configuration

### Shared (In Git)
- All source code
- Configuration templates
- Documentation

## Development Workflow

1. **Desktop**: Primary development, run all services
2. **Remote Computers**: Code editing, testing UI changes
3. **Mobile**: Testing mobile-specific features
4. **Deployment**: Deploy from any computer (connects to production services)

## Security Notes

- Desktop services are only accessible on local network
- Don't expose ports to internet without proper security
- Use HTTPS in production environments
- Consider VPN for remote access outside local network