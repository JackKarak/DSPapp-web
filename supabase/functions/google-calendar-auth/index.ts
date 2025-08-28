import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Starting Google Calendar authentication...')

    // Get the service account from environment
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT environment variable not set')
      throw new Error('Service account configuration missing')
    }

    console.log('✅ Service account found, length:', serviceAccountJson.length)
    console.log('📝 First 100 chars:', serviceAccountJson.substring(0, 100) + '...')
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson)
    } catch (parseError) {
      console.error('❌ Failed to parse service account JSON:', parseError)
      console.error('📝 Raw JSON (first 200 chars):', serviceAccountJson.substring(0, 200))
      throw new Error(`Invalid service account JSON format: ${parseError}`)
    }
    
    // Validate required fields
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('❌ Invalid service account format')
      throw new Error('Invalid service account format')
    }

    console.log(`✅ Service account parsed: ${serviceAccount.client_email}`)

    // Create JWT manually without external libraries
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: exp,
      iat: now
    };

    // Base64URL encode
    const base64UrlEncode = (obj: any) => {
      return btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    console.log('✅ JWT header and payload created');

    // Prepare private key
    let privateKey = serviceAccount.private_key;
    
    // Handle escaped newlines in the private key
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Ensure proper format
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }

    console.log('✅ Private key formatted');

    // Extract the key data
    const keyData = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s+/g, '');

    console.log(`✅ Key data extracted, length: ${keyData.length}`);

    // Convert to binary
    let binaryKey;
    try {
      binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
      console.log(`✅ Key converted to binary, length: ${binaryKey.length}`);
    } catch (error) {
      console.error('❌ Failed to decode private key:', error);
      throw new Error('Invalid private key format');
    }

    // Import the crypto key
    let cryptoKey;
    try {
      cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );
      console.log('✅ Crypto key imported successfully');
    } catch (error) {
      console.error('❌ Failed to import crypto key:', error);
      throw new Error('Failed to import private key');
    }

    // Sign the token
    const encoder = new TextEncoder();
    const data = encoder.encode(unsignedToken);
    
    let signature;
    try {
      signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
      console.log('✅ Token signed successfully');
    } catch (error) {
      console.error('❌ Failed to sign token:', error);
      throw new Error('Failed to sign JWT');
    }

    // Base64URL encode signature
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const jwt = `${unsignedToken}.${encodedSignature}`;
    console.log(`✅ Complete JWT created, length: ${jwt.length}`);

    // Exchange JWT for access token
    console.log('🔄 Exchanging JWT for access token...');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    console.log(`📡 Token response status: ${tokenResponse.status}`);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Access token received successfully');

    return new Response(
      JSON.stringify({ 
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('💥 Edge Function Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})
