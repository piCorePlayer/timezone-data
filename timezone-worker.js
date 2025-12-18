const TIMEZONE_FILE_URL = "https://picoreplayer.github.io/timezone-data/timezones.db";
let olsonToLinuxTZ = {};

// Function to load the timezones.db file from GitHub Pages
async function loadTimezoneData() {
  const response = await fetch(TIMEZONE_FILE_URL);
  const text = await response.text();
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("#") || line.trim() === "") {
      continue; // Skip comments and empty lines
    }
    const [olsonTimezone, linuxTZ] = line.split(" ");
    olsonToLinuxTZ[olsonTimezone] = linuxTZ;
  }
}

// Cloudflare Worker
export default {
  async fetch(request) {
    if (Object.keys(olsonToLinuxTZ).length === 0) {
      await loadTimezoneData(); // Load the timezone data if not already loaded
    }

    const url = new URL(request.url);
    const zoneParam = url.searchParams.get("zone");

    let response = {};
    let linuxTZ = "UTC";

    if (zoneParam) {
      if (olsonToLinuxTZ[zoneParam]) {
        linuxTZ = olsonToLinuxTZ[zoneParam];
      } else {
        response.error = "Timezone not found";
      }
      response.zone = zoneParam;
    } else {
      const cfTimezone = request.headers.get("Cf-Timezone");
      if (cfTimezone && olsonToLinuxTZ[cfTimezone]) {
        linuxTZ = olsonToLinuxTZ[cfTimezone];
      } else {
        response.error = "No timezone data found in query or headers";
      }
      response.cfTimezone = cfTimezone || "Not Provided";
    }

    response.LinuxTZ = linuxTZ;
    response.currentEpochTime = Math.floor(Date.now() / 1000);

    return new Response(JSON.stringify(response, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
