import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keyword = 'technology', location = 'florida', rows = 8 } = req.body || {};
  const searchTerm = `${keyword} ${location}`.trim();

  const results: any[] = [];
  let total = 0;

  // --- SOURCE 0: NSF + NIH mock data (Phase 2 — live API wiring planned) ---
  const nsfNihMock = [
    {
      id: 'nsf-mock-2410001',
      title: 'NSF SBIR Phase I: AI-Driven Civic Technology',
      agency: 'National Science Foundation',
      openDate: '2026-01-15',
      closeDate: '2026-06-15',
      source: 'NSF (Phase 2)',
      url: 'https://www.nsf.gov/funding/pgm_summ.jsp?pims_id=5527',
    },
    {
      id: 'nsf-mock-2410002',
      title: 'NSF STEM Education Innovation Grant — Florida Region',
      agency: 'National Science Foundation',
      openDate: '2026-02-01',
      closeDate: '2026-07-31',
      source: 'NSF (Phase 2)',
      url: 'https://www.nsf.gov/funding/education.jsp',
    },
    {
      id: 'nsf-mock-2410003',
      title: 'NSF Convergence Accelerator: Community Data & AI',
      agency: 'National Science Foundation',
      openDate: '2026-03-01',
      closeDate: '2026-08-30',
      source: 'NSF (Phase 2)',
      url: 'https://www.nsf.gov/od/oia/convergence-accelerator/',
    },
    {
      id: 'nih-mock-2410001',
      title: 'NIH SBIR Phase I: Health Tech Startup R&D Award',
      agency: 'National Institutes of Health',
      openDate: '2026-01-20',
      closeDate: '2026-09-05',
      source: 'NIH (Phase 2)',
      url: 'https://grants.nih.gov/grants/guide/pa-files/PA-21-259.html',
    },
    {
      id: 'nih-mock-2410002',
      title: 'NIH Community Health Innovation Award — Southeast',
      agency: 'National Institutes of Health',
      openDate: '2026-02-10',
      closeDate: '2026-10-15',
      source: 'NIH (Phase 2)',
      url: 'https://grants.nih.gov/grants/guide/pa-files/PAR-22-105.html',
    },
  ];
  results.push(...nsfNihMock);
  total += nsfNihMock.length;

  // --- SOURCE 1: Grants.gov ---
  try {
    const r = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: searchTerm, oppStatuses: 'posted', rows: Number(rows), sortBy: 'openDate|desc' }),
    });
    const d = await r.json();
    total += d.hitCount || 0;
    (d.oppHits || []).forEach((g: any) => results.push({
      id: g.id,
      title: g.title,
      agency: g.agency,
      openDate: g.openDate,
      closeDate: g.closeDate || 'Rolling',
      source: 'Grants.gov',
      url: `https://www.grants.gov/search-results-detail/${g.id}`,
    }));
  } catch { /* Grants.gov unavailable */ }

  // --- SOURCE 2: SBA SBIR (AI/tech startups) ---
  try {
    const sbirKeyword = keyword.toLowerCase().includes('ai') || keyword.toLowerCase().includes('tech')
      ? keyword : `${keyword} technology`;
    const r = await fetch(`https://api.sbir.gov/awards?keyword=${encodeURIComponent(sbirKeyword)}&rows=5&start=0`, {
      headers: { 'Accept': 'application/json' },
    });
    if (r.ok) {
      const d = await r.json();
      const awards = d.response?.docs || [];
      total += d.response?.numFound || 0;
      awards.slice(0, 3).forEach((g: any) => results.push({
        id: `sbir-${g.award_id}`,
        title: g.project_title || g.title,
        agency: g.agency || 'SBA SBIR',
        openDate: g.date || '',
        closeDate: 'Rolling',
        source: 'SBA SBIR',
        url: `https://www.sbir.gov/awards/${g.award_id}`,
      }));
    }
  } catch { /* SBIR unavailable */ }

  return res.status(200).json({ total, grants: results });
}
