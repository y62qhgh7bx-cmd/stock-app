export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol, year, month } = req.query;
  if (!symbol || !year || !month) {
    return res.status(400).json({ error: 'symbol, year, month required' });
  }

  // 先嘗試上市（TWSE），失敗再試上櫃（TPEX）
  const date = `${year}${String(month).padStart(2, '0')}01`;

  try {
    // 上市
    const twseUrl = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo=${symbol}&date=${date}&response=json`;
    const r = await fetch(twseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    const data = await r.json();

    if (data.data && data.data.length > 0) {
      // TWSE 欄位: [日期, 成交股數, 成交金額, 開盤, 最高, 最低, 收盤, 漲跌, 成交筆數]
      const rows = data.data.map(row => {
        const dateStr = row[0].replace(/\//g, '-').replace(/^(\d+)/, m => String(parseInt(m) + 1911));
        return {
          date: dateStr,
          open: parseFloat(row[3].replace(/,/g, '')) || null,
          high: parseFloat(row[4].replace(/,/g, '')) || null,
          low: parseFloat(row[5].replace(/,/g, '')) || null,
          close: parseFloat(row[6].replace(/,/g, '')) || null,
        };
      }).filter(d => d.close);
      return res.json({ source: 'twse', data: rows });
    }

    // 上市沒資料，試上櫃
    throw new Error('no twse data');
  } catch (e) {
    try {
      // 上櫃 TPEX
      const mm = String(month).padStart(2, '0');
      const rocYear = parseInt(year) - 1911;
      const tpexUrl = `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=${rocYear}/${mm}&stkno=${symbol}&_=0`;
      const r2 = await fetch(tpexUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000)
      });
      const d2 = await r2.json();
      if (d2.aaData && d2.aaData.length > 0) {
        const rows = d2.aaData.map(row => {
          const parts = row[0].split('/');
          const dateStr = `${parseInt(parts[0]) + 1911}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
          return {
            date: dateStr,
            open: parseFloat(row[3].replace(/,/g, '')) || null,
            high: parseFloat(row[4].replace(/,/g, '')) || null,
            low: parseFloat(row[5].replace(/,/g, '')) || null,
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
