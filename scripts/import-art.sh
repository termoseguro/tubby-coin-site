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
IDS="hall adoption nap kitchen treats lumber quarry garden storehouse watchtower cottage clinic study gatehouse guildhall training range stable warroom forge palis icy scaffold"
SRC="${1:-$HOME/Downloads}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/town"
mkdir -p "$OUT"

found=0
for id in $IDS; do
  for ext in png webp jpg jpeg; do
    f="$SRC/$id.$ext"
    [ -f "$f" ] || continue

    if [ "$id" = "scaffold" ]; then
      # The scaffold is an OPEN FRAME, and that breaks the usual method: a
      # corner floodfill only eats background CONNECTED to the edge, so the
      # area enclosed by the frame stayed white and every building under
      # construction wore a white box. Scaffolding is all timber with no white
      # to lose, so a global white->transparent is safe here — and only here.
      # Never do this to a building with cream walls; it punches holes in them.
      magick "$f" -alpha set -fuzz 18% -transparent white \
        -trim +repage -resize 768x768\> -quality 92 "$OUT/$id.webp"
    else
      magick "$f" \
        -alpha set -bordercolor white -border 1 \
        -fuzz 14% -fill none -draw "alpha 0,0 floodfill" \
        -shave 1x1 -trim +repage \
        -resize 768x768\> \
        -quality 92 \
        "$OUT/$id.webp"
    fi

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
