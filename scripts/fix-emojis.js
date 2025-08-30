// Helper script to fix emoji corruption in account.tsx
// This will clean up corrupted emoji characters and replace them with proper ones

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', '(tabs)', 'account.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define replacements for corrupted emojis
const emojiReplacements = [
  // Warning emoji corruption
  { corrupted: /â[šï¸\s]*{error}/g, replacement: "{emojiText('WARNING', error)}" },
  // Other common corruptions
  { corrupted: /â[^\s]*\s*/g, replacement: '' },
  { corrupted: /ï[^\s]*\s*/g, replacement: '' },
  // Fix any remaining corrupted characters that appear as question marks or boxes
  { corrupted: /\?{2,}/g, replacement: '' },
  { corrupted: /â/g, replacement: '' }
];

// Apply all replacements
emojiReplacements.forEach(({ corrupted, replacement }) => {
  content = content.replace(corrupted, replacement);
});

// Write the cleaned content back
fs.writeFileSync(filePath, content, 'utf8');