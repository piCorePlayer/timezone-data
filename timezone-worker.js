const TIMEZONE_FILE_URL = "https://picoreplayer.github.io/timezone-data/timezones.db";
const KV_CACHE_KEY = "timezones_db_data";
const KV_CACHE_TTL = 86400; // 1 day in seconds

// Cache the Olson-to-Linux TZ mapping in memory to avoid frequent lookups
let olsonToLinuxTZ = {};
let tzDataVersion = "";
let tzDataBuild = "";

// Parse timezone data from text
function parseTimezoneData(text) {
  const lines = text.split("\n");
  const mapping = {};
  let version = "";
  let build = "";

  for (const line of lines) {
    if (line.trim() === "") {
      continue; // Skip empty lines
    }

    // Parse the header comment to extract version and build date
    // Format: "# This file is based on iana.org tzdata 2025c built on 2025-12-19 01:09:27 UTC"
    if (line.startsWith("#") && line.includes("tzdata")) {
      const match = line.match(/tzdata\s+(\S+)\s+built\s+on\s+(.+)$/);
      if (match) {
        version = match[1];
        build = match[2];
      }
      continue;
    }

    if (line.startsWith("#")) {
      continue; // Skip other comments
    }

    const [olsonTimezone, linuxTZ] = line.split(" ");
    mapping[olsonTimezone] = linuxTZ;
  }

  return { mapping, version, build };
}

// Fetch and parse the timezone data with KV caching
async function loadTimezoneData(kvNamespace) {
  try {
    // First, try to get data from KV storage
    if (kvNamespace) {
      const cachedData = await kvNamespace.get(KV_CACHE_KEY);
      if (cachedData) {
        const parsedData = parseTimezoneData(cachedData);
        tzDataVersion = parsedData.version;
        tzDataBuild = parsedData.build;
        return parsedData.mapping;
      }
    }
  } catch (kvError) {
    // Log KV error but continue to fetch from URL
    console.error("KV get error:", kvError.message);
  }

  // If not in KV, fetch from URL
  const response = await fetch(TIMEZONE_FILE_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch timezone data");
  }

  const text = await response.text();
  const parsedData = parseTimezoneData(text);
  tzDataVersion = parsedData.version;
  tzDataBuild = parsedData.build;

  // Cache the raw text in KV with expiration
  try {
    if (kvNamespace) {
      await kvNamespace.put(KV_CACHE_KEY, text, { expirationTtl: KV_CACHE_TTL });
    }
  } catch (kvError) {
    // Log KV error but don't fail the request
    console.error("KV put error:", kvError.message);
  }

  return parsedData.mapping;
}

// Helper function to validate Linux TZ strings
function isValidLinuxTZ(tz) {
  if (!tz) return false;
  return /^[A-Z]{1,5}[-+]?[0-9:.]*.*$/.test(tz); // Regex for Linux TZ strings
}

// Main Cloudflare Worker logic
export default {
  async fetch(request, env) {
    // Load the timezone data if not already cached
    if (Object.keys(olsonToLinuxTZ).length === 0) {
      try {
        olsonToLinuxTZ = await loadTimezoneData(env.KV_NAMESPACE);
      } catch (e) {
        return new Response(
          JSON.stringify({
            error: "Unable to fetch timezone data",
            message: e.message,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Extract IP and geolocation data
    const ipHeader = "CF-Connecting-IP";
    const cf = request.cf || {}; // Handle the case where the `cf` object is undefined
    const ip = request.headers.has(ipHeader) ? request.headers.get(ipHeader) : "not available";
    const timezone = cf.timezone || "Not Provided";

    // Resolve the Linux TZ string
    let linuxTZ = "UTC"; // Default to UTC
    if (timezone && olsonToLinuxTZ[timezone]) {
      linuxTZ = isValidLinuxTZ(olsonToLinuxTZ[timezone]) ? olsonToLinuxTZ[timezone] : "UTC";
    }

    // Get the current epoch time
    const currentEpochTime = Math.floor(Date.now() / 1000);

    // Build the response data
    const data = {
      ip: ip,
      Colo: cf.colo, // Cloudflare data center location
      Country: cf.country,
      City: cf.city,
      Continent: cf.continent,
      Latitude: cf.latitude,
      Longitude: cf.longitude,
      PostalCode: cf.postalCode,
      MetroCode: cf.metroCode,
      Region: cf.region,
      RegionCode: cf.regionCode,
      Timezone: timezone, // Olson timezone from the `cf` data
      LinuxTZ: linuxTZ, // Resolved Linux Timezone string
      currentEpochTime: currentEpochTime, // Current epoch time
      TZdata_Version: tzDataVersion || null, // IANA tzdata version
      TZdata_Build: tzDataBuild || null, // Build date and time
    };

    // Return the response as JSON
//    return new Response(JSON.stringify(data, null, 2), {
//      headers: { "Content-Type": "application/json" },
//    });
    return Response.json(data);
  },
};
