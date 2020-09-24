#!/bin/bash
set -e
set -x

trap "cd $(pwd -P)" EXIT
cd "$(dirname $0)"

packages=$(node ./listPackagesInOrder.js);
IFS='
'
cd ..
yarn run clean;
yarn run build;

echo -n "Publish? (y/N)? "
read ANSWER
if [[ "$ANSWER" != "y" ]]; then
  echo "Bailing out."
  exit 1
fi
echo $packages
for package in $packages
do
  cd $package;
  npm publish . --access public
done
echo "Done."
