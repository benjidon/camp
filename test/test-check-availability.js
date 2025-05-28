const { checkAvailability } = require('../camp-tools.js');
const fs = require('fs');

// Sample data that simulates a response with some available dates
const sampleDataWithAvailability = {
    "campsites": {
        "90022": {
            "campsite_id": "90022",
            "site": "28",
            "loop": "POTWISHA ",
            "campsite_reserve_type": "Site-Specific",
            "availabilities": {
                "2025-05-01T00:00:00Z": "Reserved",
                "2025-05-02T00:00:00Z": "Reserved",
                "2025-05-25T00:00:00Z": "Available",
                "2025-05-26T00:00:00Z": "Available",
                "2025-05-27T00:00:00Z": "Available",
                "2025-05-28T00:00:00Z": "Available",
                "2025-05-29T00:00:00Z": "Reserved",
                "2025-05-30T00:00:00Z": "Reserved",
                "2025-05-31T00:00:00Z": "Reserved"
            },
            "campsite_type": "STANDARD NONELECTRIC",
            "type_of_use": "Overnight",
            "min_num_people": 1,
            "max_num_people": 6,
            "capacity_rating": "Single"
        },
        "90025": {
            "campsite_id": "90025",
            "site": "30",
            "loop": "POTWISHA ",
            "campsite_reserve_type": "Site-Specific",
            "availabilities": {
                "2025-05-01T00:00:00Z": "Reserved",
                "2025-05-02T00:00:00Z": "Reserved",
                "2025-05-25T00:00:00Z": "Reserved",
                "2025-05-26T00:00:00Z": "Available",
                "2025-05-27T00:00:00Z": "Available",
                "2025-05-28T00:00:00Z": "Reserved",
                "2025-05-29T00:00:00Z": "Reserved",
                "2025-05-30T00:00:00Z": "Reserved",
                "2025-05-31T00:00:00Z": "Reserved"
            },
            "campsite_type": "STANDARD NONELECTRIC",
            "type_of_use": "Overnight",
            "min_num_people": 1,
            "max_num_people": 6,
            "capacity_rating": "Single"
        }
    },
    "count": 2
};

async function testCheckAvailability() {
    console.log('Testing checkAvailability function...\n');
    
    try {
        console.log('1. Testing with sample data that has availability...');
        const result = checkAvailability(sampleDataWithAvailability);
        
        if (result.available) {
            console.log('✅ Found available campsite!');
            console.log(`   Site: ${result.campsite.site}`);
            console.log(`   Dates checked: ${result.dates.join(', ')}`);
        } else {
            console.log('❌ No availability found');
        }
        
        console.log('\n2. Testing with original sample data (all reserved)...');
        // Load the original sample data
        const originalSampleData = JSON.parse(fs.readFileSync('../sampleresponse.json', 'utf8'));
        const result2 = checkAvailability(originalSampleData);
        
        if (result2.available) {
            console.log('✅ Found available campsite!');
            console.log(`   Site: ${result2.campsite.site}`);
        } else {
            console.log('❌ No availability found (expected for sample data)');
        }
        
        console.log('\n✅ checkAvailability function tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCheckAvailability().catch(console.error); 