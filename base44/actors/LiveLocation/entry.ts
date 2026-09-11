// Realtime live-location room for an active job. One room per booking
// (room id = booking id). The teen broadcasts GPS pings while a job is
// in_progress; the parent (and only the parent/teen/buyer of that booking)
// receives them and renders a live map. Location is ephemeral — it lives in
// the room and survives hibernation via storage, but is never written to an
// entity.
import { Actor } from 'base44:runtime/actors';

export default class LiveLocation extends Actor {
  location = null;     // { lat, lng, accuracy, ts }
  teenUserId = null;   // cached from the booking — only this user may send

  async handleStart() {
    // Rehydrate on any wake (deploy restart, idle, hibernation).
    const saved = await this.storage.get('location');
    if (saved) this.location = saved;
    const teenId = await this.storage.get('teenUserId');
    if (teenId) this.teenUserId = teenId;
  }

  async handleConnect(conn) {
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

    // And only the teen assigned to THIS booking. Fetch + cache the booking
    // (keyed by the room id, which is the booking id) to verify the sender.
    if (!this.teenUserId) {
      try {
        const roomId = this.id != null ? String(this.id) : null;
        if (!roomId) return;
        const booking = await this.client.asServiceRole.entities.Booking.get(roomId);
        if (booking && booking.teen_user_id) {
          this.teenUserId = booking.teen_user_id;
          await this.storage.put('teenUserId', this.teenUserId);
        }
      } catch (e) {
        return;
      }
    }
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