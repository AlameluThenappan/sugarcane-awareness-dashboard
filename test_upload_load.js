const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');

console.log("Generating 3000 rows of synthetic verifier data...");

const rows = [];
const crops = ["Sugarcane CO-86032", "Sugarcane CO-0238", "Sugarcane CO-VSI-8005"];
const villages = ["Village A", "Village B", "Village C", "Village D"];
const blocks = ["Block 1", "Block 2"];

for (let i = 1; i <= 3000; i++) {
  // Generate a random farmer
  const isApproved = Math.random() < 0.95; // 95% approved
  const isMissingYield = Math.random() < 0.05; // 5% have no yield

  rows.push({
    "collectionDate": new Date().toISOString(),
    "uniqueID": crypto.randomUUID(),
    "Name of the Employee": "Test_Verifier",
    "Designation": "Verifier",
    "Name of the Organization": "AgriCorp",
    "State": "Test State",
    "Farmer Code": `FARM-${10000 + i}`,
    "Name of the Farmer": `Test Farmer ${i}`,
    "Name of the Village": villages[Math.floor(Math.random() * villages.length)],
    "Block name": blocks[Math.floor(Math.random() * blocks.length)],
    "District name": "Test District",
    "Age": 30 + Math.floor(Math.random() * 30),
    "Education": "High School",
    "Mobile Number of the Farmer": "9999999999",
    "Select Year": 2026,
    "Crop": "Sugarcane",
    "Select Crop Type": crops[Math.floor(Math.random() * crops.length)],
    "total_acreage": 2 + Math.random() * 8,
    "largest_plot_acres": 1 + Math.random() * 5,
    "yield_tonnes_ha": isMissingYield ? null : 80 + Math.random() * 40,
    "tna": isMissingYield ? null : 100 + Math.random() * 60,
    "urea_kg": Math.floor(Math.random() * 200),
    "dap_kg": Math.floor(Math.random() * 100),
    "farm_yard_manure_kg": Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : 0,
    "_validation_status": isApproved ? "Approved" : "Rejected",
    "irrigation_type": "Drip",
    "fertilizer_application_method": "Broadcasting"
  });
}

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

const fileName = 'load_test_3000_rows.xlsx';
XLSX.writeFile(workbook, fileName);

console.log(`Successfully generated ${fileName} with ${rows.length} rows.`);
console.log("You can now log into the Verifier Portal and upload this file to test the batching logic.");
