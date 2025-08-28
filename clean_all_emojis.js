const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(tabs)', 'account.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

console.log('🧹 Cleaning remaining corrupted emojis...');

// Clean up all remaining corrupted emojis by replacing with appropriate text or removing them
const replacements = [
  // Feedback button and UI elements
  { from: /ðŸ"/g, to: 'Feedback' },
  
  // Console log emojis - remove them entirely
  { from: /ðŸ"„\s*/g, to: '' },
  { from: /ðŸ'¤\s*/g, to: '' },
  { from: /ðŸ†"\s*/g, to: '' },
  { from: /ðŸ"\s*/g, to: '' },
  { from: /ðŸ'¥\s*/g, to: '' },
  
  // Stats and UI icons - replace with simple text
  { from: /ðŸ†"/g, to: 'Stats' },
  { from: /ðŸ"¥"/g, to: 'Streak' },
  { from: /ðŸ"…"/g, to: 'Events' },
  { from: /ðŸ"Š"/g, to: 'Chart' },
  
  // Profile section icons - replace with simple text
  { from: /ðŸ"/g, to: 'Edit' },
  { from: /ðŸ'¤/g, to: 'Profile' },
  
  // File and attachment icons
  { from: /ðŸ"Ž/g, to: 'Add' },
  { from: /ðŸ"„/g, to: 'File' },
  { from: /ðŸ"§/g, to: 'Send' },
  
  // Warning icon
  { from: /âš\s*ï¸\s*/g, to: '⚠️' },
  
  // Any remaining corrupted emojis - just remove them
  { from: /[ðâ][^'\s]*\s*/g, to: '' }
];

// Apply all replacements
replacements.forEach(({ from, to }) => {
  const beforeCount = (content.match(from) || []).length;
  content = content.replace(from, to);
  const afterCount = (content.match(from) || []).length;
  if (beforeCount > 0) {
    console.log(`✅ Replaced ${beforeCount} instances of corrupted emoji with "${to}"`);
  }
});

// Write the cleaned content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('🎉 All emoji cleanup completed successfully!');
console.log('📋 Summary: Removed all corrupted emoji metadata from achievements and UI elements');
