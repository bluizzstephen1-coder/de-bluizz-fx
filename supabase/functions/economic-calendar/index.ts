const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const response = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Calendar provider returned HTTP ${response.status}`,
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected calendar data format");
    }

    const events = data.map((event: Record<string, unknown>) => ({
      title: String(event.title ?? ""),
      country: String(event.country ?? ""),
      date: String(event.date ?? ""),
      impact: String(event.impact ?? ""),
      forecast: String(event.forecast ?? ""),
      previous: String(event.previous ?? ""),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        source: "Forex Factory calendar feed",
        events,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Economic calendar error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to retrieve economic calendar data",
      }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
