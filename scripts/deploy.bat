@echo off
rem Deploy dist/ to the gh-pages branch on Gitee.
rem Usage: npm run deploy
rem Optional: set GITEE_TOKEN=<token> to auto-trigger the Pages rebuild
rem (free tier otherwise needs one manual "Update" click in repo settings).
rem NOTE: keep this file ASCII-only -- Chinese chars get mangled by cmd (GBK).
setlocal
set WT=.deploy-tmp
set BR=deploy-pages-tmp

if not exist dist\index.html (
  echo [deploy] dist\index.html not found. Run "npm run build" first.
  exit /b 1
)

rem Clean leftovers from a previous crashed run
git worktree remove --force %WT% >nul 2>&1
git branch -D %BR% >nul 2>&1
git worktree prune >nul 2>&1
if exist %WT% rmdir /s /q %WT% >nul 2>&1

git worktree add --no-checkout --detach %WT% HEAD || goto :fail
git -C %WT% switch --orphan %BR% || goto :fail
git -C %WT% read-tree --empty || goto :fail
xcopy dist\* %WT%\ /E /I /Y /Q >nul || goto :fail
git -C %WT% add -A || goto :fail
git -C %WT% -c user.name=deploy-bot -c user.email=deploy@local commit -m "deploy: pages build" || goto :fail
git -C %WT% push -f origin HEAD:gh-pages || goto :fail

git worktree remove --force %WT% >nul 2>&1
git branch -D %BR% >nul 2>&1
git worktree prune >nul 2>&1
if exist %WT% rmdir /s /q %WT% >nul 2>&1

if defined GITEE_TOKEN (
  echo [deploy] Triggering Pages rebuild via API...
  curl -s -X POST "https://gitee.com/api/v5/repos/kongjingnengbai/ode-to-chaos/pages/builds" -d "access_token=%GITEE_TOKEN%"
  echo.
) else (
  echo [deploy] Tip: set GITEE_TOKEN to auto-trigger the Pages rebuild.
  echo [deploy] First time only: Repo -^> Services -^> Gitee Pages -^> select branch "gh-pages" -^> Start.
)
echo [deploy] Done. Site: https://kongjingnengbai.gitee.io/ode-to-chaos/
exit /b 0

:fail
echo [deploy] FAILED - see messages above.
git worktree remove --force %WT% >nul 2>&1
git branch -D %BR% >nul 2>&1
git worktree prune >nul 2>&1
exit /b 1
