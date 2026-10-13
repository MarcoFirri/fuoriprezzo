// Raccoglie gli insight Instagram degli ultimi 7 giorni e li salva in insights.json
// (caricato come artifact privato del workflow, i numeri non vengono stampati nel log).
import fs from 'node:fs';

const TOKEN = process.env.INSTAGRAM_TOKEN || '';
const API = 'https://graph.instagram.com';
if (!TOKEN) { console.error('Manca il secret INSTAGRAM_TOKEN.'); process.exit(1); }

async function ig(path, params = {}){
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`${API}/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (data.error || !res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}
const out = { generato: new Date().toISOString(), periodo_giorni: 7, account: {}, totali: {}, giornalieri: {}, post: [], errori: [] };
const until = Math.floor(Date.now() / 1000), since = until - 7 * 86400;

try {
  const me = await ig('me', { fields: 'user_id,username,followers_count,follows_count,media_count' });
  out.account = me;
  const id = me.user_id;

  for (const metric of ['reach', 'views', 'accounts_engaged', 'total_interactions', 'likes', 'comments', 'saves', 'shares', 'profile_links_taps', 'follows_and_unfollows']) {
    try {
      const r = await ig(`${id}/insights`, { metric, period: 'day', metric_type: 'total_value', since, until });
      const v = r.data?.[0]?.total_value;
      out.totali[metric] = v?.breakdowns ? v : v?.value ?? null;
    } catch (e) { out.errori.push(`${metric}: ${e.message}`); }
  }
  for (const metric of ['reach', 'follower_count']) {
    try {
      const r = await ig(`${id}/insights`, { metric, period: 'day', since, until });
      out.giornalieri[metric] = (r.data?.[0]?.values || []).map(x => ({ giorno: x.end_time?.slice(0, 10), valore: x.value }));
    } catch (e) { out.errori.push(`${metric} giornaliero: ${e.message}`); }
  }
  try {
    const r = await ig(`${id}/insights`, { metric: 'engaged_audience_demographics', period: 'lifetime', timeframe: 'this_month', metric_type: 'total_value', breakdown: 'city' });
    out.pubblico_citta = r.data?.[0]?.total_value?.breakdowns?.[0]?.results?.slice(0, 10) || [];
  } catch (e) { out.errori.push(`pubblico: ${e.message}`); }

  const media = await ig(`${id}/media`, { fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count', limit: '20' });
  for (const m of media.data || []) {
    const p = { id: m.id, data: m.timestamp, tipo: m.media_product_type || m.media_type, link: m.permalink,
      didascalia: (m.caption || '').split('\n').filter(Boolean).slice(0, 3).join(' · '), like: m.like_count, commenti: m.comments_count, insight: {} };
    const metriche = ['reach', 'views', 'saved', 'shares', 'total_interactions'];
    if (m.media_product_type === 'REELS') metriche.push('ig_reels_avg_watch_time', 'ig_reels_video_view_total_time');
    for (const metric of metriche) {
      try { const r = await ig(`${m.id}/insights`, { metric }); p.insight[metric] = r.data?.[0]?.values?.[0]?.value ?? null; }
      catch (e) { p.insight[metric] = null; }
    }
    out.post.push(p);
  }
  // Le storie restano consultabili solo per 24 ore: qui ci sono quelle ancora attive
  try {
    const st = await ig(`${id}/stories`, { fields: 'id,timestamp' });
    out.storie = [];
    for (const s of st.data || []) {
      const p = { id: s.id, data: s.timestamp, insight: {} };
      for (const metric of ['reach', 'views', 'replies', 'shares', 'total_interactions']) {
        try { const r = await ig(`${s.id}/insights`, { metric }); p.insight[metric] = r.data?.[0]?.values?.[0]?.value ?? null; }
        catch (e) { p.insight[metric] = null; }
      }
      out.storie.push(p);
    }
  } catch (e) { out.errori.push(`storie: ${e.message}`); }
  try { out.strategia = JSON.parse(fs.readFileSync('data/instagram-strategia.json', 'utf8')); } catch {}
} catch (e) { out.errori.push(`account: ${e.message}`); }

fs.writeFileSync('insights.json', JSON.stringify(out, null, 2));
console.log(`Insight raccolti: ${out.post.length} post, ${Object.keys(out.totali).length} metriche, ${out.errori.length} avvisi.`);
if (out.errori.some(e => e.startsWith('account:'))) process.exit(1);
