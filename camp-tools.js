const nodemailer = require('nodemailer');
const axios = require('axios');
const https = require('https');
const { Builder, By, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const VPNManager = require('./vpn-manager');

// password: e+McW+_iL8GyGMz
// curl 'https://ip.oxylabs.io/location' -U 'customer-zallzool_xoMku-cc-US:e+McW+_iL8GyGMz' -x 'pr.oxylabs.io:7777' 


const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Accept': 'application/json',
};

// Global variables
var dates = null;
var driver = null;
var vpnManager = new VPNManager();
var requestCount = 0;

// Parse command line arguments for dates
function parseDateArguments() {
    if (dates !== null) {
        return dates;
    }
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node camp.js <start_date> <checkout_date>');
        console.error('Example: node camp.js may26 may28');
        process.exit(1);
    }
    
    const startDateStr = args[0].toLowerCase();
    const endDateStr = args[1].toLowerCase();
    
    // Parse month and day from strings like "may26"
    const parseDate = (dateStr) => {
        const months = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };
        
        const monthMatch = dateStr.match(/^([a-z]+)(\d+)$/);
        if (!monthMatch) {
            throw new Error(`Invalid date format: ${dateStr}. Use format like 'may26'`);
        }
        
        const monthStr = monthMatch[1];
        const day = parseInt(monthMatch[2]);
        
        if (!(monthStr in months)) {
            throw new Error(`Invalid month: ${monthStr}`);
        }
        
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, months[monthStr], day);
    };
    
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);
    
    // Validate that end date is after start date
    if (endDate < startDate) {
        throw new Error(`End date (${endDateStr}) must be after start date (${startDateStr})`);
    }
    
    // Get the first day of the month for the API request
    const firstDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    // cache the dates
    dates = {
        startDate,
        endDate,
        firstDayOfMonth
    }
    return dates;
}

// Request campsite availability with VPN rotation
async function requestCampsite(id) {
    console.log(`Requesting ${id}...`);
    requestCount++;
    
    // Rotate VPN every 5 requests or on 429 errors
    if (requestCount >= 100 ) {
        console.log('Rotating VPN for fresh IP...');
        await vpnManager.rotateVPN();
        requestCount = 0;
    }
    
    const { firstDayOfMonth } = parseDateArguments();
    // Format date like the Python version: 2024-05-01T00%3A00%3A00.000Z
    const year = firstDayOfMonth.getFullYear();
    const month = String(firstDayOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(firstDayOfMonth.getDate()).padStart(2, '0');
    const startDateParam = `${year}-${month}-${day}T00%3A00%3A00.000Z`;
    const startDateParam2 = `${year}-06-${day}T00%3A00%3A00.000Z`;

    
    // Oxylabs proxy configuration - try different approaches
    const proxyConfig = {
        proxy: {
            host: 'pr.oxylabs.io',
            port: 7777,
            auth: {
                username: 'customer-zallzool_xoMku-cc-US',
                password: 'e+McW+_iL8GyGMz'
            },
            protocol: 'http' // Try HTTP instead of HTTPS
        },
        headers: {
            ...headers,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        timeout: 30000 // 30 second timeout
    };
    
    // Try proxy first, fallback to direct request with delay
    // try {
    //     console.log('Attempting request via proxy...');
    //     const response = await axios.get(
    //         `https://www.recreation.gov/api/camps/availability/campground/${id}/month?start_date=${startDateParam}`,
    //         proxyConfig
    //     );
    //     console.log(`Status: ${response.status} (via proxy)`);
    //     if (response.status === 429) {
    //         throw new Error('429 received');
    //     }
    //     return response.data;
    // } catch (proxyError) {
        // console.log(`Proxy failed: ${proxyError.message}`);
        
        // Check if it's a 403 restricted target error
        // if (proxyError.response && proxyError.response.status === 403) {
            // console.log('Recreation.gov appears to be restricted by proxy. Falling back to direct request with delay...');
            
            // Add a random delay to avoid rate limiting
            // const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
            // console.log(`Waiting ${delay}ms before direct request...`);
            // await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
                const directResponse = await axios.get(
                    `https://www.recreation.gov/api/camps/availability/campground/${id}/month?start_date=${startDateParam}`,
                    { headers }
                );
                const directResponse2 = await axios.get(
                    `https://www.recreation.gov/api/camps/availability/campground/${id}/month?start_date=${startDateParam2}`,
                    { headers }
                );
                console.log(`Status: ${directResponse.status} (direct request)`);
                console.log(`Status: ${directResponse2.status} (direct request)`);

                
                if (directResponse.status === 429) {
                    throw new Error('429 received on direct request');
                }
                
                // Merge the two responses
                const mergedData = mergeApiResponses(directResponse.data, directResponse2.data);
                return mergedData;
                         } catch (directError) {
                 if (directError.response && directError.response.status === 429) {
                     console.log('Got 429 - rotating VPN and retrying...');
                     await vpnManager.rotateVPN();
                     requestCount = 0;
                     
                     // Wait a bit more after VPN rotation
                     const retryDelay = 2000; // 5-10 seconds
                     console.log(`Waiting ${retryDelay}ms after VPN rotation...`);
                     await new Promise(resolve => setTimeout(resolve, retryDelay));
                     
                     throw new Error('429 received - VPN rotated for next attempt');
                 }
                 throw directError;
             }
        // }
        
        // For other proxy errors, still throw
        if (proxyError.response && proxyError.response.status === 429) {
            console.log('Still getting 429 even with proxy - may need to wait longer');
            throw new Error('429 received');
        }
        if (proxyError.code === 'ECONNABORTED') {
            console.log('Proxy request timed out');
            throw new Error('Proxy timeout');
        }
        console.error('Proxy request error:', proxyError.message);
        throw proxyError;
    // }
}

// Email configuration
const emailSender = 'bddondev@gmail.com';
const emailPassword = 'tnjt vfgf ksjw kdtn';
const recipients = ['bddon466@gmail.com', 'cordygm@gmail.com'];
const subject = '🏕️✅ Camping Reservation Found ✅🏕️';

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailSender,
        pass: emailPassword
    }
});

