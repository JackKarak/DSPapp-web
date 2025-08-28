# Marketing Officer Newsletter URL Management

## Overview
The marketing officer can now dynamically manage the newsletter URL that appears in the newsletter tab. This makes the web integration more flexible and allows for easy updates without code changes.

## How It Works

### For Marketing Officers
1. Navigate to the Marketing tab in the officer section
2. Scroll down to the "Newsletter URL Management" section
3. Enter the new newsletter URL in the text field
4. Click "Update Newsletter URL"
5. The new URL will be immediately available in the newsletter tab

### Technical Implementation
- The newsletter URL is stored in the `app_settings` table with key `newsletter_url`
- The newsletter tab (`newsletter.tsx`) dynamically fetches this URL on load
- If the URL isn't found or there's an error, it falls back to the default URL
- The marketing officer interface includes URL validation for proper formatting

### Database Setup
Run the migration file `20250201_create_app_settings.sql` to create the necessary table structure:

```sql
-- This creates the app_settings table with proper permissions
-- Officers (including marketing officers) can update settings
-- All authenticated users can read settings
```

### Features
- **Dynamic URL Updates**: No need to redeploy the app to change newsletter links
- **Fallback Protection**: Always shows a newsletter even if the settings table doesn't exist yet
- **URL Validation**: Ensures proper URL format before saving
- **Permission Control**: Only officers can modify settings
- **Real-time Updates**: Changes are immediately reflected in the newsletter tab

### Testing
1. Test with a valid newsletter URL (like Mailchimp links)
2. Verify the newsletter tab loads the new URL
3. Test error handling with invalid URLs
4. Confirm fallback behavior if the database table doesn't exist

This enhancement makes the DSP app more maintainable and gives marketing officers the flexibility they need to manage newsletter content effectively.
