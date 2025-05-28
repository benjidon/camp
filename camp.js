import { sendEmail, sendStatusEmail, sendStatusReport, requestCampsite, parseDateArguments, checkAvailability, initBrowser, closeBrowser, grabReservation, resetBrowser, refreshBrowser, cleanup } from "./camp-tools.js";
import VPNManager from "./vpn-manager.js";

const dates = parseDateArguments();


// Campsite configuration
const campgrounds = {
    '232447': 'Upper Pines Campground',
    '232450': 'Lower Pines Campground',
    '232449': 'North Pines Campground'
};

let errorCount = 0;
let errorLog = [];
const startTime = new Date();
let successfulRequests = 0;
let loopCount = 0;

// Initialize VPN manager globally for cleanup
const vpnManager = new VPNManager();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
        await cleanup(); // This will close browser and cleanup VPN
        console.log('✅ Cleanup completed successfully');
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
    process.exit(0);
};

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error);
    await gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    await gracefulShutdown('unhandledRejection');
});
    
async function camploop() {
    
    console.log('🏕️ Starting camping bot...');
    console.log(`Monitoring ${Object.keys(campgrounds).length} campground(s)`);
    try {
        await initBrowser();
    } catch (error) {
        console.error('Error initializing browser:', error.message);
        throw error;
    }
    

    while(true) {
        loopCount++;
        console.log(`Loop ${loopCount}...`);

        try {
            // Loop through all campgrounds
            for (const [campgroundId, campgroundName] of Object.entries(campgrounds)) {
                console.log(`Checking ${campgroundName} (${campgroundId})...`);
                
                // Request campsite data
                const data = await requestCampsite(campgroundId);
                successfulRequests++;
                
                // Check availability
                const availability = checkAvailability(data);

                if (availability.available) {
                    console.log(`🎉 CAMPSITE FOUND! ${campgroundName} - Site ${availability.campsite.site}`);
                    
                    // Send email notification
                    sendEmail(availability.campsite.campsite_id, campgroundName);
                    
                    // Attempt to grab the reservation
                    try {
                        await grabReservation(campgroundId, availability.campsite);
                        console.log('✅ Reservation attempt completed!');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                    } catch (reservationError) {
                        console.error('❌ Reservation failed:', reservationError.message);
                        resetBrowser();
                        continue;
                    }
                } else {
                    console.log(`No availability at ${campgroundName}`);
                }
                 // Wait 1 second before next iteration
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('Error in main loop:', error.message);
            errorCount++;
            errorLog.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                loop: loopCount
            });
            
            // Keep error log manageable (last 50 errors)
            if (errorLog.length > 50) {
                errorLog = errorLog.slice(-50);
            }
        }
        
        // Send status email every 1000 loops
        if (loopCount % 1000 === 0) {
            try {
                await sendStatusReport(loopCount, successfulRequests, errorCount, errorLog, startTime, campgrounds);
                refreshBrowser();
                console.log(`📧 Status email sent (Loop ${loopCount})`);
            } catch (emailError) {
                console.error('Failed to send status email:', emailError.message);
            }
        }
        
    }
}

async function main() {
    while (true) {
        try {            
           await camploop();
        } catch(error) {
            console.error('Error in main loop:', error.message);
            errorLog.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                loop: loopCount
            });
            
            // Keep error log manageable (last 50 errors)
            if (errorLog.length > 50) {
                errorLog = errorLog.slice(-50);
            }

        }
    }
}

main();