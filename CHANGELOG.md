# Ghost-CLI Changelog

## 1.0.0-alpha.8
- :arrow_up: bump min Ghost version to 1.0.0-alpha.9 @acburdine
- :art: :bug: revert to simple systemd service @acburdine
- :checkered_flag: use `npm.cmd` instead of `npm` on windows (#94) @cyhsutw
- :sparkles: systemd process manager @acburdine
- :art: fix setup config handling @acburdine
- :art: :sparkles: add process manager hooks @acburdine
- :sparkles: add ghost system stack checks to setup (#92) @acburdine
- :art: more config improvements @acburdine
- update inquirer to version 1.2.3 (#86) @greenkeeperio-bot
- update lodash to version 4.17.2 (#93) @greenkeeperio-bot
- update eslint to version 3.10.2 (#91) @greenkeeperio-bot
- update coveralls to version 2.11.15 (#84) @greenkeeperio-bot

## 1.0.0-alpha.7
- :art: Minor messaging improvements
- :art: Prompt for mysql database information
- :art: ensure leading v is stripped from provided ghost version
- :art: Pass contentPath to ghost process via environment variable
- :sparkles: :fire: Make ghost run wait for Ghost to finish starting
- :art: fixes for `ghost install local`

## 1.0.0-alpha.6
- :bug: Ensure correct command name is shown in error output
- :art: Ensure logs folder is created on ghost install
- :art: Use knex-migrator error codes to check for migration error

## 1.0.0-alpha.5
- :lipstick: output blog url on start
- :sparkles: Add `ghost run` command
- :book: Switch from jscs/jshint to eslint for linting
- :art: Refactor local process manager to better watch for database initialization

## 1.0.0-alpha.4
- :art: addition of a `--force` option to `ghost update` that clears out the version to be installed if it exists
- :sparkles: Ghost database migration support added

## 1.0.0-alpha.3
- :art: Make `-v` the version flag instead of `-V`
- :bug: Ghost-CLI won't install an already installed version of Ghost
- :bug: Local process manager now won't fail if process does not exist
- :bug: Ensure the .ghostpid file is always cleared by the local process manager
- :sparkles: `ghost setup` command
- :art: `ghost install --url` can now specify the url without prompting

## 1.0.0-alpha.2
- :sparkles: New `ghost install local` shortcut that offers a quick way to install locally for theme developers
- :bug: Ensure environment is used correctly when running `ghost start`
- :bug: Ensure `ghost update` maintains the currently running node environment
- :bug: Ensure lodash is required correctly on case-sensitive filesystems

## 1.0.0-alpha.1
- Initial Version
