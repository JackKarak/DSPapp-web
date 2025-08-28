#!/bin/bash

# Google Service Account Setup Script for DSP App
# This script helps you properly upload your Google service account to Supabase secrets

echo "🔐 Google Service Account Setup for DSP App"
echo "============================================="
echo ""

# Check if the service account file exists
if [ ! -f "google-service-account.json" ]; then
    echo "❌ Error: google-service-account.json file not found in current directory"
    echo ""
    echo "Please follow these steps:"
    echo "1. Download your Google service account JSON file from Google Cloud Console"
    echo "2. Rename it to 'google-service-account.json'"
    echo "3. Place it in this directory (C:\Users\jackp\DSPapp\DSPapp)"
    echo "4. Run this script again"
    echo ""
    echo "📝 Remember: This file contains sensitive credentials and should never be committed to git!"
    exit 1
fi

echo "✅ Found google-service-account.json file"
echo ""

# Validate JSON format
echo "🔍 Validating JSON format..."
if python -m json.tool google-service-account.json > /dev/null 2>&1; then
    echo "✅ JSON format is valid"
else
    echo "❌ Error: Invalid JSON format in google-service-account.json"
    echo "Please check the file and ensure it's valid JSON"
    exit 1
fi

# Extract some basic info (without showing sensitive data)
echo "📋 Service Account Info:"
client_email=$(python -c "import json; data=json.load(open('google-service-account.json')); print(data.get('client_email', 'Not found'))")
project_id=$(python -c "import json; data=json.load(open('google-service-account.json')); print(data.get('project_id', 'Not found'))")

echo "   📧 Client Email: $client_email"
echo "   🏗️ Project ID: $project_id"
echo ""

# Upload to Supabase secrets
echo "🚀 Uploading to Supabase secrets..."
supabase secrets set GOOGLE_SERVICE_ACCOUNT="$(cat google-service-account.json)"

if [ $? -eq 0 ]; then
    echo "✅ Successfully uploaded service account to Supabase secrets!"
    echo ""
    echo "🧹 For security, you should now:"
    echo "1. Delete the google-service-account.json file from this directory"
    echo "2. Test the Google Calendar integration"
    echo ""
    echo "Would you like to delete the local file now? (y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        rm google-service-account.json
        echo "✅ Local service account file deleted"
    else
        echo "⚠️ Remember to delete google-service-account.json manually for security!"
    fi
else
    echo "❌ Failed to upload to Supabase secrets"
    echo "Please make sure you're logged in to Supabase CLI and try again"
fi

echo ""
echo "🎉 Setup complete! You can now test the Google Calendar integration."
