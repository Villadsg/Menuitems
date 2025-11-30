#!/bin/bash
# Get Desktop IP Address for Mobile Configuration
# This script helps you find your desktop's network IP for mobile app configuration

echo "=== Desktop Server IP Configuration ==="
echo

# Get the primary network IP address
PRIMARY_IP=$(hostname -I | awk '{print $1}')
echo "🖥️  Primary IP Address: $PRIMARY_IP"

# Alternative method using ip route
ROUTE_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || echo "N/A")
if [ "$ROUTE_IP" != "N/A" ] && [ "$ROUTE_IP" != "$PRIMARY_IP" ]; then
    echo "🌐  Route IP Address: $ROUTE_IP"
fi

echo
echo "📱  Mobile App Configuration:"
echo "   Server URL: http://$PRIMARY_IP:5173"
echo "   OCR Service: http://$PRIMARY_IP:8000"

echo
echo "🔧  To configure mobile apps:"
echo "   1. Open the app Settings"
echo "   2. Enter Server URL: http://$PRIMARY_IP:5173"
echo "   3. Test connection"

echo
echo "⚙️  To start desktop services:"
echo "   npm run dev                    # Start SvelteKit server"
echo "   cd deepseek-ocr-service"
echo "   docker-compose up -d           # Start OCR service"

# Check if services are running
echo
echo "📊  Service Status:"

# Check SvelteKit port
if ss -tln | grep -q ":5173 "; then
    echo "   ✅ SvelteKit server is running on port 5173"
else
    echo "   ❌ SvelteKit server is not running on port 5173"
fi

# Check OCR service port
if ss -tln | grep -q ":8000 "; then
    echo "   ✅ OCR service is running on port 8000"
else
    echo "   ❌ OCR service is not running on port 8000"
fi

echo
echo "💡  Copy the Server URL above to configure remote devices"