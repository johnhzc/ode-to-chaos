@echo off
rem Push main + gh-pages to GitHub via the REST API (works even when
rem github.com git access is blocked). Token comes from GITHUB_TOKEN env
rem or the local git credential store; never printed.
rem Usage: npm run deploy:github
rem NOTE: keep this file ASCII-only -- Chinese chars get mangled by cmd (GBK).
node "%~dp0deploy-github.mjs" %*
