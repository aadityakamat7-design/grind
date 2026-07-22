import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { geocodeAddress } from '../../shared/geocode.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query } = await req.json();
    if (!query || !query.trim()) {
      return Response.json({ error: 'Address or ZIP is required' }, { status: 400 });
    }

    const result = await geocodeAddress(query.trim());
    return Response.json(result);
  } catch (error) {
    console.error('geocodeAddress error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});