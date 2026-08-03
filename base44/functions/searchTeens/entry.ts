import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { haversineMiles } from '../../shared/geo.ts';

// Server-side teen search. Reads the teen's exact coordinates from
// TeenPrivateData (which the client can never access), computes distance,
// and returns only a rounded distance + resolved city — never raw
// coordinates. This is the sole way the browse page gets teen proximity.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const [listings, buyerProfiles] = await Promise.all([
      svc.Listing.filter({ status: 'published' }, '-created_date', 100),
      svc.BuyerProfile.filter({ user_id: user.id }),
    ]);
    const buyer = buyerProfiles[0];
    const buyerLat = buyer?.latitude;
    const buyerLng = buyer?.longitude;
    const buyerState = buyer?.state;
    const hasBuyerLocation = buyerLat != null && buyerLng != null;

    // Batch-fetch all teen profiles + private data
    const teenUserIds = [...new Set(listings.map((l) => l.teen_user_id))];
    const [allProfiles, allPrivate] = await Promise.all([
      svc.TeenProfile.list(undefined, 200),
      Promise.all(teenUserIds.map((id) => svc.TeenPrivateData.filter({ user_id: id }))),
    ]);
    const profileByUid = {};
    allProfiles.forEach((p) => { profileByUid[p.user_id] = p; });
    const privateByUid = {};
    allPrivate.forEach((arr, i) => {
      if (arr[0]) privateByUid[teenUserIds[i]] = arr[0];
    });

    const results = listings
      .filter((l) => {
        const teen = profileByUid[l.teen_user_id];
        return teen?.status === 'active' && teen?.is_available !== false;
      })
      .map((l) => {
        const teen = profileByUid[l.teen_user_id];
        const priv = privateByUid[l.teen_user_id];
        let distance = null;
        let inArea = true;
        if (hasBuyerLocation && priv?.latitude != null && priv?.longitude != null) {
          distance = haversineMiles(buyerLat, buyerLng, priv.latitude, priv.longitude);
          const sameState = teen.state && buyerState && teen.state === buyerState;
          inArea = sameState && distance <= (teen.service_radius_miles || 3);
        }
        return {
          id: l.id,
          teen_user_id: l.teen_user_id,
          teen_display_name: l.teen_display_name,
          category: l.category,
          title: l.title,
          description: l.description,
          price: l.price,
          price_model: l.price_model,
          photos: l.photos || [],
          is_hazard_flagged: l.is_hazard_flagged,
          hazard_reason: l.hazard_reason,
          teen_resolved_city: teen.resolved_city || '',
          teen_avg_rating: teen.avg_rating || 0,
          teen_review_count: teen.review_count || 0,
          teen_is_available: teen.is_available !== false,
          _distance: distance != null ? Math.round(distance * 10) / 10 : null,
          _inArea: inArea,
        };
      });

    return Response.json({ listings: results });
  } catch (error) {
    console.error('searchTeens error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});