// Send email when campsite is found
async function sendEmail(siteId, siteName) {
    const mailOptions = {
        from: emailSender,
        to: recipients.join(', '),
        subject: subject,
        text: `Availability at ${siteName}. Go to https://www.recreation.gov/camping/campsites/${siteId} to reserve`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Send status email
async function sendStatusEmail(message) {
    const mailOptions = {
        from: emailSender,
        to: recipients.join(', '),
        subject: `🏃‍♂️ ${message} 🏃‍♂️`,
        text: 'Campsite checker is running.'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Status email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending status email:', error);
    }
}

// Check campsite availability for the specified date range
function checkAvailability(data) {
    const { startDate, endDate } = parseDateArguments();
    const campsites = data.campsites;
    
    // Generate array of dates to check (inclusive)
    const datesToCheck = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        // Format date as ISO string like "2024-05-25T00:00:00Z"
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}T00:00:00Z`;
        datesToCheck.push(dateKey);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Checking availability for dates: ${datesToCheck.join(', ')}`);
    
    // Check each campsite
    for (const [campsiteId, campsite] of Object.entries(campsites)) {
        const availabilities = campsite.availabilities;
        const campsiteType = campsite.campsite_type;
        const siteNumber = campsite.site;
        
        // Only check STANDARD NONELECTRIC sites (like the Python version)
        if (campsiteType === 'STANDARD NONELECTRIC') {
            // Check if all dates in the range are available
            const allDatesAvailable = datesToCheck.every(dateKey => 
                availabilities[dateKey] === 'Available'
            );
            
            if (allDatesAvailable) {
                const startDateStr = startDate.toLocaleDateString();
                const endDateStr = endDate.toLocaleDateString();
                console.log(`🎉 Campsite ${siteNumber} is available from ${startDateStr} to ${endDateStr}!`);
                return {
                    available: true,
                    campsite: campsite,
                    dates: datesToCheck
                };
            }
        }
    }
    
    console.log('No available campsites found for the specified date range.');
    return {
        available: false,
        campsite: null,
        dates: datesToCheck
    };
}

// Dismiss browser upgrade overlay if present
async function dismissBrowserOverlay() {
    console.log('Checking for browser upgrade overlay...');
    
    try {
        // Wait a moment for the overlay to appear if it's going to
        await driver.sleep(2000);
        
        // Look for the overlay by its ID
        const overlay = await driver.findElement(By.id('buorg'));
        
        if (overlay) {
            console.log('Browser upgrade overlay detected, looking for ignore button...');
            
            // Find and click the "Ignore" button
            const ignoreButton = await driver.findElement(By.id('buorgig'));
            await ignoreButton.click();
            
            console.log('✅ Browser upgrade overlay dismissed');
            
            // Wait a moment for the overlay to disappear
            await driver.sleep(1000);
        }
        
    } catch (error) {
        // Overlay not present or already dismissed - this is normal
        console.log('No browser upgrade overlay found (this is normal)');
    }
}

