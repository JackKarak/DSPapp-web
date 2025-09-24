# PowerShell script to clean up corrupted emojis

$filePath = "c:\Users\jackp\DSPapp\DSPapp\app\(tabs)\account.tsx"
$content = Get-Content $filePath -Raw

# Remove all icon properties from achievements
$content = $content -replace ", icon: '[^']*'", ""

# Clean up specific corrupted emojis in text
$content = $content.Replace('ðŸ"', 'Feedback')
$content = $content.Replace('ðŸ"„', '')
$content = $content.Replace('ðŸ'¤', '')
$content = $content.Replace('ðŸ†"', '')

# Save the cleaned content
$content | Set-Content $filePath -Encoding UTF8

Write-Host "Emoji cleanup completed!"
