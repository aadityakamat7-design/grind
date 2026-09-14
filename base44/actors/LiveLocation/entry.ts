// Realtime live-location room for an active job. One room per booking
// (room id = booking id). The teen broadcasts GPS pings while a job is
// in_progress; the parent (and only the parent/teen/buyer of that booking)
// receives them and renders a live map. Location is ephemeral — it lives in
// the room and survives hibernation via storage, but is never written to an
// entity.
import { Actor } from 'base44:runtime/actors';

export default class LiveLocation extends Actor {
  location = null;      // { lat, lng, accuracy, ts }
  teenUserId = null;    // cached from the booking — only this user may send
  parentUserId = null;  // cached — may receive
  buyerUserId = null;   // cached — may receive

  async handleStart() {
    // Rehydrate on any wake (deploy restart, idle, hibernation).
    const saved = await this.storage.get('location');
    if (saved) this.location = saved;
    const teenId = await this.storage.get('teenUserId');
    if (teenId) this.teenUserId = teenId;
    const parentId = await this.storage.get('parentUserId');
    if (parentId) this.parentUserId = parentId;
    const buyerId = await this.storage.get('buyerUserId');
    if (buyerId) this.buyerUserId = buyerId;
  }

  // Fetch + cache the booking's participant ids so we can authorize every
  // connection against them. The room id IS the booking id.
  async ensureParticipants() {
    if (this.teenUserId && this.parentUserId && this.buyerUserId) return;
    const roomId = this.id != null ? String(this.id) : null;
    if (!roomId) return;
    try {
      const booking = await this.client.asServiceRole.entities.Booking.get(roomId);
      if (!booking) return;
      if (booking.teen_user_id) {
        this.teenUserId = booking.teen_user_id;
        await this.storage.put('teenUserId', this.teenUserId);
      }
      if (booking.parent_user_id) {
        this.parentUserId = booking.parent_user_id;
        await this.storage.put('parentUserId', this.parentUserId);
      }
      if (booking.buyer_user_id) {
        this.buyerUserId = booking.buyer_user_id;
        await this.storage.put('buyerUserId', this.buyerUserId);
      }
    } catch (e) {
      // Booking fetch failed — fail closed (no participant ids = no access).
    }
  }

  isAuthorized(userId) {
    return (
      userId &&
      (userId === this.teenUserId ||
        userId === this.parentUserId ||
        userId === this.buyerUserId)
    );
  }

  async handleConnect(conn) {
    // Only an authenticated user may connect to this room.
    if (!conn.identity || conn.identity.type !== 'authenticated') {
      conn.reject(4003, 'unauthorized');
      return;
    }

    // And only a participant on THIS booking (teen, parent, or buyer).
    await this.ensureParticipants();
    if (!this.isAuthorized(conn.identity.userId)) {
      conn.reject(4003, 'unauthorized');
      return;
    }

    // Late joiners get the last known location immediately, or a "waiting"
    // signal so the parent's map can show the right placeholder.
    if (this.location) {
      conn.send({
        type: 'location',
        lat: this.location.lat,
        lng: this.location.lng,
        accuracy: this.location.accuracy,
        ts: this.location.ts,
      });
    } else {
      conn.send({ type: 'waiting' });
    }
  }

  async handleMessage(conn, msg) {
    if (typeof msg !== 'object' || msg === null) return;
    if (msg.type !== 'location') return;

    // Only an authenticated user may send location.
    if (!conn.identity || conn.identity.type !== 'authenticated') return;

    // And only the teen assigned to THIS booking.
    await this.ensureParticipants();
    if (this.teenUserId && conn.identity.userId !== this.teenUserId) return;

    // Validate coordinates.
    const lat = Number(msg.lat);
    const lng = Number(msg.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    this.location = {
      lat,
      lng,
      accuracy: Number.isFinite(Number(msg.accuracy)) ? Number(msg.accuracy) : null,
      ts: Date.now(),
    };
    await this.storage.put('location', this.location);
    this.broadcast({
      type: 'location',
      lat: this.location.lat,
      lng: this.location.lng,
      accuracy: this.location.accuracy,
      ts: this.location.ts,
    });
  }
}