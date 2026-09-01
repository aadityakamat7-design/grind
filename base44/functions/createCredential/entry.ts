import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Server-side credential file validation + creation. Validates the uploaded
// file's type and size before creating the Credential record, so a client
// can't bypass the allowlist by calling Credential.create directly with
// an executable or oversized file.
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
];
// Trusted storage hosts — only these may be fetched server-side for HEAD
// validation. Prevents SSRF via user-supplied fileUrl pointing at internal
// services, loopback, or cloud metadata endpoints.
const ALLOWED_HOSTS = ['media.base44.com', 'static.wixstatic.com'];

function isAllowedFileUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const host = parsed.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { listingId, label, fileUrl, category, teenDisplayName, listingTitle } = await req.json();
    if (!listingId || !label || !fileUrl) {
      return Response.json({ error: 'listingId, label, and fileUrl are required' }, { status: 400 });
    }

    // --- Server-side file validation ---

    // 1. URL + extension check (SSRF guard: only trusted storage hosts)
    let ext = '';
    try {
      const parsed = new URL(fileUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return Response.json({ error: 'Invalid file URL.' }, { status: 400 });
      }
      if (!isAllowedFileUrl(fileUrl)) {
        return Response.json({ error: 'File URL must point to Blockwork storage.' }, { status: 400 });
      }
      ext = parsed.pathname.toLowerCase().substring(parsed.pathname.lastIndexOf('.'));
    } catch {
      return Response.json({ error: 'Invalid file URL.' }, { status: 400 });
    }
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json({ error: 'Only images (JPG, PNG, GIF, WebP) and PDF files are allowed.' }, { status: 400 });
    }

    // 2. Content-Type and Content-Length validation via HEAD request
    try {
      const headRes = await fetch(fileUrl, { method: 'HEAD' });
      const contentType = headRes.headers.get('content-type') || '';
      const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);

      if (contentLength > MAX_FILE_SIZE) {
        return Response.json({ error: 'File is too large. Maximum size is 10MB.' }, { status: 400 });
      }

      const contentTypeOk = ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t));
      if (!contentTypeOk && contentType) {
        return Response.json({ error: 'File type is not allowed. Only images and PDFs are accepted.' }, { status: 400 });
      }
    } catch {
      // If HEAD fails (e.g. CORS), fall back to extension check (already done)
    }

    // --- Verify the listing belongs to the caller ---
    const svc = base44.asServiceRole.entities;
    const listing = await svc.Listing.get(listingId);
    if (!listing || listing.teen_user_id !== user.id) {
      return Response.json({ error: 'Listing not found.' }, { status: 404 });
    }

    await svc.Credential.create({
      teen_user_id: user.id,
      teen_display_name: teenDisplayName || listing.teen_display_name || '',
      listing_id: listingId,
      listing_title: listingTitle || listing.title || '',
      category: category || listing.category || '',
      label: String(label).trim().slice(0, 100),
      file_url: fileUrl,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('createCredential error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});