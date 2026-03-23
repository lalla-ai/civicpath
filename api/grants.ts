import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword = 'technology', location = 'florida', rows = 10 } = req.body || {};

  try {
    const response = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: `${keyword} ${location}`.trim(),
        oppStatuses: 'posted',
        rows: Number(rows),
        sortBy: 'openDate|desc',
      }),
    });

    if (!response.ok) {
      throw new Error(`Grants.gov returned ${response.status}`);
    }

    const data = await response.json();

    // Shape the response for the frontend
    const grants = (data.oppHits || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      agency: g.agency,
      openDate: g.openDate,
      closeDate: g.closeDate || 'Rolling',
      status: g.oppStatus,
      number: g.number,
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      total: data.hitCount || 0,
      grants,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
