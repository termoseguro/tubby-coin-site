#!/usr/bin/env bash
# Import town building art from Downloads into public/town/.
#
#   npm run art:import
#
# Takes any of the ten known building names found in ~/Downloads (as .png or
# .webp), removes the flat background, trims the margin, resizes and writes a
# transparent WebP into public/town/.
#
# Background removal uses a corner floodfill, NOT "-transparent white": these
# buildings have cream and white walls, and a global white->transparent would
# punch holes straight through them. Floodfill only eats the background that is
# actually connected to the edge.

set -u
IDS="hall adoption nap kitchen treats lumber quarry garden storehouse watchtower"
SRC="${1:-$HOME/Downloads}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/town"
mkdir -p "$OUT"

found=0
for id in $IDS; do
  for ext in png webp jpg jpeg; do
    f="$SRC/$id.$ext"
    [ -f "$f" ] || continue

    magick "$f" \
      -alpha set -bordercolor white -border 1 \
      -fuzz 14% -fill none -draw "alpha 0,0 floodfill" \
      -shave 1x1 -trim +repage \
      -resize 768x768\> \
      -quality 92 \
      "$OUT/$id.webp"

    size=$(du -h "$OUT/$id.webp" | cut -f1)
    echo "  ✓ $id  ($size)"
    found=$((found + 1))
    break
  done
done

if [ "$found" -eq 0 ]; then
  echo "Nothing to import from $SRC"
  echo "Expected files named: $IDS  (.png)"
  exit 1
fi

echo ""
echo "$found imported into public/town/. Reload /game."
