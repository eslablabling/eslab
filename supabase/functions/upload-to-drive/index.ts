import { serve } from "https://deno.land/std@0.168/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ambil isi kunci JSON Google Service Account dari Environment Variable Supabase secara aman
    const serviceAccountStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountStr) {
      return new Response(
        JSON.stringify({ error: 'Google Service Account credentials missing in Supabase secrets' }), 
        { status: 500, headers: corsHeaders }
      );
    }
    const serviceAccount = JSON.parse(serviceAccountStr);

    // 1. Generate JWT Token untuk meminta Google Access Token
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const folderId = "1ztYUlPERtgarjEuZPp1D_lAkzR54Ey62";

    const contentType = req.headers.get("content-type") || "";

    // Skenario A: Sinkronisasi (Membaca Daftar File di Folder Google Drive)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.action === 'list') {
        const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
        const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=100`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });

        if (!listResponse.ok) {
          const errText = await listResponse.text();
          throw new Error("Gagal membaca daftar file dari Drive: " + errText);
        }

        const listResult = await listResponse.json();
        return new Response(JSON.stringify(listResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Skenario B: Unggah File Baru ke Google Drive
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const uploadFormData = new FormData();
    uploadFormData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    uploadFormData.append('file', file);

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      body: uploadFormData
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error("Gagal mengunggah file ke Google Drive: " + errText);
    }

    const result = await uploadResponse.json();
    return new Response(
      JSON.stringify({ webViewLink: `https://drive.google.com/file/d/${result.id}/view?usp=sharing` }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: corsHeaders }
    );
  }
});

// Helper Crypto API untuk otentikasi Google Service Account secara native di Deno
async function getGoogleAccessToken(serviceAccountJson: any) {
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const jwtClaim = {
    iss: serviceAccountJson.client_email,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccountJson.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const textEncoder = new TextEncoder();
  const encodedHeader = btoa(JSON.stringify(jwtHeader)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedClaim = btoa(JSON.stringify(jwtClaim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signInput = `${encodedHeader}.${encodedClaim}`;

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, textEncoder.encode(signInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signInput}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error("Gagal menukar JWT ke Token Akses Google: " + errText);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
