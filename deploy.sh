#!/bin/bash

# Set variables
GITHUB_OWNER="lampastore"
GITHUB_REPO="streamproxy"
INSTALL_DIR="/var/www/streamproxy"
SERVICE_NAME="streamproxy"

# Ensure the script is run as root
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)."
    exit 1
fi

echo "🔍 Fetching the latest release..."
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/latest" | grep "tarball_url" | cut -d '"' -f 4)

if [ -z "$LATEST_RELEASE_URL" ]; then
    echo "❌ Failed to fetch the latest release URL!"
    exit 1
fi

# Download the latest release tarball
echo "⬇️ Downloading latest release..."
wget -O latest-release.tar.gz "$LATEST_RELEASE_URL"

# Create install directory
echo "📂 Setting up install directory..."
mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR"/*

# Extract the tarball
echo "📦 Extracting files..."
tar -xzf latest-release.tar.gz -C /tmp
LATEST_DIR=$(ls -d /tmp/$GITHUB_OWNER-*/ | head -n 1)
mv "$LATEST_DIR"/* "$INSTALL_DIR"
rm -rf "$LATEST_DIR" latest-release.tar.gz

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "⚡ Installing the latest Node.js and npm..."
       
    apt install -y nodejs npm
fi

# Verify installation
echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# Install npm dependencies
echo "📦 Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production

# Create systemd service
echo "⚙️ Setting up systemd service..."
cat <<EOF > /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=Stream Proxy
After=network.target

[Service]
ExecStart=/usr/bin/node /var/www/streamproxy/proxy.js
Restart=always
User=nobody
Group=nogroup
Environment=PATH=/usr/bin
Environment=NODE_ENV=production
WorkingDirectory=/var/www/streamproxy

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo "🔄 Enabling and starting service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

echo "✅ Deployment complete! Service '$SERVICE_NAME' is running."
