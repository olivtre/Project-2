#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -f .env ]; then
    echo 'Viga: projekti .env puudub. Ära loo uut; kasuta senist andmebaasi .env faili.'
    exit 1
fi
for setting in \
    'UPLOAD_ORIGINAL_PATH=./public/gallery/orig/' \
    'UPLOAD_RESIZED_PATH=./public/gallery/normal/' \
    'UPLOAD_THUMBNAIL_PATH=./public/gallery/thumbs/'
do
    key="${setting%%=*}"
    if ! grep -q "^${key}=" .env; then
        printf '\n%s\n' "$setting" >> .env
    fi
done
mkdir -p public/gallery/orig public/gallery/normal public/gallery/thumbs gallery-temp
# Fotod ja ajutised failid jäävad Greeny serverisse, mitte avalikku GitHubi reposse.
touch .gitignore
for pattern in     '/gallery-temp/'     '/public/gallery/orig/'     '/public/gallery/normal/'     '/public/gallery/thumbs/'
do
    if ! grep -qxF "$pattern" .gitignore; then
        printf '
%s
' "$pattern" >> .gitignore
    fi
done
# Loome katalogid. Ei kustuta fotosid ega olemasolevat andmebaasi.
echo 'Galerii kataloogid ja .env teed on seadistatud.'
echo 'Järgmine samm: npm install multer sharp'
