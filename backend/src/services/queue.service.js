const db = require('../config/database');
const { generateId } = require('../utils/crypto');

class VirtualQueueService {

  constructor() {
    this.queues = new Map();
    this.PROCESSING_RATES = {
      gate:     20,
      food:      4,
      washroom:  8,
      parking:  15,
      medical:   2
    };
    setInterval(() => this._advanceAllQueues(), 30000);
  }

  joinQueue(facilityId, userId, facilityType) {
    if (!this.queues.has(facilityId)) {
      this.queues.set(facilityId, {
        entries: [],
        processingRate: this.PROCESSING_RATES[facilityType] || 5,
        nextPosition: 1
      });
    }
    const q = this.queues.get(facilityId);

    if (q.entries.find(e => e.userId === userId && e.status === 'WAITING')) {
      throw new Error('Already in this queue');
    }

    const position = q.nextPosition++;
    const waitMinutes = Math.ceil(position / q.processingRate);
    const estimatedCallTime = Date.now() + (waitMinutes * 60 * 1000);

    const entry = {
      id:                generateId(),
      userId,
      facilityId,
      position,
      status:            'WAITING',
      estimatedCallTime,
      joinedAt:          Date.now()
    };

    q.entries.push(entry);

    const activeEvent = db.getActiveEvent();
    const eventId = activeEvent ? activeEvent.id : 'evt_unknown';

    const dbConn = db.getDb();
    dbConn.prepare(`INSERT INTO virtual_queue_entries 
      (id,user_id,facility_id,event_id,position,status,
       estimated_call_time,joined_at)
      VALUES (?,?,?,?,?,?,?,?)`
    ).run(
      entry.id, userId, facilityId,
      eventId,
      position, 'WAITING',
      estimatedCallTime,
      Date.now()
    );

    return { 
      position: entry.position, 
      estimatedWaitMinutes: waitMinutes, 
      estimatedCallTime 
    };
  }

  leaveQueue(facilityId, userId) {
    const q = this.queues.get(facilityId);
    if (!q) return false;
    const idx = q.entries.findIndex(
      e => e.userId === userId && e.status === 'WAITING'
    );
    if (idx === -1) return false;
    q.entries[idx].status = 'CANCELLED';
    const dbConn = db.getDb();
    dbConn.prepare(
      `UPDATE virtual_queue_entries SET status='CANCELLED' 
       WHERE user_id=? AND facility_id=? AND status='WAITING'`
    ).run(userId, facilityId);
    return true;
  }

  getPosition(facilityId, userId) {
    const q = this.queues.get(facilityId);
    if (!q) return null;
    const entry = q.entries.find(
      e => e.userId === userId && e.status === 'WAITING'
    );
    if (!entry) return null;
    const aheadOf = q.entries.filter(
      e => e.status === 'WAITING' && e.position < entry.position
    ).length;
    return {
      position: entry.position,
      aheadOfYou: aheadOf,
      estimatedCallTime: entry.estimatedCallTime,
      estimatedWaitMinutes: Math.ceil(aheadOf / q.processingRate)
    };
  }

  getQueueLength(facilityId) {
    const q = this.queues.get(facilityId);
    if (!q) return 0;
    return q.entries.filter(e => e.status === 'WAITING').length;
  }

  _advanceAllQueues() {
    const { sendToUser } = require('../websocket');
    for (const [facilityId, q] of this.queues) {
      const toServe = Math.floor(q.processingRate * 0.5);
      let served = 0;
      for (const entry of q.entries) {
        if (entry.status === 'WAITING') {
          if (served < toServe) {
            entry.status = 'CALLED';
            served++;
            sendToUser(entry.userId, {
              type: 'QUEUE_CALLED',
              payload: {
                facilityId,
                message: 'Your turn! Please proceed now.'
              }
            });
          } else {
            // Still waiting, send position update
            const aheadOf = q.entries.filter(
              e => e.status === 'WAITING' && e.position < entry.position
            ).length;
            sendToUser(entry.userId, {
              type: 'QUEUE_POSITION',
              payload: {
                facilityId,
                position: entry.position,
                aheadOfYou: aheadOf,
                estimatedWait: Math.ceil(aheadOf / q.processingRate)
              }
            });
          }
        }
      }
    }
  }
}

module.exports = new VirtualQueueService();
