const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ambil kredensial OAuth dari Environment Variables Supabase secara aman
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

    if (!clientId || !clientSecret || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'OAuth credentials missing in Supabase secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    // 1. Tukarkan Refresh Token dengan Google Access Token
    const accessToken = await getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
    const folderId = "1ztYUlPERtgarjEuZPp1D_lAkzR54Ey62";

    const contentType = req.headers.get("content-type") || "";

    // Skenario A: Request JSON (Kueri List atau Delete)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      
      // Skenario A1: Mendapatkan daftar file di folder Google Drive
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
      
      // Skenario A2: Menghapus file di Google Drive (pindahkan ke tempat sampah)
      if (body.action === 'delete') {
        const fileId = body.fileId;
        if (!fileId) {
          return new Response(
            JSON.stringify({ error: 'No fileId provided' }), 
            { status: 400, headers: corsHeaders }
          );
        }

        // Kita gunakan PATCH drive/v3/files/fileId dengan body { trashed: true } agar aman (bisa dipulihkan dari Trash)
        const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ trashed: true })
        });

        if (!deleteResponse.ok) {
          const errText = await deleteResponse.text();
          throw new Error("Gagal membuang berkas ke tempat sampah Google Drive: " + errText);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Skenario A3: Mendapatkan metadata LIMS (file _lims_metadata.json)
      if (body.action === 'get_metadata') {
        const query = encodeURIComponent(`name = '_lims_metadata.json' and '${folderId}' in parents and trashed = false`);
        const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });

        if (!searchResponse.ok) {
          const errText = await searchResponse.text();
          throw new Error("Gagal mencari file metadata: " + errText);
        }

        const searchResult = await searchResponse.json();
        const files = searchResult.files || [];

        if (files.length === 0) {
          // File tidak ditemukan, kembalikan data kosong
          return new Response(JSON.stringify({ categories: [], documents: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const fileId = files[0].id;
        const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });

        if (!downloadResponse.ok) {
          const errText = await downloadResponse.text();
          throw new Error("Gagal mengunduh file metadata: " + errText);
        }

        const metadata = await downloadResponse.json();
        return new Response(JSON.stringify(metadata), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Skenario A4: Menyimpan/Memperbarui metadata LIMS (file _lims_metadata.json)
      if (body.action === 'save_metadata') {
        const metadataVal = body.metadata;
        if (!metadataVal) {
          return new Response(
            JSON.stringify({ error: 'No metadata provided' }), 
            { status: 400, headers: corsHeaders }
          );
        }

        const query = encodeURIComponent(`name = '_lims_metadata.json' and '${folderId}' in parents and trashed = false`);
        const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });

        if (!searchResponse.ok) {
          const errText = await searchResponse.text();
          throw new Error("Gagal mencari file metadata untuk disimpan: " + errText);
        }

        const searchResult = await searchResponse.json();
        const files = searchResult.files || [];
        let fileId = "";

        if (files.length > 0) {
          // Update file existing
          fileId = files[0].id;
          const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: { 
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadataVal)
          });

          if (!updateResponse.ok) {
            const errText = await updateResponse.text();
            throw new Error("Gagal memperbarui file metadata: " + errText);
          }
        } else {
          // Buat file baru
          const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: '_lims_metadata.json',
              parents: [folderId],
              mimeType: 'application/json'
            })
          });

          if (!createResponse.ok) {
            const errText = await createResponse.text();
            throw new Error("Gagal membuat metadata file: " + errText);
          }

          const createResult = await createResponse.json();
          fileId = createResult.id;

          const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: { 
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadataVal)
          });

          if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            throw new Error("Gagal mengunggah isi metadata: " + errText);
          }
        }

        return new Response(JSON.stringify({ success: true, fileId }), {
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

// Helper untuk menukar Refresh Token ke Access Token Google secara background
async function getAccessTokenFromRefreshToken(clientId: string, clientSecret: string, refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error("Gagal menukar Refresh Token ke Token Akses Google: " + errText);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}
