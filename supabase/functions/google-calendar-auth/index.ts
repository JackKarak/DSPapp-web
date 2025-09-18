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
    
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT environment variable not set')
      throw new Error('Service account not configured')
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

    // Create JWT
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
    
    // Remove header and footer
    privateKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\s/g, '');
    
    console.log('✅ Private key formatted');

    // Decode the base64 private key
    const binaryKey = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
    let keyData;
    
    try {
      keyData = binaryKey;
      console.log(`✅ Key data extracted, length: ${keyData.length}`);
    } catch (error) {
      try {
        const keyDataDecoded = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
        console.log(`✅ Key converted to binary, length: ${keyDataDecoded.length}`);
        keyData = keyDataDecoded;
      } catch (error) {
        console.error('❌ Failed to decode private key:', error);
        throw new Error(`Failed to decode private key: ${error}`);
      }
    }

    // Import the private key
    let cryptoKey;
    try {
      cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyData,
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
      throw new Error(`Failed to import private key: ${error}`);
    }

    // Sign the token
    let signature;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(unsignedToken);
      const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
      signature = new Uint8Array(signatureBuffer);
      console.log('✅ Token signed successfully');
    } catch (error) {
      console.error('❌ Failed to sign token:', error);
      throw new Error(`Failed to sign token: ${error}`);
    }

    // Base64URL encode the signature
    const encodedSignature = btoa(String.fromCharCode(...signature))
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
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('💥 Edge Function Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})
