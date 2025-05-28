const { sendEmail, sendStatusEmail } = require('./camp.js');

async function testEmailFunctions() {
    console.log('Testing email functions...\n');
    
    // Test sendStatusEmail
    console.log('1. Testing sendStatusEmail...');
    try {
        await sendStatusEmail('Test Status - Bot Started');
        console.log('✅ sendStatusEmail test completed\n');
    } catch (error) {
        console.error('❌ sendStatusEmail test failed:', error);
    }
    
    // Test sendEmail
    console.log('2. Testing sendEmail...');
    try {
        await sendEmail('249979', 'Potishwa Campground (TEST)');
        console.log('✅ sendEmail test completed\n');
    } catch (error) {
        console.error('❌ sendEmail test failed:', error);
    }
    
    console.log('Email function tests completed!');
}

// Run the tests
testEmailFunctions().catch(console.error); 