#!/bin/bash
set -e
set -x

trap "cd $(pwd -P)" EXIT
cd "$(dirname $0)"

if [[ $1 == "--help" ]]; then
  echo "usage: $(basename $0) [--release|--tip-of-tree]"
  echo
  echo "Publishes all packages."
  echo
  echo "--release                publish @latest version of all packages"
  echo "--tip-of-tree            publish @next version of all packages"
  exit 1
fi

if [[ $# < 1 ]]; then
  echo "Please specify either --release or --tip-of-tree"
  exit 1
fi

if ! command -v npm >/dev/null; then
  echo "ERROR: NPM is not found"
  exit 1
fi

if ! command -v yarn >/dev/null; then
  echo "ERROR: yarn is not found"
  exit 1
fi

if [[ (-n $CI) && (-n $NPM_AUTH_TOKEN) ]]; then
  echo "//registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}" > $HOME/.npmrc
fi

if ! npm whoami >/dev/null 2>&1; then
  echo "ERROR: NPM failed to log in"
  exit 1
fi

UPSTREAM_SHA=$(git ls-remote git@github.com:microsoft/playwright-runner.git --tags master | cut -f1)
CURRENT_SHA=$(git rev-parse HEAD)

if [[ "${UPSTREAM_SHA}" != "${CURRENT_SHA}" ]]; then
  echo "REFUSING TO PUBLISH: this is not tip-of-tree"
  exit 1
fi
packages=$(node ./listPackagesInOrder.js);
IFS='
'
cd ..
yarn run clean;
yarn run build;
if [[ $1 == "--release" ]]; then
  if [[ -n $CI ]]; then
    echo "Found \$CI env - cannot publish real release from CI"
    exit 1
  fi
  if [[ -n $(git status -s) ]]; then
    echo "ERROR: git status is dirty; some uncommitted changes or untracked files"
    exit 1
  fi
  echo -n "Publish? (y/N)? "
  read ANSWER
  if [[ "$ANSWER" != "y" ]]; then
    echo "Bailing out."
    exit 1
  fi

  for package in $packages
  do
    cd $package;
    npm publish . --access public
  done
  echo "Done."
elif [[ $1 == "--tip-of-tree" ]]; then
  if [[ -z $CI ]]; then
    echo "Did not find \$CI env - cannot publish tip-of-tree release not from CI"
    exit 1
  fi
  echo "--tip-of-tree not supported yet";
  exit 1
else
  echo "unknown argument - '$1'"
  exit 1
fi

