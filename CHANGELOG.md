# Ghost-CLI Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.0.0-alpha.16"></a>
# [1.0.0-alpha.16](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.15...1.0.0-alpha.16) (2017-03-23)

### Bug Fixes
* **ls:** store running environment in system config ([99be519](https://github.com/TryGhost/Ghost-CLI/commit/99be519))

<a name="1.0.0-alpha.15"></a>
# [1.0.0-alpha.15](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.14...1.0.0-alpha.15) (2017-03-22)


### Bug Fixes

* **process-error:** ensure stdout exists before trying to log it ([a9bced6](https://github.com/TryGhost/Ghost-CLI/commit/a9bced6))
* **ssl:** bump minimum supported node version to 4.5 ([833d8d0](https://github.com/TryGhost/Ghost-CLI/commit/833d8d0)), closes [#176](https://github.com/TryGhost/Ghost-CLI/issues/176)


### Features

* **config:** add auth advanced config option ([ebc8315](https://github.com/TryGhost/Ghost-CLI/commit/ebc8315)), closes [#175](https://github.com/TryGhost/Ghost-CLI/issues/175)
* **ls:** show stopped ghost instances as well as running ones ([ee85403](https://github.com/TryGhost/Ghost-CLI/commit/ee85403)), closes [#178](https://github.com/TryGhost/Ghost-CLI/issues/178)


### BREAKING CHANGES

* **ssl:** drop support for node 4 < 4.5

<a name="1.0.0-alpha.14"></a>
# [1.0.0.alpha.14](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.13...1.0.0-alpha.14) (2017-03-16)

### Bug Fixes

* **doctor:** fix error handling in setup checks ([e25b810](https://github.com/TryGhost/Ghost-CLI/commit/e25b810)), closes [#174](https://github.com/TryGhost/Ghost-CLI/issues/174)
* **install:** don't fail install if debug logs are present ([111e599](https://github.com/TryGhost/Ghost-CLI/commit/111e599)), closes [#173](https://github.com/TryGhost/Ghost-CLI/issues/173)
* **log:** catch errors thrown from prettystream ([40e6a79](https://github.com/TryGhost/Ghost-CLI/commit/40e6a79))
* **log:** return rejected error promise in ghost log rather than throw ([86c81ee](https://github.com/TryGhost/Ghost-CLI/commit/86c81ee))
* **nginx:** ensure nginx doesn't run if config already exists ([3ba9bc7](https://github.com/TryGhost/Ghost-CLI/commit/3ba9bc7))
* **update:** fix update command when install folder already exists ([da4e1d9](https://github.com/TryGhost/Ghost-CLI/commit/da4e1d9)), closes [#168](https://github.com/TryGhost/Ghost-CLI/issues/168)

### Features

* **config:** add logging transport configuration option ([f827ea4](https://github.com/TryGhost/Ghost-CLI/commit/f827ea4))
* **log:** ghost log command ([7e1a29a](https://github.com/TryGhost/Ghost-CLI/commit/7e1a29a)), closes [#42](https://github.com/TryGhost/Ghost-CLI/issues/42)
* **startup:** validate config on startup ([1f9383f](https://github.com/TryGhost/Ghost-CLI/commit/1f9383f)), closes [#26](https://github.com/TryGhost/Ghost-CLI/issues/26)

## 1.0.0-alpha.13

- bump minimum supported ghost alpha version to 1.0.0-alpha.15
- ✨ Error Handling
- 🎨 deps: debug@2.6.1
- 📖 add .vscode dir to gitignore
- 🎨 acceptance test improvements
- 🎨 use os.homedir() to get the location of the system config dir
- ⬆ deps: yarn@0.21.3
- ⬆ deps: knex-migrator@2.0.8
- ✨ Nginx Service
- ✨ add ability for services to register their own commands
- 🎨 🐎 improve `ghost run` memory usage by migrating during ghost start
- 🎨 fix race conditions in start and stop commands
- 🎨 cleanup process manager handling in service manager
- 🎨 fix setup check error handling
- 🎨 fix instance class loading on case sensitive filesystems
- 💄 improve spinner handling in ui class
- 🐛 fix(yarn): ensure local version of yarn is run correctly
- chore(deps): yarn@0.20.3
- chore: update yarn.lock
- ⬆ chore(deps): update-notifier@2.1.0
- ⬆ chore(deps): rxjs@5.2.0
- ⬆ chore(deps): listr@0.11.0
- ⬆ chore(deps): inquirer@3.0.4
- ⬆ chore(deps): fkill@4.1.0
- ⬆ chore(deps): execa@0.6.0
- ⬆ bump dev dependencies and remove greenkeeper ignored deps
- 🐛 add service to internal service list before calling init
- 🐛 💄 add ui methods to temporarily halt spinning if necessary
- 🐛 ensure dedupeProcessName util doesn't fail if  no running instances
- 🎨 re-order prompts in setup to make more logical sense
- ✨🔥 Services
- :art: more config shortcuts - load config by environment
- :art: run `ghost stop --all` in the same process
- :art: setup command cleanup
- :art: cache config objects by absolute filepath
- :art: index running Ghost instances by process name
- :lipstick: make `ghost start` smarter with the node environment
- ⚙  add adminUrl option to list of configuration options
- chore(deps): update yarn.lock
- chore(package): update update-notifier to version 2.0.0
- chore(package): update rxjs to version 5.1.1
- chore(package): update coveralls to version 2.11.16

## 1.0.0-alpha.12
- update knex-migrator to version 2.0.7 @greenkeeperio-bot
- :bug: fix `ghost stop` command from failing [@acburdine](https://github.com/acburdine)
- :sparkles: add `--all` option to ghost stop to kill all running ghost processes [@acburdine](https://github.com/acburdine)
- :art: move registering/deregistering instance to ghost start/stop commands [@acburdine](https://github.com/acburdine)
- :sparkles: `ghost ls` command [@acburdine](https://github.com/acburdine)
- :lipstick: add table method to UI class via cli-table-2 [@acburdine](https://github.com/acburdine)
- :art: wrap child process management for `ghost run` inside a class [@acburdine](https://github.com/acburdine)
- :sparkles: add configuration utilities for the global config folder and file [@acburdine](https://github.com/acburdine)
- :art: make `ghost buster` command use yarn utility
- :book: update readme with link to wiki command reference [@acburdine](https://github.com/acburdine)
- :art: :sparkles: improve process manager handling on unsupported environments [@acburdine](https://github.com/acburdine)

## 1.0.0-alpha.11
- :art: improve port handling in config [@acburdine](https://github.com/acburdine)
- :art: expand config handleAdvancedOptions function to allow for Promises [@acburdine](https://github.com/acburdine)
- :bug: ensure truthy value of regex match is returned in validation [@acburdine](https://github.com/acburdine)
- chore: update yarn.lock [@acburdine](https://github.com/acburdine)
- update knex-migrator to version 2.0.5 @greenkeeperio-bot
- update eslint to version 3.15.0 @greenkeeperio-bot
- update rxjs to version 5.1.0 @greenkeeperio-bot
- :bug: don't mutate process.env using lodash methods [@acburdine](https://github.com/acburdine)
- include yarn.lock in npm publish [@acburdine](https://github.com/acburdine)

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
