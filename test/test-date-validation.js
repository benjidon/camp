const { parseDateArguments } = require('../camp-tools.js');

function testDateValidation() {
    console.log('Testing date validation in parseDateArguments...\n');
    
    // Test 1: Valid date range (should work)
    console.log('1. Testing valid date range (may26 to may28)...');
    try {
        // Temporarily override process.argv for testing
        const originalArgv = process.argv;
        process.argv = ['node', 'test.js', 'may26', 'may28'];
        
        const result = parseDateArguments();
        console.log('✅ Valid date range accepted');
        console.log(`   Start: ${result.startDate.toDateString()}`);
        console.log(`   End: ${result.endDate.toDateString()}`);
        
        // Restore original argv
        process.argv = originalArgv;
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
    
    // Test 2: Invalid date range (end before start - should fail)
    console.log('\n2. Testing invalid date range (may26 to may23)...');
    try {
        // Temporarily override process.argv for testing
        const originalArgv = process.argv;
        process.argv = ['node', 'test.js', 'may26', 'may23'];
        
        const result = parseDateArguments();
        console.error('❌ Invalid date range was incorrectly accepted!');
        
        // Restore original argv
        process.argv = originalArgv;
    } catch (error) {
        console.log('✅ Invalid date range correctly rejected');
        console.log(`   Error: ${error.message}`);
    }
    
    // Test 3: Same date (should work)
    console.log('\n3. Testing same start and end date (may26 to may26)...');
    try {
        // Temporarily override process.argv for testing
        const originalArgv = process.argv;
        process.argv = ['node', 'test.js', 'may26', 'may26'];
        
        const result = parseDateArguments();
        console.log('✅ Same date range accepted');
        console.log(`   Start: ${result.startDate.toDateString()}`);
        console.log(`   End: ${result.endDate.toDateString()}`);
        
        // Restore original argv
        process.argv = originalArgv;
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
    
    console.log('\n✅ Date validation tests completed!');
}

// Run the test
testDateValidation(); 