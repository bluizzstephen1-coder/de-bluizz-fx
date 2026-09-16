const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TWELVE_DATA_API_KEY");

    if (!apiKey) {
      return json(
        { error: "TWELVE_DATA_API_KEY is not configured." },
        500
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "quote";
    const symbol = url.searchParams.get("symbol") || "EUR/USD";

    let endpoint = "";

    if (action === "quote") {
      endpoint =
        `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
    } else if (action === "time_series") {
      const interval = url.searchParams.get("interval") || "15min";
      const outputsize = url.searchParams.get("outputsize") || "100";

      endpoint =
        `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${encodeURIComponent(outputsize)}&apikey=${encodeURIComponent(apiKey)}`;
    } else if (action === "price") {
      endpoint =
        `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
    } else {
      return json(
        { error: "Unsupported action. Use quote, price, or time_series." },
        400
      );
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      return json(
        {
          error: data?.message || "Market provider request failed.",
          provider: data,
        },
        response.status
      );
    }

    return json(data);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500
    );
  }
});

