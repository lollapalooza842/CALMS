#!/bin/sh
# Builds frontend/trail/files/CALMS.apk from android/app (a small WebView app written in smali).
# Needs Java, plus apktool.jar and apksigner.jar in android/tools (from the npm package @postar/apktool-node: lib/*.jar).
# The signing key is android/calms.keystore (kept out of git): keep it, every update must be signed with the same key.
set -e; cd "$(dirname "$0")"
java -jar tools/apktool.jar b app -o /tmp/calms-unsigned.apk
python3 tools/zipalign.py /tmp/calms-unsigned.apk /tmp/calms-aligned.apk
java -jar tools/apksigner.jar sign --ks calms.keystore --ks-key-alias calms --min-sdk-version 24 --out ../frontend/trail/files/CALMS.apk /tmp/calms-aligned.apk
echo "Built frontend/trail/files/CALMS.apk"
