# Timezone Data

This repository maintains timezone database files used by piCorePlayer to convert IANA/Olson timezone identifiers to Linux TZ format strings.

## Automatic Updates

The `timezones.db` file is automatically updated from IANA timezone data via a GitHub Action workflow:

- **Manual Trigger**: The workflow can be manually triggered from the Actions tab
- **Scheduled**: Runs automatically every Monday at 00:00 UTC
- **Branch**: Updates are committed directly to the `gh-pages` branch

## Files

- `update_timezones.py`: Python script that downloads the latest IANA timezone data and generates `timezones.db`
- `.github/workflows/update-timezones.yml`: GitHub Action workflow that runs the update script
- `timezones.db`: The generated timezone database (located in `gh-pages` branch)

## How it Works

1. Downloads the latest timezone data from `https://data.iana.org/time-zones/releases/tzdata-latest.tar.gz`
2. Extracts and compiles the timezone files using the `zic` tool
3. Parses the compiled timezone files to extract Linux TZ format strings
4. Generates `timezones.db` with mappings from timezone names to TZ strings
5. Validates the generated file has the expected format and content
6. Commits changes to the `gh-pages` branch if the file has been updated

## Format

The `timezones.db` file contains:
- A header comment indicating the IANA tzdata version
- One timezone per line in the format: `Timezone/Name TZ_STRING`

Example:
```
# This file is based on iana.org tzdata 2025c
Africa/Abidjan GMT0
Africa/Accra GMT0
America/New_York EST5EDT,M3.2.0,M11.1.0
```

## Usage

The generated `timezones.db` file is hosted via GitHub Pages and accessed by the timezone-worker Cloudflare Worker to provide timezone conversions.
