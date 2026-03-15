export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });

  try {
    // 上市股票
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${symbols}&json=1&delay=0`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
