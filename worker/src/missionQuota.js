import { DurableObject } from 'cloudflare:workers';

/**
 * Exact mission admission control. Per-IP objects hold a sliding 60-second
 * window; one low-volume global object holds the current UTC day's count.
 * Synchronous SQLite-backed KV operations make each check-and-increment atomic.
 */
export class MissionQuota extends DurableObject {
  consumeRecent(now, limit, periodMs) {
    const prior = this.ctx.storage.kv.get('recent') || [];
    const recent = prior.filter((timestamp) => timestamp > now - periodMs);
    if (recent.length >= limit) return false;
    recent.push(now);
    this.ctx.storage.kv.put('recent', recent);
    return true;
  }

  consumeDaily(day, limit) {
    const prior = this.ctx.storage.kv.get('daily');
    const count = prior?.day === day ? prior.count : 0;
    if (count >= limit) return false;
    this.ctx.storage.kv.put('daily', { day, count: count + 1 });
    return true;
  }
}
