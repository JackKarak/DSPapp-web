// Clean lines for account.tsx to replace corrupted sections

// For error display (line ~1150):
// OLD: <Text style={styles.errorText}>âš ï¸ {error}</Text>
// NEW: <Text style={styles.errorText}>{emojiText('WARNING', error)}</Text>

// For profile subtitle (line ~1169):
// OLD: {pledgeClass ? `${pledgeClass} â€¢ ${major || 'No Major'}` : 'Loading...'}
// NEW: {pledgeClass ? `${pledgeClass} • ${major || 'No Major'}` : 'Loading...'}

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', '(tabs)', 'account.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace corrupted error text
content = content.replace(
  /style={styles\.errorText}>[^{]*{error}<\/Text>/,
  'style={styles.errorText}>{emojiText(\'WARNING\', error)}</Text>'
);

// Replace corrupted bullet
content = content.replace(/â€¢/g, '•');

// Replace any other common corrupted emoji sequences
content = content.replace(/âš\s*ï¸/g, '');
content = content.replace(/â[^\s\w]/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Emoji corruption fixed!');
