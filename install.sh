#!/bin/bash

curl https://use.fontawesome.com/releases/v5.7.2/fontawesome-free-5.7.2-web.zip > fontawesome.zip
unzip fontawesome.zip
rm fontawesome.zip
mkdir -p copy/assets/css
mv fontawesome-free-*/css/all.min.css copy/assets/css/fontawesome.css
mv fontawesome-free-*/webfonts copy/assets/webfonts
rm -r fontawesome-free-*