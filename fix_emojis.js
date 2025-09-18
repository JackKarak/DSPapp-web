const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'app', '(tabs)', 'account.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Map of corrupted emojis to proper ones
const emojiMap = {
  'ðŸ"¥': '🔥', // fire
  'ðŸ'ª': '💪', // muscle
  'âš¡': '⚡', // lightning
  'ðŸŽ¯': '🎯', // target
  'ðŸƒ': '🏃', // runner
  'ðŸ¥ˆ': '🥈', // silver medal
  'ðŸ¥‡': '🥇', // gold medal
  'ðŸ'Ž': '💎', // diamond
  'ðŸ"š': '📚', // books
  'ðŸ†': '🏆', // trophy
  'ðŸ''': '👑', // crown
  'â°': '⏰', // alarm clock
  'ðŸŒŸ': '🌟', // star
  'ðŸ"…': '📅', // calendar
  'â­': '⭐', // star
  'ðŸ¤': '🤝', // handshake
  'ðŸŽ–ï¸': '🎖️', // medal
  'ðŸ"': '📝' // memo/note
};

// Replace all corrupted emojis
for (const [corrupted, fixed] of Object.entries(emojiMap)) {
  content = content.split(corrupted).join(fixed);
}

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Emojis fixed successfully!');
