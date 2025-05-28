const { requestCampsite, parseDateArguments } = require('./camp.js');

async function testRequestCampsite() {
    console.log('Testing requestCampsite function...\n');
    
    try {
        // Test date parsing first
        console.log('1. Testing date parsing...');
        const dates = parseDateArguments();
        console.log('Start date:', dates.startDate.toDateString());
        console.log('End date:', dates.endDate.toDateString());
        console.log('First day of month for API:', dates.firstDayOfMonth.toISOString());
        console.log('✅ Date parsing successful\n');
        
        // Test campsite request
        console.log('2. Testing campsite availability request...');
        const data = await requestCampsite('249979');
        
        console.log('✅ Request successful!');
        console.log('Response keys:', Object.keys(data));
        
        if (data.campsites) {
            const campsiteCount = Object.keys(data.campsites).length;
            console.log(`Found ${campsiteCount} campsites in response`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testRequestCampsite().catch(console.error); 