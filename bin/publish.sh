git add -A .
git commit -m 'pre-version bump'
npm version patch
git add -A .
git commit -m 'version bump'
git push
npm publish