// Sign in to recreation.gov
async function signIn() {
    console.log('Starting sign in process...');
    
    try {
        // Click the log in button
        console.log('Clicking log in button...');
        const loginButton = await driver.findElement(By.xpath('//*[@id="ga-global-nav-log-in-link"]'));
        await loginButton.click();
        
        // Wait a moment for the login form to load
        await driver.sleep(1000);
        
        // Enter email
        console.log('Entering email...');
        const emailInput = await driver.findElement(By.id('email'));
        await emailInput.clear();
        await emailInput.sendKeys('bddon466@gmail.com');
        await driver.sleep(500);

        
        // Enter password
        console.log('Entering password...');
        const passwordInput = await driver.findElement(By.id('rec-acct-sign-in-password'));
        await passwordInput.clear();
        await passwordInput.sendKeys('Bhead123!');
        await driver.sleep(500);

        // Click the login submit button
        console.log('Clicking login submit button...');
        const submitButton = await driver.findElement(By.className('rec-acct-sign-in-btn'));
        await submitButton.click();
        
        // Wait for login to complete
        await driver.sleep(500);
        
        console.log('Sign in process completed');
        
    } catch (error) {
        console.error('Error during sign in:', error);
        throw error;
    }
}

// Initialize browser with Chrome driver
async function initBrowser() {
    console.log('Initializing browser...');
    
    try {
        // Set up Chrome options
        const chromeOptions = new chrome.Options();
        
        // Add some common options for better compatibility
        chromeOptions.addArguments('--no-sandbox');
        chromeOptions.addArguments('--disable-dev-shm-usage');
        chromeOptions.addArguments('--disable-gpu');
        
        // Optional: Run in headless mode (uncomment if you don't want to see the browser)
        // chromeOptions.addArguments('--headless');
        
        // Build the driver
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .build();
        
        console.log('Browser initialized successfully');
        
        // Navigate to recreation.gov like the Python version
        await driver.get('https://www.recreation.gov');
        console.log('Navigated to recreation.gov');
        
        // Check for and dismiss browser upgrade overlay
        await dismissBrowserOverlay();
        
        // Sign in to the account
        await signIn();
        
        return driver;
        
    } catch (error) {
        console.error('Error initializing browser:', error);
        throw error;
    }
}

// Grab reservation for the specified campground and dates
async function grabReservation(siteId, campsite) {
    console.log(`Starting reservation process for campground ${siteId}...`);
    
    if (!driver) {
        throw new Error('Browser not initialized. Call initBrowser() first.');
    }
    
    try {
        const { startDate, endDate } = parseDateArguments();
        
        // Navigate to the campground page
        const campgroundUrl = `https://www.recreation.gov/camping/campgrounds/${siteId}`;
        console.log(`Navigating to ${campgroundUrl}...`);
        await driver.get(campgroundUrl);
        
        // Wait for page to load
        await driver.sleep(1500);
        
        // Format dates for aria-label matching
        const formatDateForLabel = (date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const day = date.getDate();
            const year = date.getFullYear();
            return `${month} ${day}, ${year}`;
        };
        
        const startDateLabel = formatDateForLabel(startDate);
        const endDateLabel = formatDateForLabel(endDate);
        
        // Check if this is a single night reservation (endDate is one day after startDate)
        const oneNightReservation = (endDate.getTime() - startDate.getTime()) === (24 * 60 * 60 * 1000);
        console.log(`Single night reservation: ${oneNightReservation}`);
        
        let availableButtons;
        let startButton = null;
        let endButton = null;
        
        console.log(`Looking for buttons in campsite row: ${campsite.campsite_id}`);
        availableButtons = await driver.findElements(
            By.xpath(`//tr[@id="${campsite.campsite_id}"]//td[@class="available"]//button[@class="rec-availability-date"]`)
        );
        console.log(`Found ${availableButtons.length} available date buttons for site ${campsite.site}`);
    
        // Search through available buttons to find our target dates
        for (const button of availableButtons) {
            const ariaLabel = await button.getAttribute('aria-label');
            console.log(`Checking button: ${ariaLabel}`);
            
            // If we have a specific campsite, also verify the site number in the aria-label
            const siteMatch = campsite ? ariaLabel.includes(`Site ${campsite.site}`) : true;
            
            if (ariaLabel.includes(startDateLabel) && ariaLabel.includes('is available') && siteMatch) {
                startButton = button;
                console.log(`Found start date button: ${ariaLabel}`);
            }
            
            // Only look for end button if it's not a single night reservation
            if (!oneNightReservation && ariaLabel.includes(endDateLabel) && ariaLabel.includes('is available') && siteMatch) {
                endButton = button;
                console.log(`Found end date button: ${ariaLabel}`);
            }
        }
        
        // Check if we found the required buttons
        if (!startButton) {
            throw new Error(`Could not find available button for start date: ${startDateLabel}`);
        }
        
        if (!oneNightReservation && !endButton) {
            throw new Error(`Could not find available button for end date: ${endDateLabel}`);
        }
        
        
        // Click the start date button using JavaScript (works even if not visible)
        console.log(`Clicking start date button for ${startDateLabel}...`);
        await driver.executeScript("arguments[0].click();", startButton);
        await driver.sleep(1000);
        
        // Only click end date button for multi-night reservations
        if (!oneNightReservation) {
            await driver.executeScript("arguments[0].click();", endButton);
            await driver.sleep(1000);
        }
        
        // Look for and click the "Add to Cart" button
        console.log('Looking for Add to Cart button...');
        try {
            // Try primary selector first
            let addToCartButton;
    
                // Fallback: try finding by button text content
                console.log('Primary selector failed, trying fallback...');
                addToCartButton = await driver.findElement(
                    By.xpath('//button[contains(@class, "availability-page-book-now-button-tracker")]//span[text()="Add to Cart"]/..')
                );
            
            
            console.log('Clicking Add to Cart button...');
            await driver.executeScript("arguments[0].click();", addToCartButton);
            await driver.sleep(1000);
            
            console.log('✅ Reservation process initiated successfully!');
            
        } catch (bookButtonError) {
            console.warn('Could not find Add to Cart button, reservation may need manual completion');
            throw bookButtonError;
        }
        
    } catch (error) {
        console.error('Error during reservation process:', error);
        throw error;
    }
}

