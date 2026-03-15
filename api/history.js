export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol, year, month } = req.query;
  if (!symbol || !year || !month) {
    return res.status(400).json({ error: 'symbol, year, month required' });
  }
  const date = `${year}${String(month).padStart(2, '0')}01`;
  try {
    // 先試上市
    const r = await fetch(
      `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo=${symbol}&date=${date}&response=json`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await r.json();
    if (data.data && data.data.length > 0) {
      const rows = data.data.map(row => ({
        date: row[0].replace(/\//g, '-').replace(/^(\d+)/, m => String(parseInt(m) + 1911)),
        open:  parseFloat(row[3].replace(/,/g, '')) || null,
        high:  parseFloat(row[4].replace(/,/g, '')) || null,
        low:   parseFloat(row[5].replace(/,/g, '')) || null,
        close: parseFloat(row[6].replace(/,/g, '')) || null,
      })).filter(d => d.close);
      return res.json({ source: 'twse', data: rows });
    }
    throw new Error('no data');
  } catch {
    // 再試上櫃
    try {
      const rocYear = parseInt(year) - 1911;
      const mm = String(month).padStart(2, '0');
      const r2 = await fetch(
        `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=${rocYear}/${mm}&stkno=${symbol}&_=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const d2 = await r2.json();
      if (d2.aaData && d2.aaData.length > 0) {
        const rows = d2.aaData.map(row => {
          const p = row[0].split('/');
          return {
            date:  `${parseInt(p[0]) + 1911}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`,
            open:  parseFloat(row[3].replace(/,/g, '')) || null,
            high:  parseFloat(row[4].replace(/,/g, '')) || null,
            low:   parseFloat(row[5].replace(/,/g, '')) || null,
            close: parseFloat(row[6].replace(/,/g, '')) || null,
          };
        }).filter(d => d.close);
        return res.json({ source: 'tpex', data: rows });
      }
      return res.json({ source: 'none', data: [] });
    } catch (e2) {
      return res.status(500).json({ error: e2.message, data: [] });
    }
  }
}
