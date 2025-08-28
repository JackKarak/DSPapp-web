# Google Service Account Setup Script for DSP App (PowerShell)
# This script helps you properly upload your Google service account to Supabase secrets

Write-Host "🔐 Google Service Account Setup for DSP App" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if the service account file exists
$serviceAccountFile = "google-service-account.json"
if (-not (Test-Path $serviceAccountFile)) {
    Write-Host "❌ Error: google-service-account.json file not found in current directory" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor Yellow
    Write-Host "1. Download your Google service account JSON file from Google Cloud Console"
    Write-Host "2. Rename it to 'google-service-account.json'"
    Write-Host "3. Place it in this directory (C:\Users\jackp\DSPapp\DSPapp)"
    Write-Host "4. Run this script again"
    Write-Host ""
    Write-Host "📝 Remember: This file contains sensitive credentials and should never be committed to git!" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found google-service-account.json file" -ForegroundColor Green
Write-Host ""

# Validate JSON format
Write-Host "🔍 Validating JSON format..." -ForegroundColor Blue
try {
    $serviceAccountContent = Get-Content $serviceAccountFile -Raw | ConvertFrom-Json
    Write-Host "✅ JSON format is valid" -ForegroundColor Green
    
    # Extract some basic info (without showing sensitive data)
    Write-Host "📋 Service Account Info:" -ForegroundColor Blue
    Write-Host "   📧 Client Email: $($serviceAccountContent.client_email)"
    Write-Host "   🏗️ Project ID: $($serviceAccountContent.project_id)"
    Write-Host ""
} catch {
    Write-Host "❌ Error: Invalid JSON format in google-service-account.json" -ForegroundColor Red
    Write-Host "Please check the file and ensure it's valid JSON"
    exit 1
}

# Upload to Supabase secrets
Write-Host "🚀 Uploading to Supabase secrets..." -ForegroundColor Blue
$jsonContent = Get-Content $serviceAccountFile -Raw

# Use supabase CLI to set the secret
$process = Start-Process -FilePath "supabase" -ArgumentList "secrets", "set", "GOOGLE_SERVICE_ACCOUNT=$jsonContent" -Wait -PassThru -NoNewWindow

if ($process.ExitCode -eq 0) {
    Write-Host "✅ Successfully uploaded service account to Supabase secrets!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧹 For security, you should now:" -ForegroundColor Yellow
    Write-Host "1. Delete the google-service-account.json file from this directory"
    Write-Host "2. Test the Google Calendar integration"
    Write-Host ""
    $response = Read-Host "Would you like to delete the local file now? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Remove-Item $serviceAccountFile -Force
        Write-Host "✅ Local service account file deleted" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Remember to delete google-service-account.json manually for security!" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to upload to Supabase secrets" -ForegroundColor Red
    Write-Host "Please make sure you're logged in to Supabase CLI and try again"
}

Write-Host ""
Write-Host "🎉 Setup complete! You can now test the Google Calendar integration." -ForegroundColor Green
