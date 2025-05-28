const { initBrowser, closeBrowser } = require('../camp-tools.js');

async function testBrowser() {
    console.log('Testing browser initialization...\n');
    
    try {
        console.log('1. Initializing browser...');
        const driver = await initBrowser();
        console.log('✅ Browser initialized successfully');
        
        // Wait a moment to see the browser
        console.log('2. Waiting 3 seconds to verify browser is working...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get the page title to verify we're on recreation.gov
        const title = await driver.getTitle();
        console.log(`3. Page title: "${title}"`);
        
        if (title.toLowerCase().includes('recreation')) {
            console.log('✅ Successfully navigated to recreation.gov');
        } else {
            console.log('⚠️  Page title doesn\'t contain "recreation" - might be on wrong page');
        }
        
        console.log('4. Closing browser...');
        await closeBrowser();
        console.log('✅ Browser closed successfully');
        
        console.log('\n✅ Browser test completed successfully!');
        
    } catch (error) {
        console.error('❌ Browser test failed:', error.message);
        
        // Try to close browser even if test failed
        try {
            await closeBrowser();
        } catch (closeError) {
            console.error('Error closing browser:', closeError.message);
        }
    }
}

// Run the test
testBrowser().catch(console.error); 