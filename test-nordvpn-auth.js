const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testNordVPNAuth() {
    console.log('🔐 Testing NordVPN Authentication...\n');
    
    try {
        // Check if nordvpn CLI is available
        console.log('1. Checking if NordVPN CLI is available...');
        try {
            const { stdout } = await execAsync('which nordvpn');
            console.log('✅ NordVPN CLI found at:', stdout.trim());
            
            // Try to login with service credentials
            console.log('\n2. Attempting to login with service credentials...');
            try {
                await execAsync('nordvpn login --username qkc4VmKRgaPasVMjTkJkz2nw --password ACRk8DUmRUAJQF1N9gXsWPLz');
                console.log('✅ NordVPN CLI login successful');
                
                // Try to connect
                console.log('\n3. Testing connection...');
                await execAsync('nordvpn connect United_States');
                console.log('✅ NordVPN connection successful');
                
                // Get IP
                const { stdout: ip } = await execAsync('curl -s https://api.ipify.org');
                console.log('Current IP:', ip.trim());
                
                // Disconnect
                await execAsync('nordvpn disconnect');
                console.log('✅ Disconnected');
                
            } catch (loginError) {
                console.log('❌ NordVPN CLI login failed:', loginError.message);
            }
            
        } catch (cliError) {
            console.log('❌ NordVPN CLI not found');
            console.log('💡 You may need to install it: https://nordvpn.com/download/linux/');
        }
        
        // Alternative: Test with manual OpenVPN approach
        console.log('\n4. Testing manual OpenVPN approach...');
        console.log('💡 The AUTH_FAILED error suggests:');
        console.log('   - Credentials might be for NordVPN account, not service credentials');
        console.log('   - You may need to use your regular NordVPN username/password');
        console.log('   - Or generate service credentials from NordVPN dashboard');
        console.log('   - Check: https://my.nordaccount.com/dashboard/nordvpn/');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testNordVPNAuth().catch(console.error); 