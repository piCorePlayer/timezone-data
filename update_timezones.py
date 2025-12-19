#!/usr/bin/python3
import os
import sys
import re
import subprocess
import shutil

# Clean up any existing files
if os.path.exists('./tzdata'):
    shutil.rmtree('./tzdata')
if os.path.exists('tzdata-latest.tar.gz'):
    os.remove('tzdata-latest.tar.gz')

# Download latest timezone data
try:
    subprocess.run(
        ['wget', 'https://data.iana.org/time-zones/releases/tzdata-latest.tar.gz'],
        check=True,
        capture_output=True
    )
except subprocess.CalledProcessError as e:
    print("Error: Failed to download timezone data from IANA", file=sys.stderr)
    print(f"Details: {e.stderr.decode('utf-8', errors='ignore')}", file=sys.stderr)
    sys.exit(1)

# Extract the data
os.makedirs('./tzdata', exist_ok=True)
try:
    subprocess.run(
        ['tar', '-C', './tzdata', '-xzf', 'tzdata-latest.tar.gz'],
        check=True,
        capture_output=True
    )
except subprocess.CalledProcessError as e:
    print("Error: Failed to extract timezone data", file=sys.stderr)
    print(f"Details: {e.stderr.decode('utf-8', errors='ignore')}", file=sys.stderr)
    sys.exit(1)

# Compile timezone data using zic
os.makedirs('./tzdata/out', exist_ok=True)
for filename in os.listdir('./tzdata'):
    filepath = os.path.join('./tzdata', filename)
    if os.path.isfile(filepath) and not filename.startswith('.'):
        # Run zic on each timezone data file
        subprocess.run(
            ['zic', '-d', './tzdata/out', filepath],
            stderr=subprocess.DEVNULL
        )

timezones = {}

# Pattern to extract Linux TZ format strings from compiled timezone files
# This matches TZ strings like "EST5EDT,M3.2.0,M11.1.0" or "GMT0"
# Format: Optional offset in angle brackets, followed by TZ abbreviations and rules
pattern = re.compile(r'(?:\<[\+\-0-9]+\>)?([\+\-\,\.\/A-Z0-9]*)')

version = ''
try:
    with open("./tzdata/version", 'rb') as f:
        version = f.read().decode('ascii').strip('\n')
except FileNotFoundError:
    print("Error: version file not found in timezone data", file=sys.stderr)
    sys.exit(1)

tzdata_dir = './tzdata/out/'
if not os.path.exists(tzdata_dir):
    print("Error: Compiled timezone data directory not found", file=sys.stderr)
    sys.exit(1)

for root, dirs, files in os.walk(tzdata_dir):
    for filename in files: 
        filepath = os.path.join(root,filename)
        zone_name = filepath[len(tzdata_dir):]

        with open(filepath, 'rb') as f:
            data = f.read()
            lines = data.split()
            
            # Ensure file has enough data to process
            if len(lines) < 2:
                continue
                
            magic_version = lines[0][0:5]
            if magic_version == b'TZif2':
                try:
                    tz_string = lines[-1].decode('ascii')
                    tz_match = pattern.search(tz_string)
                    if tz_match:
                        timezones[zone_name] = tz_match.group(1)
                except (UnicodeDecodeError, IndexError):
                    # Skip files that can't be decoded or don't have expected format
                    continue

# Format output directly instead of using JSON as intermediate
if len(timezones) == 0:
    print("Error: No timezones were extracted from the data", file=sys.stderr)
    sys.exit(1)

# Sort timezones by name and format output
with open('timezones.db', 'w') as f:
    f.write(f"# This file is based on iana.org tzdata {version}\n")
    for zone_name in sorted(timezones.keys()):
        f.write(f"{zone_name} {timezones[zone_name]}\n")

print(f"Generated timezones.db with {len(timezones)} timezones from tzdata version {version}")
