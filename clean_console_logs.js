const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Function to clean console logs from a file
function cleanConsoleLogsFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove console.log, console.error, console.warn, console.info statements
    // But keep console.error for actual error handling
    content = content.replace(/\s*console\.log\([^;]*\);?\s*\n/g, '');
    content = content.replace(/\s*console\.warn\([^;]*\);?\s*\n/g, '');
    content = content.replace(/\s*console\.info\([^;]*\);?\s*\n/g, '');
    content = content.replace(/\s*console\.debug\([^;]*\);?\s*\n/g, '');
    
    // Only remove console.error that are clearly debug logs (not in catch blocks)
    // This is more conservative - we'll manually review these
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Find all TypeScript and JavaScript files in the project
async function cleanAllFiles() {
  try {
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: process.cwd(),
      ignore: ['node_modules/**', 'dist/**', 'build/**', '.expo/**']
    });    files.forEach(file => {
      const fullPath = path.resolve(file);
      cleanConsoleLogsFromFile(fullPath);
    });  } catch (error) {
    console.error('💥 Error during cleanup:', error.message);
  }
}

cleanAllFiles();
