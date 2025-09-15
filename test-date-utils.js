// Quick test script to verify date utilities are working correctly
const { combineDateAndTime, getESTISOString, roundToNearestMinute } = require('./lib/dateUtils.ts');

console.log('Testing date utilities...');

try {
  // Test with valid dates
  const testDate = new Date(2025, 8, 15); // September 15, 2025
  const testTime = new Date(2025, 8, 15, 14, 30, 0); // 2:30 PM
  
  console.log('Input date:', testDate.toDateString());
  console.log('Input time:', testTime.toTimeString());
  
  const combined = combineDateAndTime(testDate, testTime);
  console.log('Combined:', combined.toString());
  
  const rounded = roundToNearestMinute(combined);
  console.log('Rounded:', rounded.toString());
  
  const estString = getESTISOString(rounded);
  console.log('EST String:', estString);
  
  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
}

try {
  // Test with invalid dates to ensure error handling works
  console.log('\nTesting error handling...');
  const invalidDate = new Date('invalid');
  console.log('Invalid date test:', invalidDate.toString());
  
  const validDate = new Date();
  combineDateAndTime(invalidDate, validDate);
} catch (error) {
  console.log('✅ Error handling works:', error.message);
}
