class MatchService {
  constructor() {
    this.cache = new Map();   // matchId → { data, fetchedAt }
    this.CACHE_TTL = 30000;   // 30 seconds
    this.apiKey = process.env.CRICAPI_KEY || null;
    this.enabled = !!this.apiKey;
    
    if (!this.enabled) {
      console.log('[MatchService] No CRICAPI_KEY — using simulation');
    }
  }

  async getLiveScore(matchId) {
    if (!this.enabled) return this._getSimulatedScore();

    const cached = this.cache.get(matchId);
    if (cached && (Date.now() - cached.fetchedAt) < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const res = await fetch(
        `https://api.cricapi.com/v1/match_info` +
        `?apikey=${this.apiKey}&id=${matchId}`,
        { signal: AbortSignal.timeout(6000) }
      );
      const json = await res.json();

      // If API key is invalid or usage limit exceeded
      if (json.status === 'failure') {
        console.warn('[MatchService] API key invalid or limit reached. Switching to simulation mode.');
        this.enabled = false; // Disable for this session
        return this._getSimulatedScore();
      }

      if (json.status !== 'success' || !json.data) {
        throw new Error(json.status || 'API error');
      }

      const d = json.data;
      const parsed = {
        matchId,
        name:         d.name,
        status:       d.status,
        venue:        d.venue,
        teamHome:     d.teamInfo?.[0]?.name,
        teamAway:     d.teamInfo?.[1]?.name,
        score:        d.score || [],
        currentOver:  d.currentOver || null,
        recentBalls:  d.recentBalls || [],
        tossWinner:   d.tossWinner || null,
        matchStarted: d.matchStarted,
        matchEnded:   d.matchEnded,
        isReal:       true,
        source:       'cricapi',
        fetchedAt:    Date.now()
      };

      this.cache.set(matchId, { data: parsed, fetchedAt: Date.now() });
      return parsed;

    } catch (err) {
      console.error('[MatchService] API error:', err.message);
      const cached = this.cache.get(matchId);
      if (cached) return { ...cached.data, stale: true };
      return this._getSimulatedScore();
    }
  }

  async getCurrentMatches() {
    // GET list of live matches — useful to auto-find today's IPL game
    if (!this.enabled) return [];
    try {
      const res = await fetch(
        `https://api.cricapi.com/v1/currentMatches` +
        `?apikey=${this.apiKey}&offset=0`,
        { signal: AbortSignal.timeout(6000) }
      );
      const json = await res.json();
      return json.data || [];
    } catch { return []; }
  }

  _getSimulatedScore() {
    // Realistic fake score when no API key — 
    // better than nothing, clearly marked as simulation
    const over = 18 + Math.random() * 2;
    const runs = Math.floor(150 + Math.random() * 60);
    const wkts = Math.floor(Math.random() * 5);
    return {
      matchId: 'simulated',
      name: 'MI vs CSK, IPL 2026',
      status: `MI: ${runs}/${wkts} (${over.toFixed(1)} Ov)`,
      score: [{ r: runs, w: wkts, o: over.toFixed(1), inning: 'MI Inning 1' }],
      recentBalls: ['1','4','0','6','1','W'],
      isReal:  false,
      source:  'simulation'
    };
  }
}

module.exports = new MatchService();
