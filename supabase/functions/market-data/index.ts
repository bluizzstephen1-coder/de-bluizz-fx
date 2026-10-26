const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function getPipSize(symbol: string): number {
  const pair = symbol.toUpperCase().replace("-", "/");

  if (pair === "USD/JPY") return 0.01;
  if (pair === "XAU/USD") return 0.1;

  return 0.0001;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Only GET requests are supported." }, 405);
  }

  try {
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");

    if (!apiKey) {
      return json(
        { error: "TWELVE_DATA_API_KEY is not configured." },
        500,
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "quote";
    const symbol = (url.searchParams.get("symbol") || "EUR/USD").trim();
    const pipSize = getPipSize(symbol);

    const allowedSymbols = [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "XAU/USD",
    ];

    if (!allowedSymbols.includes(symbol.toUpperCase())) {
      return json(
        {
          error:
            "Unsupported symbol. Use EUR/USD, GBP/USD, USD/JPY, or XAU/USD.",
        },
        400,
      );
    }

    const providerSymbol = encodeURIComponent(symbol);
    const encodedKey = encodeURIComponent(apiKey);

    let endpoint: string;

    if (action === "quote") {
      endpoint =
        `https://api.twelvedata.com/quote?symbol=${providerSymbol}&apikey=${encodedKey}`;
    } else if (action === "price") {
      endpoint =
        `https://api.twelvedata.com/price?symbol=${providerSymbol}&apikey=${encodedKey}`;
    } else if (action === "time_series") {
      const interval = url.searchParams.get("interval") || "15min";
      const outputsizeRaw = Number(
        url.searchParams.get("outputsize") || "100",
      );

      const allowedIntervals = [
        "1min",
        "5min",
        "15min",
        "30min",
        "1h",
        "4h",
        "1day",
      ];

      if (!allowedIntervals.includes(interval)) {
        return json(
          { error: "Unsupported candle interval." },
          400,
        );
      }

      const outputsize = Number.isFinite(outputsizeRaw)
        ? Math.max(1, Math.min(500, Math.floor(outputsizeRaw)))
        : 100;

      endpoint =
        `https://api.twelvedata.com/time_series` +
        `?symbol=${providerSymbol}` +
        `&interval=${encodeURIComponent(interval)}` +
        `&outputsize=${outputsize}` +
        `&apikey=${encodedKey}`;
    } else {
      return json(
        {
          error: "Unsupported action. Use quote, price, or time_series.",
        },
        400,
      );
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok || data.status === "error" || data.code >= 400) {
      return json(
        {
          error:
            data?.message ||
            data?.errmsg ||
            "Market provider request failed.",
          providerCode: data?.code ?? response.status,
        },
        502,
      );
    }

    // Return a consistent OHLC structure for the chart.
    if (action === "time_series") {
      if (!Array.isArray(data.values)) {
        return json(
          {
            error: data.message || "No candle data was returned.",
          },
          502,
        );
      }

      const candles = data.values
        .map((c: Record<string, unknown>) => ({
          datetime: String(c.datetime ?? ""),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }))
        .filter((c: {
          datetime: string;
          open: number;
          high: number;
          low: number;
          close: number;
        }) =>
          c.datetime !== "" &&
          [c.open, c.high, c.low, c.close].every(Number.isFinite)
        )
        .reverse();

      return json({
        success: true,
        symbol,
        interval: url.searchParams.get("interval") || "15min",
        pip_size: pipSize,
        candles,
      });
    }

    // Normalize quote/price responses for the dashboard.
    if (action === "price") {
      const price = Number(data.price);

      if (!Number.isFinite(price)) {
        return json({ error: "Provider returned an invalid price." }, 502);
      }

      return json({
        success: true,
        symbol,
        price,
        pip_size: pipSize,
        timestamp: new Date().toISOString(),
      });
    }

    const price = Number(data.close ?? data.price);

    if (!Number.isFinite(price)) {
      return json({ error: "Provider returned an invalid quote." }, 502);
    }

    const previousClose = Number(data.previous_close);
    const change = Number(data.change);
    const changePercent = Number(data.percent_change);

    return json({
      success: true,
      symbol,
      price,
      open: Number.isFinite(Number(data.open)) ? Number(data.open) : null,
      high: Number.isFinite(Number(data.high)) ? Number(data.high) : null,
      low: Number.isFinite(Number(data.low)) ? Number(data.low) : null,
      previous_close: Number.isFinite(previousClose)
        ? previousClose
        : null,
      change: Number.isFinite(change) ? change : null,
      change_percent: Number.isFinite(changePercent)
        ? changePercent
        : null,
      pip_size: pipSize,
      change_pips: Number.isFinite(change) ? change / pipSize : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error
          ? error.message
          : "Unexpected server error.",
      },
      500,
    );
  }
});
