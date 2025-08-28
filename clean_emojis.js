const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(tabs)', 'account.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove all icon properties from achievements (using regex)
content = content.replace(/, icon: '[^']*'/g, '');

// Clean up specific corrupted emojis in feedback button and console logs
content = content.replace(/ðŸ"/g, 'Feedback');
content = content.replace(/ðŸ"„/g, '');
content = content.replace(/ðŸ'¤/g, '');
content = content.replace(/ðŸ†"/g, '');
content = content.replace(/ðŸ"/g, '');

// Write the cleaned content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Emoji cleanup completed successfully!');
