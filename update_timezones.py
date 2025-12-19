#!/usr/bin/python3
import os
import sys
import json
import re

# Clean up any existing files
os.system('rm -rf ./tzdata')
os.system('rm -f tzdata-latest.tar.gz')

# Download latest timezone data
ret = os.system('wget https://data.iana.org/time-zones/releases/tzdata-latest.tar.gz')
if ret != 0:
    print("Error: Failed to download timezone data from IANA", file=sys.stderr)
    sys.exit(1)

# Extract the data
os.system('mkdir -p ./tzdata')
ret = os.system('tar -C ./tzdata -xzf tzdata-latest.tar.gz')
if ret != 0:
    print("Error: Failed to extract timezone data", file=sys.stderr)
    sys.exit(1)

# Compile timezone data using zic
os.system('for file in ./tzdata/*; do zic -d ./tzdata/out $file 2>/dev/null; done')

timezones = {}

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
            lines = f.read().split()
            magic_version = lines[0][0:5]
            if magic_version == b'TZif2':
                tz_string = lines[-1].decode('ascii')
                tz_match = pattern.search(tz_string)
                if tz_match:
                    timezones[zone_name] = tz_match.group(1)

TZdata=json.dumps(timezones, indent=0, separators = ("", " "), sort_keys = True)
TZdata=TZdata.replace("{","")
TZdata=TZdata.replace("}","")
TZdata=TZdata.replace('"','')

if len(timezones) == 0:
    print("Error: No timezones were extracted from the data", file=sys.stderr)
    sys.exit(1)

with open('timezones.db', 'w') as f:
    f.write(f"# This file is based on iana.org tzdata {version}\n")
    f.write(TZdata)

print(f"Generated timezones.db with {len(timezones)} timezones from tzdata version {version}")
