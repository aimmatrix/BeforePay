/**
 * Live fallback: no independent evidence source is connected in this build.
 * Reports the missing checks explicitly so they can never read as a clean result.
 */
export function createNoIndependentSourceProvider({appliesToIdentity = () => true} = {}) {
  return {
    name: 'independent',
    label: 'Independent sources (none connected)',
    sourceType: 'independent',
    supportedKinds: ['identity', 'reputation', 'domain'],
    async lookup(observation) {
      const base = {status: 'not_checked', sourceType: 'independent', sourceLabel: 'No independent source connected', sourceUrl: null, checkedAt: null};
      const out = [];
      if (appliesToIdentity(observation)) out.push({...base, id: 'identity', kind: 'identity',
        summary: "Seller's identity not independently checked",
        detail: 'This build has no independent store directory. Nothing on the page itself, including HTTPS, badges or reviews, can verify who runs the store.'});
      out.push({...base, id: 'reputation', kind: 'reputation', summary: 'Independent reviews not checked', detail: 'No independent review or complaint source is connected.'});
      out.push({...base, id: 'domain', kind: 'domain', summary: 'Domain age and fraud-report records not checked', detail: 'No domain registration or fraud-report source is connected.'});
      return out;
    },
  };
}
