start /wait npm run build
git commit -am "Save local changes"
git checkout -B gh-pages
git add -f dist
git commit -am "Rebuild website"
git filter-branch -f --prune-empty --subdirectory-filter dist && git push -f origin gh-pages && git checkout master