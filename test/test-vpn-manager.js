const VPNManager = require('../vpn-manager');

async function testVPNManager() {
    console.log('🧪 Testing VPN Manager...\n');
    
    const vpnManager = new VPNManager();
    
    try {
        // Test 1: Get current IP
        console.log('1. Testing getCurrentIP()...');
        const initialIP = await vpnManager.getCurrentIP();
        console.log(`Initial IP: ${initialIP}`);
        
        if (!initialIP) {
            console.error('❌ Failed to get current IP');
            return;
        }
        console.log('✅ Successfully retrieved current IP\n');
        
        // Test 2: Test VPN rotation
        console.log('2. Testing VPN rotation...');
        const rotationSuccess = await vpnManager.rotateVPN();
        
        if (rotationSuccess) {
            console.log('✅ VPN rotation completed successfully\n');
        } else {
            console.log('⚠️ VPN rotation completed but IP may not have changed\n');
        }
        
        // Test 3: Verify we can get IP after VPN connection
        console.log('3. Testing IP retrieval after VPN...');
        const vpnIP = await vpnManager.getCurrentIP();
        console.log(`VPN IP: ${vpnIP}`);
        
        if (vpnIP && vpnIP !== initialIP) {
            console.log('✅ IP successfully changed via VPN');
        } else if (vpnIP === initialIP) {
            console.log('⚠️ IP appears to be the same (VPN may not be working)');
        } else {
            console.log('❌ Failed to get IP after VPN connection');
        }
        
        // Test 4: Test cleanup
        console.log('\n4. Testing cleanup...');
        await vpnManager.cleanup();
        console.log('✅ Cleanup completed');
        
        // Test 5: Verify IP after cleanup
        console.log('\n5. Testing IP after cleanup...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for disconnection
        const finalIP = await vpnManager.getCurrentIP();
        console.log(`Final IP: ${finalIP}`);
        
        console.log('\n🎉 VPN Manager test completed!');
        
    } catch (error) {
        console.error('❌ VPN Manager test failed:', error);
        
        // Ensure cleanup even if test fails
        try {
            await vpnManager.cleanup();
        } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, cleaning up...');
    const vpnManager = new VPNManager();
    await vpnManager.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, cleaning up...');
    const vpnManager = new VPNManager();
    await vpnManager.cleanup();
    process.exit(0);
});

// Run the test
testVPNManager().catch(console.error); 