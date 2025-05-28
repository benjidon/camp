#!/bin/bash

echo "Setting up passwordless sudo for OpenVPN..."

# Create a sudoers file for openvpn
sudo tee /etc/sudoers.d/openvpn-nopasswd > /dev/null << EOF
# Allow user to run openvpn without password
$USER ALL=(ALL) NOPASSWD: /usr/sbin/openvpn
$USER ALL=(ALL) NOPASSWD: /usr/bin/pkill -f openvpn
EOF

# Set proper permissions
sudo chmod 440 /etc/sudoers.d/openvpn-nopasswd

echo "✅ Passwordless sudo configured for OpenVPN"
echo "You can now run OpenVPN commands without entering a password"
echo ""
echo "To test, try: sudo openvpn --version" 