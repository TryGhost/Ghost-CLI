# Ghost-CLI Changelog

## 1.0.0-alpha.10
- :fire: :sparkles: switch to using yarn over npm [@acburdine](https://github.com/acburdine)
- :art: knex-migrator: migrate if needed [@kirrg001](https://github.com/kirrg001)
- update yarn.lock [@acburdine](https://github.com/acburdine)
- update eslint to version 3.14.1 @greenkeeperio-bot
- update ora to version 1.1.0 @greenkeeperio-bot
- update inquirer to version 3.0.1 @greenkeeperio-bot
- :green_heart: fix test issue on node 6 [@acburdine](https://github.com/acburdine)
- update knex-migrator to version 2.0.4 @greenkeeperio-bot
- ensure cli-spec.js is tested [@acburdine](https://github.com/acburdine)
- :green_heart: fix tests for refactor [@acburdine](https://github.com/acburdine)
- Remove unnecessary core-object dependency [@acburdine](https://github.com/acburdine)
- :fire: :sparkles: ES6/CLI task refactor [@acburdine](https://github.com/acburdine)
- update knex-migrator to version 2.0.2 @greenkeeperio-bot
- update knex-migrator to version 2.0.1 @greenkeeperio-bot
- allow for command aliases [@acburdine](https://github.com/acburdine)
- :art: deps: execa@0.5.0 [@acburdine](https://github.com/acburdine)
- :fire: replace spinner class with `ora` npm module [@acburdine](https://github.com/acburdine)
- :sparkles: add yarn.lock and use yarn in travis tests
- update core-object to version 3.0.0 @greenkeeperio-bot
- update validator to version 6.2.1 @greenkeeperio-bot
- update lodash to version 4.17.4 @greenkeeperio-bot
- update bluebird to version 3.4.7 @greenkeeperio-bot
- update update-notifier to version 1.0.3 @greenkeeperio-bot
- update inquirer to version 2.0.0 @greenkeeperio-bot
- update fs-extra to version 2.0.0 @greenkeeperio-bot
- update eslint to version 3.13.1 @greenkeeperio-bot
- update eslint to version 3.13.0 @greenkeeperio-bot
- add copyright to README [@JohnONolan](https://github.com/JohnONolan)
- :fire: drop node 0.12 from supported versions and Travis testing [@acburdine](https://github.com/acburdine)
- update copyright year [@acburdine](https://github.com/acburdine)
- update eslint to version 3.12.1 @greenkeeperio-bot
- update symlink-or-copy to version 1.1.8 @greenkeeperio-bot
- update eslint to version 3.11.1 @greenkeeperio-bot
- update eslint to version 3.11.0 @greenkeeperio-bot
- update mocha to version 3.2.0 @greenkeeperio-bot

## 1.0.0-alpha.9
- :sparkles: `ghost restart` command @acburdine
- :art: switch to using sudo for systemctl commands @acburdine
- :art: :lipstick: improve invalid password error handling in systemd service @acburdine
- :bug: fix `ghost install local` usage @acburdine

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
