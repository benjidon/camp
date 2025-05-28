const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class VPNManager {
    constructor() {
        this.currentVPN = null;
        this.vpnProcess = null;
                this.vpnServers = [
            // California US servers (closest to CA locale)
            'ca-us100.nordvpn.com.udp.ovpn',
            'ca-us101.nordvpn.com.udp.ovpn',
            'ca-us102.nordvpn.com.udp.ovpn',
            'ca-us103.nordvpn.com.udp.ovpn',
            'ca-us104.nordvpn.com.udp.ovpn',
            'ca-us105.nordvpn.com.udp.ovpn',
            'ca-us106.nordvpn.com.udp.ovpn',
            'ca-us109.nordvpn.com.udp.ovpn',
            'ca-us110.nordvpn.com.udp.ovpn',
            'ca-us111.nordvpn.com.udp.ovpn',
            'ca-us112.nordvpn.com.udp.ovpn',
            'ca-us113.nordvpn.com.udp.ovpn',
            'ca-us114.nordvpn.com.udp.ovpn',
            'ca-us115.nordvpn.com.udp.ovpn'
        ];
    }

    async getCurrentIP() {
        try {
            const { stdout } = await execAsync('curl -s https://api.ipify.org');
            return stdout.trim();
        } catch (error) {
            console.error('Error getting current IP:', error);
            return null;
        }
    }

    async disconnectVPN() {
        if (this.vpnProcess) {
            this.vpnProcess.kill('SIGTERM');
            this.vpnProcess = null;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Kill any existing openvpn processes
        try {
            await execAsync('sudo pkill -f openvpn');
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            // Process might not exist, that's okay
        }
    }

    async connectToVPN(serverConfig) {
        await this.disconnectVPN();
        
        const configPath = `/etc/openvpn/ovpn_udp/${serverConfig}`;
        const authFile = 'pass.txt';
        
        // Check if config file exists
        try {
            await execAsync(`test -f ${configPath}`);
        } catch (error) {
            throw new Error(`VPN config file not found: ${configPath}`);
        }
        
        return new Promise((resolve, reject) => {
            this.vpnProcess = spawn('sudo', ['openvpn', '--config', configPath, '--auth-user-pass', authFile, '--log', '/dev/null'], {
                stdio: ['ignore', 'ignore', 'ignore']
            });
            
            let connected = false;
            const timeout = setTimeout(() => {
                if (!connected) {
                    this.vpnProcess?.kill('SIGTERM');
                    reject(new Error('VPN connection timeout'));
                }
            }, 30000);
            
            // Use timer-based connection detection since stdio is ignored
            setTimeout(() => {
                if (this.vpnProcess && !connected) {
                    connected = true;
                    clearTimeout(timeout);
                    this.currentVPN = serverConfig;
                    resolve();
                }
            }, 8000);
            
            this.vpnProcess.on('close', (code) => {
                this.vpnProcess = null;
                this.currentVPN = null;
                if (!connected) {
                    clearTimeout(timeout);
                    reject(new Error(`VPN process exited with code ${code}`));
                }
            });
            
            this.vpnProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    async rotateVPN() {
        const currentIP = await this.getCurrentIP();
        
        // Pick a random server
        const randomServer = this.vpnServers[Math.floor(Math.random() * this.vpnServers.length)];
        
        try {
            await this.connectToVPN(randomServer);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newIP = await this.getCurrentIP();
            
            if (newIP && newIP !== currentIP) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async cleanup() {
        await this.disconnectVPN();
    }
}

module.exports = VPNManager; 