// Refresh browser to keep session active
async function refreshBrowser() {
    if (driver) {
        console.log('Refreshing browser to keep session active...');
        try {
            await driver.navigate().refresh();
            console.log('Browser refreshed successfully');

            const loginButton = await driver.findElement(By.xpath('//*[@id="ga-global-nav-log-in-link"]'));
            if (loginButton) {
                await resetBrowser()
            }
            
            // Wait a moment for the page to load
            await driver.sleep(1000);
            
        } catch (error) {
            console.error('Error refreshing browser:', error);
        }
    } else {
        console.warn('No active browser session to refresh');
    }
}

async function resetBrowser() {
   await closeBrowser()
   await initBrowser()
}

// Close browser (utility function)
async function closeBrowser() {
    if (driver) {
        console.log('Closing browser...');
        await driver.quit();
        driver = null;
        console.log('Browser closed');
    }
}

// Cleanup function for graceful shutdown
async function cleanup() {
    console.log('Cleaning up resources...');
    await closeBrowser();
    await vpnManager.cleanup();
    console.log('Cleanup completed');
}


// Helper function to merge two API responses (for cross-month date ranges)
function mergeApiResponses(response1, response2) {
    const mergedData = {
        campsites: {}
    };
    
    // Start with all campsites from response1
    for (const [campsiteId, campsite] of Object.entries(response1.campsites)) {
        mergedData.campsites[campsiteId] = {
            ...campsite,
            availabilities: { ...campsite.availabilities },
            quantities: { ...campsite.quantities }
        };
    }
    
    // Merge in data from response2
    for (const [campsiteId, campsite] of Object.entries(response2.campsites)) {
        if (mergedData.campsites[campsiteId]) {
            // Campsite exists in both responses, merge availabilities and quantities
            Object.assign(mergedData.campsites[campsiteId].availabilities, campsite.availabilities);
            Object.assign(mergedData.campsites[campsiteId].quantities, campsite.quantities);
        } else {
            // Campsite only exists in response2, add it completely
            mergedData.campsites[campsiteId] = {
                ...campsite,
                availabilities: { ...campsite.availabilities },
                quantities: { ...campsite.quantities }
            };
        }
    }
    
    return mergedData;
}

// Send status report email with bot statistics
async function sendStatusReport(loopCount, successfulRequests, errorCount, errorLog, startTime, campgrounds) {
    const dates = parseDateArguments();
    const runtime = Math.floor((new Date() - startTime) / 1000 / 60); // minutes
    const statusMessage = `
🏕️ Camping Bot Status Report - Loop ${loopCount}

📊 Statistics:
• Runtime: ${runtime} minutes
• Successful requests: ${successfulRequests}
• Total errors: ${errorCount}
• Success rate: ${successfulRequests > 0 ? ((successfulRequests / (successfulRequests + errorCount)) * 100).toFixed(1) : 0}%

${errorCount > 0 ? `
❌ Recent Errors (last ${Math.min(errorLog.length, 10)}):
${errorLog.slice(-10).map(err => `• ${err.timestamp}: ${err.error} (Loop ${err.loop})`).join('\n')}
` : '✅ No errors recorded!'}

🎯 Monitoring: ${Object.values(campgrounds).join(', ')}
📅 Dates: ${dates.startDate.toDateString()} - ${dates.endDate.toDateString()}
    `.trim();
    
    await sendStatusEmail(statusMessage);
}

module.exports = {
    sendEmail,
    sendStatusEmail,
    sendStatusReport,
    requestCampsite,
    parseDateArguments,
    checkAvailability,
    mergeApiResponses,
    initBrowser,
    signIn,
    grabReservation,
    refreshBrowser,
    resetBrowser,
    closeBrowser,
    cleanup,
    vpnManager
};
