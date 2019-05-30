# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.10.1"></a>
## [1.10.1](https://github.com/TryGhost/Ghost-CLI/compare/1.10.0...1.10.1) (2019-05-30)


### Bug Fixes

* **extension:** prompt default should be index not key ([#935](https://github.com/TryGhost/Ghost-CLI/issues/935)) ([b8401ec](https://github.com/TryGhost/Ghost-CLI/commit/b8401ec))
* **resolve-version:** sort versions before retrieving latest ([#939](https://github.com/TryGhost/Ghost-CLI/issues/939)) ([8a17c8b](https://github.com/TryGhost/Ghost-CLI/commit/8a17c8b))
* **system:** improve hasInstance check ([#940](https://github.com/TryGhost/Ghost-CLI/issues/940)) ([aad60a6](https://github.com/TryGhost/Ghost-CLI/commit/aad60a6)), closes [#936](https://github.com/TryGhost/Ghost-CLI/issues/936)
* **ui:** return correct default value for list prompts ([8dc7441](https://github.com/TryGhost/Ghost-CLI/commit/8dc7441))


### Features

* add check-update command ([#881](https://github.com/TryGhost/Ghost-CLI/issues/881)) ([527104b](https://github.com/TryGhost/Ghost-CLI/commit/527104b)), closes [#876](https://github.com/TryGhost/Ghost-CLI/issues/876)
* **nginx:** customisable paths & program name ([#932](https://github.com/TryGhost/Ghost-CLI/issues/932)) ([94389d5](https://github.com/TryGhost/Ghost-CLI/commit/94389d5))



<a name="1.10.0"></a>
# [1.10.0](https://github.com/TryGhost/Ghost-CLI/compare/1.10.0-rc.1...1.10.0) (2019-04-22)



<a name="1.10.0-rc.1"></a>
# [1.10.0-rc.1](https://github.com/TryGhost/Ghost-CLI/compare/1.10.0-rc.0...1.10.0-rc.1) (2019-04-22)


### Bug Fixes

* **deps:** update rxjs to v6 ([cbe6390](https://github.com/TryGhost/Ghost-CLI/commit/cbe6390))



<a name="1.10.0-rc.0"></a>
# [1.10.0-rc.0](https://github.com/TryGhost/Ghost-CLI/compare/1.10.0-beta.1...1.10.0-rc.0) (2019-04-20)


### Bug Fixes

* **help:** Bigger max width for help output ([33e76fd](https://github.com/TryGhost/Ghost-CLI/commit/33e76fd))
* **help:** Group global options together ([84f9012](https://github.com/TryGhost/Ghost-CLI/commit/84f9012))
* **help:** Hacky fix for incorrect option name ([15d14e6](https://github.com/TryGhost/Ghost-CLI/commit/15d14e6))
* **help:** remove dupe alias of check-mem in install ([4e37d56](https://github.com/TryGhost/Ghost-CLI/commit/4e37d56))
* **help:** Tweak help argument display order ([3eb1961](https://github.com/TryGhost/Ghost-CLI/commit/3eb1961))



<a name="1.10.0-beta.1"></a>
# [1.10.0-beta.1](https://github.com/TryGhost/Ghost-CLI/compare/1.10.0-beta.0...1.10.0-beta.1) (2019-04-15)


### Bug Fixes

* **install:** ignore dotfiles except for .ghost-cli in dir check ([0bd929b](https://github.com/TryGhost/Ghost-CLI/commit/0bd929b)), closes [#868](https://github.com/TryGhost/Ghost-CLI/issues/868)
* **update:** maintain instance state ([#818](https://github.com/TryGhost/Ghost-CLI/issues/818)) ([f67c4bf](https://github.com/TryGhost/Ghost-CLI/commit/f67c4bf))


### Features

* **pre-checks:** add ability to skip pre-checks with env var ([6c5a49c](https://github.com/TryGhost/Ghost-CLI/commit/6c5a49c)), closes [#867](https://github.com/TryGhost/Ghost-CLI/issues/867)
* **yarn:** use package-json instead of yarn for version resolution ([e68b65d](https://github.com/TryGhost/Ghost-CLI/commit/e68b65d))



<a name="1.10.0-beta.0"></a>
# [1.10.0-beta.0](https://github.com/TryGhost/Ghost-CLI/compare/1.9.9...1.10.0-beta.0) (2019-01-26)


### Features

* **setup:** refactor setup command ([9cb3138](https://github.com/TryGhost/Ghost-CLI/commit/9cb3138)), closes [#594](https://github.com/TryGhost/Ghost-CLI/issues/594) [#588](https://github.com/TryGhost/Ghost-CLI/issues/588)

### Bug Fixes

* **compat-check:** handle cli prerelease case ([9906ab6](https://github.com/TryGhost/Ghost-CLI/commit/9906ab6))


<a name="1.9.9"></a>
## [1.9.9](https://github.com/TryGhost/Ghost-CLI/compare/1.9.8...1.9.9) (2019-01-14)



<a name="1.9.8"></a>
## [1.9.8](https://github.com/TryGhost/Ghost-CLI/compare/1.9.7...1.9.8) (2018-11-07)



<a name="1.9.7"></a>
## [1.9.7](https://github.com/TryGhost/Ghost-CLI/compare/1.9.6...1.9.7) (2018-10-30)


### Bug Fixes

* **ui:** default exitOnError to true in listr opts ([58806da](https://github.com/TryGhost/Ghost-CLI/commit/58806da))


### Features

* **instance:** add isSetup getter ([c81070c](https://github.com/TryGhost/Ghost-CLI/commit/c81070c))
* **node:** add support for node v10 ([cccddae](https://github.com/TryGhost/Ghost-CLI/commit/cccddae))
* **renderer:** log task output if skipped ([463d706](https://github.com/TryGhost/Ghost-CLI/commit/463d706))
* **system:** add hasInstance method ([65bc340](https://github.com/TryGhost/Ghost-CLI/commit/65bc340))



<a name="1.9.6"></a>
## [1.9.6](https://github.com/TryGhost/Ghost-CLI/compare/1.9.5...1.9.6) (2018-10-02)


### Bug Fixes

* **pre-check:** don't run config check if folder doesn't exist ([baa351c](https://github.com/TryGhost/Ghost-CLI/commit/baa351c)), closes [#834](https://github.com/TryGhost/Ghost-CLI/issues/834)



<a name="1.9.5"></a>
## [1.9.5](https://github.com/TryGhost/Ghost-CLI/compare/1.9.4...1.9.5) (2018-10-02)


### Bug Fixes

* use correct task function property in pre-checks ([1674e7e](https://github.com/TryGhost/Ghost-CLI/commit/1674e7e))


### Features

* add 'clearOnSuccess' option to renderer ([7cfbfb7](https://github.com/TryGhost/Ghost-CLI/commit/7cfbfb7))
* **pre-checks:** add ~/.config folder ownership to pre-run checks ([e9e640f](https://github.com/TryGhost/Ghost-CLI/commit/e9e640f)), closes [#675](https://github.com/TryGhost/Ghost-CLI/issues/675)



<a name="1.9.4"></a>
## [1.9.4](https://github.com/TryGhost/Ghost-CLI/compare/1.9.3...1.9.4) (2018-09-13)


### Bug Fixes

* make admin & url validation the same ([29acafe](https://github.com/TryGhost/Ghost-CLI/commit/29acafe))
* **utils:** fix logic error in url validator ([c8f3554](https://github.com/TryGhost/Ghost-CLI/commit/c8f3554))


### Features

* added transform to handle urls without proto ([581c901](https://github.com/TryGhost/Ghost-CLI/commit/581c901)), closes [#812](https://github.com/TryGhost/Ghost-CLI/issues/812) [#812](https://github.com/TryGhost/Ghost-CLI/issues/812)



<a name="1.9.3"></a>
## [1.9.3](https://github.com/TryGhost/Ghost-CLI/compare/1.9.2...1.9.3) (2018-09-04)

### Features

* add --auto flag to make setup quicker ([89a92c0](https://github.com/TryGhost/Ghost-CLI/commit/89a92c0)), closes [#806](https://github.com/TryGhost/Ghost-CLI/issues/806)

<a name="1.9.2"></a>
## [1.9.2](https://github.com/TryGhost/Ghost-CLI/compare/1.9.1...1.9.2) (2018-08-29)

### Bug Fixes

* **doctor:** set find maxBuffer to infinity ([a681542](https://github.com/TryGhost/Ghost-CLI/commit/a681542)), closes [#801](https://github.com/TryGhost/Ghost-CLI/issues/801)
* **ui:** make sudo prompt more clear ([02d506a](https://github.com/TryGhost/Ghost-CLI/commit/02d506a)), closes [#797](https://github.com/TryGhost/Ghost-CLI/issues/797)

### Features

* **stack:** add support for ubuntu 18 ([7d17adb](https://github.com/TryGhost/Ghost-CLI/commit/7d17adb)), closes [#794](https://github.com/TryGhost/Ghost-CLI/issues/794)

<a name="1.9.1"></a>
## [1.9.1](https://github.com/TryGhost/Ghost-CLI/compare/1.9.0...1.9.1) (2018-08-20)

### Bug Fixes

* **ui:** ensure demo post url is output correctly ([#785](https://github.com/TryGhost/Ghost-CLI/issues/785)) ([b054939](https://github.com/TryGhost/Ghost-CLI/commit/b054939))
* **version-resolver:** allow v2 updates w/ multiple v2 releases ([fc12d22](https://github.com/TryGhost/Ghost-CLI/commit/fc12d22))
* **zip:** ensure zip upgrades from v2 to next v2 work ([4ae1f42](https://github.com/TryGhost/Ghost-CLI/commit/4ae1f42))

<a name="1.9.0"></a>
# [1.9.0](https://github.com/TryGhost/Ghost-CLI/compare/1.8.1...1.9.0) (2018-08-16)

### Bug Fixes

* **config:** disallow URLs ending with `/ghost` ([0dfb6d3](https://github.com/TryGhost/Ghost-CLI/commit/0dfb6d3))
* **migrate:** optimise error handling in migrator task ([be2c923](https://github.com/TryGhost/Ghost-CLI/commit/be2c923)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **migrations:** sudo - don't fail with existing settings folder ([dc2d0f5](https://github.com/TryGhost/Ghost-CLI/commit/dc2d0f5)), closes [#776](https://github.com/TryGhost/Ghost-CLI/issues/776)
* **nginx:** skip uninstall if url is not set ([9e27b59](https://github.com/TryGhost/Ghost-CLI/commit/9e27b59))
* **start:** properly print admin URLs for blogs in a subdir ([975049c](https://github.com/TryGhost/Ghost-CLI/commit/975049c))
* show spinner during update check ([c9cf6d3](https://github.com/TryGhost/Ghost-CLI/commit/c9cf6d3))
* **systemd:** improve error handling of instance failed state ([0f00c03](https://github.com/TryGhost/Ghost-CLI/commit/0f00c03)), closes [#761](https://github.com/TryGhost/Ghost-CLI/issues/761)
* **tests:** stub system class for command checkRoot ([ba18452](https://github.com/TryGhost/Ghost-CLI/commit/ba18452))
* **ui:** don't overwrite default options ([1357cc6](https://github.com/TryGhost/Ghost-CLI/commit/1357cc6))
* **v2:** allow prerelease->pre/stable upgrades in zips ([10bd8c4](https://github.com/TryGhost/Ghost-CLI/commit/10bd8c4))
* **v2:** changed major version comparison ([d243bed](https://github.com/TryGhost/Ghost-CLI/commit/d243bed)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **v2:** enforce v1 => v2 migration rules with zips ([c1af61e](https://github.com/TryGhost/Ghost-CLI/commit/c1af61e)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **v2:** ensure `ghost update --force` correctly jumps to v2 ([8093274](https://github.com/TryGhost/Ghost-CLI/commit/8093274)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **v2:** ensure migrate script validates Casper correctly ([93d191f](https://github.com/TryGhost/Ghost-CLI/commit/93d191f)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)

### Features

* **flag:** add --v1 flag to install and update ([eb315c3](https://github.com/TryGhost/Ghost-CLI/commit/eb315c3)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **flags:** add global `dir` option ([e9ec39a](https://github.com/TryGhost/Ghost-CLI/commit/e9ec39a)), closes [#538](https://github.com/TryGhost/Ghost-CLI/issues/538)
* **migrate:** execute database rollback on rollback ([#774](https://github.com/TryGhost/Ghost-CLI/issues/774)) ([f56e600](https://github.com/TryGhost/Ghost-CLI/commit/f56e600)), closes [#699](https://github.com/TryGhost/Ghost-CLI/issues/699)
* **update:** add auto rollback of failed updates ([4f00353](https://github.com/TryGhost/Ghost-CLI/commit/4f00353)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **v2:** added v2 migrate task ([#771](https://github.com/TryGhost/Ghost-CLI/issues/771)) ([e9ed36b](https://github.com/TryGhost/Ghost-CLI/commit/e9ed36b)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **v2:** avoid direct upgrade to v2 ([#770](https://github.com/TryGhost/Ghost-CLI/issues/770)) ([702e953](https://github.com/TryGhost/Ghost-CLI/commit/702e953)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)
* **v2:** update knex-migrator execution for Ghost 2.0 ([#765](https://github.com/TryGhost/Ghost-CLI/issues/765)) ([d6af62a](https://github.com/TryGhost/Ghost-CLI/commit/d6af62a)), closes [#759](https://github.com/TryGhost/Ghost-CLI/issues/759)

<a name="1.8.1"></a>
## [1.8.1](https://github.com/TryGhost/Ghost-CLI/compare/1.8.0...1.8.1) (2018-06-05)

### Bug Fixes

* **run:** local process manager forwards Ghost error message correctly ([abaf834](https://github.com/TryGhost/Ghost-CLI/commit/abaf834)), closes [#742](https://github.com/TryGhost/Ghost-CLI/issues/742)

<a name="1.8.0"></a>
# [1.8.0](https://github.com/TryGhost/Ghost-CLI/compare/1.7.3...1.8.0) (2018-05-29)

### Bug Fixes

* **buster:** make buster a global command ([#735](https://github.com/TryGhost/Ghost-CLI/issues/735)) ([9cb99b0](https://github.com/TryGhost/Ghost-CLI/commit/9cb99b0))
* **config:** don't overwrite url port if port is manually specified ([b094495](https://github.com/TryGhost/Ghost-CLI/commit/b094495)), closes [#592](https://github.com/TryGhost/Ghost-CLI/issues/592)
* **doctor:** ensure folder check considers setuid, setgid, and sticky bits ([#729](https://github.com/TryGhost/Ghost-CLI/issues/729)) ([a0a31a9](https://github.com/TryGhost/Ghost-CLI/commit/a0a31a9)), closes [#724](https://github.com/TryGhost/Ghost-CLI/issues/724)
* **extensions:** fix error when global modules folder doesn't exist ([78bb197](https://github.com/TryGhost/Ghost-CLI/commit/78bb197)), closes [#723](https://github.com/TryGhost/Ghost-CLI/issues/723)
* **linux:** remove strict no such user error message checking ([0552372](https://github.com/TryGhost/Ghost-CLI/commit/0552372)), closes [#676](https://github.com/TryGhost/Ghost-CLI/issues/676)
* **migrate:** move setting of content-path to setup ([1752cc8](https://github.com/TryGhost/Ghost-CLI/commit/1752cc8)), closes [#708](https://github.com/TryGhost/Ghost-CLI/issues/708)
* **migrate:** remove unnecessary config overwrite during db migrations ([610143b](https://github.com/TryGhost/Ghost-CLI/commit/610143b)), closes [#708](https://github.com/TryGhost/Ghost-CLI/issues/708)
* **update-check:** swap out update-notifier for simpler check ([e11e8b8](https://github.com/TryGhost/Ghost-CLI/commit/e11e8b8)), closes [#675](https://github.com/TryGhost/Ghost-CLI/issues/675)
* **yarn-install:** remove folder on ghost download error ([c96a768](https://github.com/TryGhost/Ghost-CLI/commit/c96a768)), closes [#726](https://github.com/TryGhost/Ghost-CLI/issues/726)

### Features

* **config:** add config get & set subcommands ([687c499](https://github.com/TryGhost/Ghost-CLI/commit/687c499))

<a name="1.7.3"></a>
## [1.7.3](https://github.com/TryGhost/Ghost-CLI/compare/1.7.2...1.7.3) (2018-05-10)

### Bug Fixes

* **doctor:** skip install dir checks for local installs ([#712](https://github.com/TryGhost/Ghost-CLI/issues/712)) ([4715aae](https://github.com/TryGhost/Ghost-CLI/commit/4715aae)), closes [#711](https://github.com/TryGhost/Ghost-CLI/issues/711)

### Features

* **start:** direct user to admin interface ([2850af3](https://github.com/TryGhost/Ghost-CLI/commit/2850af3)), closes [#665](https://github.com/TryGhost/Ghost-CLI/issues/665)

<a name="1.7.2"></a>
## [1.7.2](https://github.com/TryGhost/Ghost-CLI/compare/1.7.1...1.7.2) (2018-05-01)
### Bug Fixes

* **tests:** do not assert on current cli version ([839a363](https://github.com/TryGhost/Ghost-CLI/commit/839a363))

<a name="1.7.1"></a>
## [1.7.1](https://github.com/TryGhost/Ghost-CLI/compare/1.7.0...1.7.1) (2018-04-11)

### Bug Fixes

* **migrations:** Use proper permissions to create content/settings folder ([#703](https://github.com/TryGhost/Ghost-CLI/issues/703)) ([9b0b0c5](https://github.com/TryGhost/Ghost-CLI/commit/9b0b0c5))

<a name="1.7.0"></a>
# [1.7.0](https://github.com/TryGhost/Ghost-CLI/compare/1.6.0...1.7.0) (2018-04-10)

### Bug Fixes

* **doctor:** Use systeminformation for memory availability ([1395646](https://github.com/TryGhost/Ghost-CLI/commit/1395646))
* **run:** Don't set contentPath in config when running ([f9c6711](https://github.com/TryGhost/Ghost-CLI/commit/f9c6711))

### Features

* **install:** create content/settings folder ([276b146](https://github.com/TryGhost/Ghost-CLI/commit/276b146))
* **migrations:** add core migration to create content/settings folder ([1d562e7](https://github.com/TryGhost/Ghost-CLI/commit/1d562e7))

<a name="1.6.0"></a>
# [1.6.0](https://github.com/TryGhost/Ghost-CLI/compare/1.5.2...1.6.0) (2018-03-26)

### Bug Fixes

* **help:** don't show aliases on help output ([2f67058](https://github.com/TryGhost/Ghost-CLI/commit/2f67058))
* **ls:** show more helpful message when no ghost instances found ([#682](https://github.com/TryGhost/Ghost-CLI/issues/682)) ([b250953](https://github.com/TryGhost/Ghost-CLI/commit/b250953))
* **mysql:** use % during user creation if remote db host ([791301a](https://github.com/TryGhost/Ghost-CLI/commit/791301a)), closes [#642](https://github.com/TryGhost/Ghost-CLI/issues/642)
* **port-polling:** connect over custom host if custom host is specified ([7d0c330](https://github.com/TryGhost/Ghost-CLI/commit/7d0c330)), closes [#643](https://github.com/TryGhost/Ghost-CLI/issues/643)
* **setup:** fix start/no-start option ([46d64f8](https://github.com/TryGhost/Ghost-CLI/commit/46d64f8)), closes [#615](https://github.com/TryGhost/Ghost-CLI/issues/615)
* **systemd:** run `isEnabled()` as sudo ([5552a0e](https://github.com/TryGhost/Ghost-CLI/commit/5552a0e))
* **systemd:** run `isRunning()` as sudo ([bf1a20e](https://github.com/TryGhost/Ghost-CLI/commit/bf1a20e))
* **utils:** differentiate root command error messages for DO ([a69ccc6](https://github.com/TryGhost/Ghost-CLI/commit/a69ccc6))

### Features

* **colors:** expose color-free logging option ([#653](https://github.com/TryGhost/Ghost-CLI/issues/653)) ([ba58fab](https://github.com/TryGhost/Ghost-CLI/commit/ba58fab)), closes [#457](https://github.com/TryGhost/Ghost-CLI/issues/457)
* **doctor:** check current user and dir owner ([9fbd3fd](https://github.com/TryGhost/Ghost-CLI/commit/9fbd3fd))
* **doctor:** check memory before running memory-intensive tasks ([a852cdd](https://github.com/TryGhost/Ghost-CLI/commit/a852cdd))
* **doctor:** prevent installations with ghost user ([dde6bf0](https://github.com/TryGhost/Ghost-CLI/commit/dde6bf0))
* **doctor:** skip user owner check for local process ([cdc9c31](https://github.com/TryGhost/Ghost-CLI/commit/cdc9c31))
* **doctor:** split check for ghost user and owner in two ([d893c16](https://github.com/TryGhost/Ghost-CLI/commit/d893c16))
* **doctor:** use new getGhostUid util ([f43b721](https://github.com/TryGhost/Ghost-CLI/commit/f43b721))
* **mem-check:** add skip flag ([6ccf6be](https://github.com/TryGhost/Ghost-CLI/commit/6ccf6be))
* **process:** allow process.isEnabled to return a promise ([#674](https://github.com/TryGhost/Ghost-CLI/issues/674)) ([c93124b](https://github.com/TryGhost/Ghost-CLI/commit/c93124b))
* **process-manager:** allow process isRunning to return a promise ([#669](https://github.com/TryGhost/Ghost-CLI/issues/669)) ([29b4a0b](https://github.com/TryGhost/Ghost-CLI/commit/29b4a0b))
* **state commands:** gracefully exit in noop situations ([e6e1ada](https://github.com/TryGhost/Ghost-CLI/commit/e6e1ada))
* **utils:** split use-ghost-user in two fn ([e8e2fb4](https://github.com/TryGhost/Ghost-CLI/commit/e8e2fb4))

### Performance Improvements

* **bootstrap:** swap out `npm root` call for global-modules dep ([6184667](https://github.com/TryGhost/Ghost-CLI/commit/6184667))

<a name="1.5.2"></a>
## [1.5.2](https://github.com/TryGhost/Ghost-CLI/compare/1.5.1...1.5.2) (2018-02-12)

### Bug Fixes

* **port-polling:** increase port polling timeout ([#638](https://github.com/TryGhost/Ghost-CLI/issues/638)) ([8804372](https://github.com/TryGhost/Ghost-CLI/commit/8804372))

<a name="1.5.1"></a>
## [1.5.1](https://github.com/TryGhost/Ghost-CLI/compare/1.5.0...1.5.1) (2018-02-07)

### Bug Fixes

* **doctor:** exclude versions folder for file permissions check ([f1fdd31](https://github.com/TryGhost/Ghost-CLI/commit/f1fdd31))
* **ui:** disable allowPrompt if stdout is not a TTY ([b08cfa7](https://github.com/TryGhost/Ghost-CLI/commit/b08cfa7))
* **ui:** make confirm return default value with prompt disabled ([7d652f2](https://github.com/TryGhost/Ghost-CLI/commit/7d652f2))
* **uninstall:** only use sudo to remove content folder when needed ([5e386d2](https://github.com/TryGhost/Ghost-CLI/commit/5e386d2)), closes [#577](https://github.com/TryGhost/Ghost-CLI/issues/577)

<a name="1.5.0"></a>
# [1.5.0](https://github.com/TryGhost/Ghost-CLI/compare/1.4.2...1.5.0) (2018-02-07)

### Bug Fixes

* **checks:** show skipped instead of passed for stack & mysql checks ([c4a40a0](https://github.com/TryGhost/Ghost-CLI/commit/c4a40a0))
* **doctor:** add install-folder-permissions check to start ([a195fc1](https://github.com/TryGhost/Ghost-CLI/commit/a195fc1))
* **doctor:** improve permission denied error message ([#627](https://github.com/TryGhost/Ghost-CLI/issues/627)) ([9af537e](https://github.com/TryGhost/Ghost-CLI/commit/9af537e))
* **doctor:** refactor doctor command ([76829e9](https://github.com/TryGhost/Ghost-CLI/commit/76829e9))
* **doctor:** show help message for install folder checks ([#626](https://github.com/TryGhost/Ghost-CLI/issues/626)) ([0c81bab](https://github.com/TryGhost/Ghost-CLI/commit/0c81bab))
* **doctor:** skip some doctor checks for local installs post-install ([324a080](https://github.com/TryGhost/Ghost-CLI/commit/324a080))
* **doctor:** skip validate config check for running instances ([#623](https://github.com/TryGhost/Ghost-CLI/issues/623)) ([a94a987](https://github.com/TryGhost/Ghost-CLI/commit/a94a987))
* **instance:** query process managers in dev & prod if running not set ([c6b8b40](https://github.com/TryGhost/Ghost-CLI/commit/c6b8b40)), closes [#463](https://github.com/TryGhost/Ghost-CLI/issues/463)
* **local-process:** error if content folder owned by other user ([707ce6a](https://github.com/TryGhost/Ghost-CLI/commit/707ce6a)), closes [#501](https://github.com/TryGhost/Ghost-CLI/issues/501)
* **local-process:** make content folder check work in more cases ([710a9d4](https://github.com/TryGhost/Ghost-CLI/commit/710a9d4))
* **renderer:** only show enabled tasks ([3be25a8](https://github.com/TryGhost/Ghost-CLI/commit/3be25a8))
* **root-user:** don't check for root user on windows/macos ([3db21d6](https://github.com/TryGhost/Ghost-CLI/commit/3db21d6))
* **root-user:** improve error messages installs set up with root ([#631](https://github.com/TryGhost/Ghost-CLI/issues/631)) ([b161432](https://github.com/TryGhost/Ghost-CLI/commit/b161432))
* **root-user:** only skip exiting inside root install ([8fc693a](https://github.com/TryGhost/Ghost-CLI/commit/8fc693a))
* **setup:** skip ghost user setup if process manager is local ([edce827](https://github.com/TryGhost/Ghost-CLI/commit/edce827))
* **stop command:** update extension query key ([b8c49bb](https://github.com/TryGhost/Ghost-CLI/commit/b8c49bb))
* **systemd:** improve systemd precheck error messages ([#628](https://github.com/TryGhost/Ghost-CLI/issues/628)) ([208bb15](https://github.com/TryGhost/Ghost-CLI/commit/208bb15))
* **update-check:** don't warn for prerelease or build ([05a4171](https://github.com/TryGhost/Ghost-CLI/commit/05a4171))

### Features

* **command:** prevent commands run as root user ([#604](https://github.com/TryGhost/Ghost-CLI/issues/604)) ([01481b0](https://github.com/TryGhost/Ghost-CLI/commit/01481b0))
* **doctor:** allow extensions to provide doctor checks ([4702ce8](https://github.com/TryGhost/Ghost-CLI/commit/4702ce8))
* **doctor:** content folder permission checks ([#610](https://github.com/TryGhost/Ghost-CLI/issues/610)) ([0075e77](https://github.com/TryGhost/Ghost-CLI/commit/0075e77))
* **doctor:** detect incorrect permissions ([#613](https://github.com/TryGhost/Ghost-CLI/issues/613)) ([6b614f7](https://github.com/TryGhost/Ghost-CLI/commit/6b614f7)), closes [#294](https://github.com/TryGhost/Ghost-CLI/issues/294)
* **doctor:** run all checks and print summary of errors ([ca68049](https://github.com/TryGhost/Ghost-CLI/commit/ca68049))
* **log:** Log improvements for `ghost update` ([59f5d03](https://github.com/TryGhost/Ghost-CLI/commit/59f5d03))
* **process:** ensure that Ghost is started ([#612](https://github.com/TryGhost/Ghost-CLI/issues/612)) ([8c68889](https://github.com/TryGhost/Ghost-CLI/commit/8c68889)), closes [#472](https://github.com/TryGhost/Ghost-CLI/issues/472)
* **ssl:** improve error messages to log original error ([#595](https://github.com/TryGhost/Ghost-CLI/issues/595)) ([509aa5a](https://github.com/TryGhost/Ghost-CLI/commit/509aa5a))
* **system:** add os and version to System class ([#602](https://github.com/TryGhost/Ghost-CLI/issues/602)) ([bd24652](https://github.com/TryGhost/Ghost-CLI/commit/bd24652))
* **ui:** add `ghost doctor` reference to error messages ([c25c141](https://github.com/TryGhost/Ghost-CLI/commit/c25c141))
* **ui:** allow UI error method to handle listr errors ([dc419f9](https://github.com/TryGhost/Ghost-CLI/commit/dc419f9))
* **update:** run doctor checks on ghost update ([0ca80a7](https://github.com/TryGhost/Ghost-CLI/commit/0ca80a7))

<a name="1.4.2"></a>
## [1.4.2](https://github.com/TryGhost/Ghost-CLI/compare/1.4.1...1.4.2) (2018-01-07)

### Bug Fixes

* **setup:** ensure --pname arg is sanitized ([229953b](https://github.com/TryGhost/Ghost-CLI/commit/229953b)), closes [#576](https://github.com/TryGhost/Ghost-CLI/issues/576)
* **update-check:** remove "out-of-date version" prompt ([dfb5ea6](https://github.com/TryGhost/Ghost-CLI/commit/dfb5ea6)), closes [#563](https://github.com/TryGhost/Ghost-CLI/issues/563)

<a name="1.4.1"></a>
## [1.4.1](https://github.com/TryGhost/Ghost-CLI/compare/1.4.0...1.4.1) (2017-12-12)

### Bug Fixes

* **update-check:** only run update check on specific commands ([581c14a](https://github.com/TryGhost/Ghost-CLI/commit/581c14a)), closes [#565](https://github.com/TryGhost/Ghost-CLI/issues/565) [#563](https://github.com/TryGhost/Ghost-CLI/issues/563)

<a name="1.4.0"></a>
# [1.4.0](https://github.com/TryGhost/Ghost-CLI/compare/1.3.0...1.4.0) (2017-12-01)

### Bug Fixes

* **config:** shorten default database name ([d8b6e0f](https://github.com/TryGhost/Ghost-CLI/commit/d8b6e0f)), closes [#508](https://github.com/TryGhost/Ghost-CLI/issues/508)
* **extension:** ensure require(ghost-cli) returns the root instance ([8a96fa1](https://github.com/TryGhost/Ghost-CLI/commit/8a96fa1))
* **mysql:** improve password compatibility of mysql user ([6927121](https://github.com/TryGhost/Ghost-CLI/commit/6927121)), closes [#511](https://github.com/TryGhost/Ghost-CLI/issues/511)
* **mysql:** re-order create user statements ([d690918](https://github.com/TryGhost/Ghost-CLI/commit/d690918))
* **nginx:** skip SSL setup if url is an IP address ([5ed1cfe](https://github.com/TryGhost/Ghost-CLI/commit/5ed1cfe)), closes [#301](https://github.com/TryGhost/Ghost-CLI/issues/301)
* **ssl-migration:** make the checks for migrating ssl more robust ([f5c8ee1](https://github.com/TryGhost/Ghost-CLI/commit/f5c8ee1)), closes [#552](https://github.com/TryGhost/Ghost-CLI/issues/552)

### Features

* **log:** add --error flag to `ghost log` ([462a58f](https://github.com/TryGhost/Ghost-CLI/commit/462a58f)), closes [#432](https://github.com/TryGhost/Ghost-CLI/issues/432)
* **update:** add option to disable restart on update ([0c3c974](https://github.com/TryGhost/Ghost-CLI/commit/0c3c974)), closes [#481](https://github.com/TryGhost/Ghost-CLI/issues/481)

<a name="1.3.0"></a>
# [1.3.0](https://github.com/TryGhost/Ghost-CLI/compare/1.2.1...1.3.0) (2017-11-16)

### Bug Fixes

* **config:** default port and custom ports ([a820687](https://github.com/TryGhost/Ghost-CLI/commit/a820687)), closes [#519](https://github.com/TryGhost/Ghost-CLI/issues/519)

### Features

* **db:** remove knex-migrator dep, use one installed with Ghost ([#505](https://github.com/TryGhost/Ghost-CLI/issues/505)) ([9b78843](https://github.com/TryGhost/Ghost-CLI/commit/9b78843))
* add additional node and cli version checks ([8ab4892](https://github.com/TryGhost/Ghost-CLI/commit/8ab4892))
* **migrations:** add migrate command & related utilities ([a532d03](https://github.com/TryGhost/Ghost-CLI/commit/a532d03))
* **ssl:** add ssl migration ([3c60d89](https://github.com/TryGhost/Ghost-CLI/commit/3c60d89)), closes [#495](https://github.com/TryGhost/Ghost-CLI/issues/495)
* **ui:** improve update notifications ([ff5e4ad](https://github.com/TryGhost/Ghost-CLI/commit/ff5e4ad)), closes [#525](https://github.com/TryGhost/Ghost-CLI/issues/525)

<a name="1.2.1"></a>
## [1.2.1](https://github.com/TryGhost/Ghost-CLI/compare/1.2.0...1.2.1) (2017-11-10)

### Bug Fixes

* node 8 compatibility ([#521](https://github.com/TryGhost/Ghost-CLI/issues/521)) ([e1fb3b0](https://github.com/TryGhost/Ghost-CLI/commit/e1fb3b0))

<a name="1.2.0"></a>
# [1.2.0](https://github.com/TryGhost/Ghost-CLI/compare/1.1.3...v1.2.0) (2017-10-30)

### Bug Fixes

* **nginx:** switch to `nginx -s reload` to reload nginx configuration ([9d502ef](https://github.com/TryGhost/Ghost-CLI/commit/9d502ef))
* **ssl:** rework how we use acme.sh ([6f30109](https://github.com/TryGhost/Ghost-CLI/commit/6f30109)), closes [#495](https://github.com/TryGhost/Ghost-CLI/issues/495)
* **ui:** improve sudo output suppression ([398fc27](https://github.com/TryGhost/Ghost-CLI/commit/398fc27))

### Features

* **ssl:** only generate dhparam and ssl-params once per server ([2dfe847](https://github.com/TryGhost/Ghost-CLI/commit/2dfe847)), closes [#487](https://github.com/TryGhost/Ghost-CLI/issues/487)
* enable node 8 support ([26dd314](https://github.com/TryGhost/Ghost-CLI/commit/26dd314b126ee030fb571a30705f970b3b90c2e9))

<a name="1.1.3"></a>
## [1.1.3](https://github.com/TryGhost/Ghost-CLI/compare/1.1.2...v1.1.3) (2017-10-10)

### Bug Fixes

* **config:** add 'ses' to valid mail config transport options (#492) ([7f51138](https://github.com/TryGhost/Ghost-CLI/commit/7f51138)), closes [#467](https://github.com/TryGhost/Ghost-CLI/issues/467)
* **config:** run environment check when not part of ghost setup ([9126a47](https://github.com/TryGhost/Ghost-CLI/commit/9126a47)), closes [#265](https://github.com/TryGhost/Ghost-CLI/issues/265)
* **setup:** strip undesirable characters out of DB name (#486) ([5878002](https://github.com/TryGhost/Ghost-CLI/commit/5878002))
* **system:** use mapSeries rather than each ([9500899](https://github.com/TryGhost/Ghost-CLI/commit/9500899))

<a name="1.1.2"></a>
## [1.1.2](https://github.com/TryGhost/Ghost-CLI/compare/1.1.1...1.1.2) (2017-10-06)

### Bug Fixes

* **config:** ensure non-string args are handled correctly ([8612df2](https://github.com/TryGhost/Ghost-CLI/commit/8612df2)), closes [#479](https://github.com/TryGhost/Ghost-CLI/issues/479)
* **config:** ensure port number is treated as an integer ([#452](https://github.com/TryGhost/Ghost-CLI/issues/452)) ([aeb772a](https://github.com/TryGhost/Ghost-CLI/commit/aeb772a)), closes [#451](https://github.com/TryGhost/Ghost-CLI/issues/451)
* **config:** offer better default database name when installing ([#454](https://github.com/TryGhost/Ghost-CLI/issues/454)) ([c40d628](https://github.com/TryGhost/Ghost-CLI/commit/c40d628)), closes [#453](https://github.com/TryGhost/Ghost-CLI/issues/453)
* **setup:** don’t rewrite no-start option when no-prompt is passed ([bbc2270](https://github.com/TryGhost/Ghost-CLI/commit/bbc2270))

<a name="1.1.1"></a>
## [1.1.1](https://github.com/TryGhost/Ghost-CLI/compare/1.1.0...1.1.1) (2017-08-17)

### Bug Fixes

* **config:** ensure port number is treated as an integer ([#452](https://github.com/TryGhost/Ghost-CLI/issues/452)) ([aeb772a](https://github.com/TryGhost/Ghost-CLI/commit/aeb772a)), closes [#451](https://github.com/TryGhost/Ghost-CLI/issues/451)

<a name="1.1.0"></a>
# [1.1.0](https://github.com/TryGhost/Ghost-CLI/compare/1.0.3...1.1.0) (2017-08-14)

### Bug Fixes

* **config:** 🐛  don't enforce case for mail config ([d0225f8](https://github.com/TryGhost/Ghost-CLI/commit/d0225f8)), closes [#421](https://github.com/TryGhost/Ghost-CLI/issues/421)
* **doctor:** add install checks for various nvm edge cases ([2a8de70](https://github.com/TryGhost/Ghost-CLI/commit/2a8de70)), closes [#281](https://github.com/TryGhost/Ghost-CLI/issues/281)
* **doctor:** ensure `ghost doctor startup` works on its own ([a41855d](https://github.com/TryGhost/Ghost-CLI/commit/a41855d)), closes [#436](https://github.com/TryGhost/Ghost-CLI/issues/436)
* **instance:** make running a function rather than a get/set ([0cef275](https://github.com/TryGhost/Ghost-CLI/commit/0cef275))
* **linux:** make ghost user regex check case insensitive ([2f1fcc6](https://github.com/TryGhost/Ghost-CLI/commit/2f1fcc6)), closes [#400](https://github.com/TryGhost/Ghost-CLI/issues/400)
* **mysql:** improve reliability of user creation queries ([8992681](https://github.com/TryGhost/Ghost-CLI/commit/8992681)), closes [#396](https://github.com/TryGhost/Ghost-CLI/issues/396)
* **nvm:** don't use local npm version when getting the bin ([ea30015](https://github.com/TryGhost/Ghost-CLI/commit/ea30015))
* **systemd:** use filename to determine previous setup ([10f8722](https://github.com/TryGhost/Ghost-CLI/commit/10f8722))

### Features

* **install:** add option to install/update using zip file ([cff1ed2](https://github.com/TryGhost/Ghost-CLI/commit/cff1ed2)), closes [#59](https://github.com/TryGhost/Ghost-CLI/issues/59)
* **install:** allow local installs to specify version ([cb6062f](https://github.com/TryGhost/Ghost-CLI/commit/cb6062f)), closes [#423](https://github.com/TryGhost/Ghost-CLI/issues/423)
* **update:** remove old ghost versions on ghost update ([46e454d](https://github.com/TryGhost/Ghost-CLI/commit/46e454d)), closes [#201](https://github.com/TryGhost/Ghost-CLI/issues/201)

### Performance Improvements

* lazily require modules in commands ([3f6d8cc](https://github.com/TryGhost/Ghost-CLI/commit/3f6d8cc))

<a name="1.0.3"></a>
## [1.0.3](https://github.com/TryGhost/Ghost-CLI/compare/1.0.2...1.0.3) (2017-08-01)

<a name="1.0.2"></a>
## [1.0.2](https://github.com/TryGhost/Ghost-CLI/compare/1.0.1...1.0.2) (2017-07-31)

### Bug Fixes

* **config:** only prompt if args aren't provided ([b8d6f67](https://github.com/TryGhost/Ghost-CLI/commit/b8d6f67))
* **doctor:** fix prompting and error handling with --no-prompt ([1641676](https://github.com/TryGhost/Ghost-CLI/commit/1641676)), closes [#410](https://github.com/TryGhost/Ghost-CLI/issues/410)
* **doctor:** skip parent folder perm check if linux user is skipped ([6eec35c](https://github.com/TryGhost/Ghost-CLI/commit/6eec35c)), closes [#405](https://github.com/TryGhost/Ghost-CLI/issues/405)
* **migrate:** improve error handling with sqlite install failure ([9c07274](https://github.com/TryGhost/Ghost-CLI/commit/9c07274))

<a name="1.0.1"></a>
## [1.0.1](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0...1.0.1) (2017-07-29)

### Bug Fixes

* **config:** Allow all wellknown mail services ([3cc07b9](https://github.com/TryGhost/Ghost-CLI/commit/3cc07b9)), closes [#383](https://github.com/TryGhost/Ghost-CLI/issues/383)
* **config:** transform urls to lowercase ([185334e](https://github.com/TryGhost/Ghost-CLI/commit/185334e)), closes [#399](https://github.com/TryGhost/Ghost-CLI/issues/399)
* **migration:** don't hide migration errors ([42a9832](https://github.com/TryGhost/Ghost-CLI/commit/42a9832)), closes [#378](https://github.com/TryGhost/Ghost-CLI/issues/378)
* **run:** disable update check on `ghost run` ([7abe68b](https://github.com/TryGhost/Ghost-CLI/commit/7abe68b)), closes [#356](https://github.com/TryGhost/Ghost-CLI/issues/356)
* **setup:** re-add ability for linux-user step to be skipped with flag ([605dd02](https://github.com/TryGhost/Ghost-CLI/commit/605dd02)), closes [#385](https://github.com/TryGhost/Ghost-CLI/issues/385)
* **ui:** fix typo in error output (#398) ([b44937f](https://github.com/TryGhost/Ghost-CLI/commit/b44937f)), closes [#398](https://github.com/TryGhost/Ghost-CLI/issues/398)

### Features

* **help:** add status as an alias for 'ls' (#380) ([0877523](https://github.com/TryGhost/Ghost-CLI/commit/0877523))

<a name="1.0.0"></a>
# [1.0.0](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-rc.4...v1.0.0) (2017-07-22)

### Bug Fixes

* **command:** make aliases work correctly ([fa3e6c8](https://github.com/TryGhost/Ghost-CLI/commit/fa3e6c8))

<a name="1.0.0-rc.4"></a>
# [1.0.0-rc.4](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-rc.3...1.0.0-rc.4) (2017-07-21)

### Bug Fixes

* **command:** Tweak valid install check output ([2e7c64f](https://github.com/TryGhost/Ghost-CLI/commit/2e7c64f))
* **help:** add onlyOptions argument to configureOptions ([1f77407](https://github.com/TryGhost/Ghost-CLI/commit/1f77407))
* **help:** explicit setup stages ([c3df8cb](https://github.com/TryGhost/Ghost-CLI/commit/c3df8cb))
* **help:** update descriptions to be more helpful ([debfa6b](https://github.com/TryGhost/Ghost-CLI/commit/debfa6b)), closes [#321](https://github.com/TryGhost/Ghost-CLI/issues/321)
* **local:** only force kill on Windows ([be95343](https://github.com/TryGhost/Ghost-CLI/commit/be95343)), closes [#368](https://github.com/TryGhost/Ghost-CLI/issues/368)
* **log:** check environment if instance is not running ([bc845de](https://github.com/TryGhost/Ghost-CLI/commit/bc845de))
* **nginx:** don't try to restart nginx when nginx isn't a thing ([61fc7c0](https://github.com/TryGhost/Ghost-CLI/commit/61fc7c0))

### Features

* **help:** add epilogue with docs link ([f8a37c8](https://github.com/TryGhost/Ghost-CLI/commit/f8a37c8))
* **help:** custom aliases ([44db436](https://github.com/TryGhost/Ghost-CLI/commit/44db436))
* **update:** add pre-stable warning message with docs link ([72b461f](https://github.com/TryGhost/Ghost-CLI/commit/72b461f)), closes [#364](https://github.com/TryGhost/Ghost-CLI/issues/364)

<a name="1.0.0-rc.3"></a>
# [1.0.0-rc.3](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-rc.2...1.0.0-rc.3) (2017-07-18)

### Bug Fixes

* **config:** add default dbpath when db is sqlite ([778aafa](https://github.com/TryGhost/Ghost-CLI/commit/778aafa))
* **doctor:** better directory permissions checks ([aa5b047](https://github.com/TryGhost/Ghost-CLI/commit/aa5b047)), closes [#355](https://github.com/TryGhost/Ghost-CLI/issues/355)
* **migrate:** re-work migrate step to run knex-migrator in a subprocess ([e8d4f31](https://github.com/TryGhost/Ghost-CLI/commit/e8d4f31)), closes [#349](https://github.com/TryGhost/Ghost-CLI/issues/349)
* **run:** extract use-ghost-user into a util ([13f442c](https://github.com/TryGhost/Ghost-CLI/commit/13f442c))
* **setup:** fix setup when `linux-user` is passed as a stage ([9408737](https://github.com/TryGhost/Ghost-CLI/commit/9408737))
* **windows:** fix local process manager on windows ([1655806](https://github.com/TryGhost/Ghost-CLI/commit/1655806)), closes [#228](https://github.com/TryGhost/Ghost-CLI/issues/228)

<a name="1.0.0-rc.2"></a>
# [1.0.0-rc.2](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-rc.1...1.0.0-rc.2) (2017-07-11)

### Bug Fixes

* **mysql:** prepend `/usr/sbin` to path for mysql check on linux ([2d4fe72](https://github.com/TryGhost/Ghost-CLI/commit/2d4fe72))

<a name="1.0.0-rc.1"></a>
# [1.0.0-rc.1](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-beta.6...1.0.0-rc.1) (2017-07-11)

### Bug Fixes

* **config:** better config prompt handling ([8cdbad4](https://github.com/TryGhost/Ghost-CLI/commit/8cdbad4)), closes [#280](https://github.com/TryGhost/Ghost-CLI/issues/280) [#268](https://github.com/TryGhost/Ghost-CLI/issues/268) [#317](https://github.com/TryGhost/Ghost-CLI/issues/317)
* **config:** don't set a default value for db arg, as it breaks local installs ([0bdd464](https://github.com/TryGhost/Ghost-CLI/commit/0bdd464)), closes [#323](https://github.com/TryGhost/Ghost-CLI/issues/323)
* **log:** don't error out if the log file doesn't exist ([f5a9111](https://github.com/TryGhost/Ghost-CLI/commit/f5a9111)), closes [#303](https://github.com/TryGhost/Ghost-CLI/issues/303)
* **mysql:** don't prompt for mysql extension if user specifies sqlite ([eccaa12](https://github.com/TryGhost/Ghost-CLI/commit/eccaa12)), closes [#304](https://github.com/TryGhost/Ghost-CLI/issues/304)
* **run:** better handling of ghost run with linux user ([7e0191e](https://github.com/TryGhost/Ghost-CLI/commit/7e0191e))
* **run:** set content path in config rather than in environment ([1b7bf97](https://github.com/TryGhost/Ghost-CLI/commit/1b7bf97)), closes [#307](https://github.com/TryGhost/Ghost-CLI/issues/307)
* **setup:** remove boolean constraint from start flag ([8fffc1f](https://github.com/TryGhost/Ghost-CLI/commit/8fffc1f))
* **ssl:** actually skip ssl generation tasks if dns check fails ([f7da9dc](https://github.com/TryGhost/Ghost-CLI/commit/f7da9dc)), closes [#331](https://github.com/TryGhost/Ghost-CLI/issues/331)
* **ssl:** cleanup after failure, don't allow re-running ([5352793](https://github.com/TryGhost/Ghost-CLI/commit/5352793)), closes [#302](https://github.com/TryGhost/Ghost-CLI/issues/302)
* **ssl:** copy acme certificates from home location if they exist ([45be251](https://github.com/TryGhost/Ghost-CLI/commit/45be251)), closes [#309](https://github.com/TryGhost/Ghost-CLI/issues/309)
* **ssl:** ensure well-known block actually gets created ([08597c9](https://github.com/TryGhost/Ghost-CLI/commit/08597c9))
* **ssl:** remove special SSL handling (#326) ([a4da2a4](https://github.com/TryGhost/Ghost-CLI/commit/a4da2a4))
* **systemd:** update is-enabled error handling to be better ([d2b374e](https://github.com/TryGhost/Ghost-CLI/commit/d2b374e)), closes [#293](https://github.com/TryGhost/Ghost-CLI/issues/293)
* **template:** log successful created template in all cases ([5ad363d](https://github.com/TryGhost/Ghost-CLI/commit/5ad363d))
* invalid boolean logic *facepalm* ([2200408](https://github.com/TryGhost/Ghost-CLI/commit/2200408))
* **ui:** 🎨  fixup start & enable flag logic ([d0ff7fe](https://github.com/TryGhost/Ghost-CLI/commit/d0ff7fe))
* **ui:** 🎨  reimplement --quiet flag ([9dd4da8](https://github.com/TryGhost/Ghost-CLI/commit/9dd4da8)), closes [#335](https://github.com/TryGhost/Ghost-CLI/issues/335)
* **ui:** 🎨 template prompt adjustments ([6cee3a3](https://github.com/TryGhost/Ghost-CLI/commit/6cee3a3))
* **ui:** 💄 🐷  various text-only tweaks (#324) ([f7d6915](https://github.com/TryGhost/Ghost-CLI/commit/f7d6915))
* **ui:** make fail and success methods output symbols (#339) ([14a8271](https://github.com/TryGhost/Ghost-CLI/commit/14a8271))
* **update:** fix typo in stop error handling (#306) ([e9e53f9](https://github.com/TryGhost/Ghost-CLI/commit/e9e53f9)), closes [#306](https://github.com/TryGhost/Ghost-CLI/issues/306)
* **yarn:** trim newline from end of yarn output ([43ceff1](https://github.com/TryGhost/Ghost-CLI/commit/43ceff1))

### Features

* **doctor:** ghost install/setup doctor check improvements ([0faa5f6](https://github.com/TryGhost/Ghost-CLI/commit/0faa5f6)), closes [#312](https://github.com/TryGhost/Ghost-CLI/issues/312) [#314](https://github.com/TryGhost/Ghost-CLI/issues/314)

<a name="1.0.0-beta.6"></a>
# [1.0.0-beta.6](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-beta.5...1.0.0-beta.6) (2017-07-06)

### Bug Fixes

* **linux:** fix ghost user setup permissions (#296) ([ba54099](https://github.com/TryGhost/Ghost-CLI/commit/ba54099)), closes [#296](https://github.com/TryGhost/Ghost-CLI/issues/296) [#290](https://github.com/TryGhost/Ghost-CLI/issues/290)
* **nginx:** reference correct ui instance ([0803a3b](https://github.com/TryGhost/Ghost-CLI/commit/0803a3b))
* **nginx:** restart nginx on instance uninstall ([0020872](https://github.com/TryGhost/Ghost-CLI/commit/0020872))
* **ssl:** fix acme.sh location and cleanup error handling ([61f1ed0](https://github.com/TryGhost/Ghost-CLI/commit/61f1ed0))
* **systemd:** ensure systemd daemon is reloaded ([e850926](https://github.com/TryGhost/Ghost-CLI/commit/e850926)), closes [#293](https://github.com/TryGhost/Ghost-CLI/issues/293)
* **systemd:** improve setup checks of extension and process manager ([0259312](https://github.com/TryGhost/Ghost-CLI/commit/0259312)), closes [#291](https://github.com/TryGhost/Ghost-CLI/issues/291)
* **uninstall:** ensure uninstall succeeds if using ghost user ([f6a34a8](https://github.com/TryGhost/Ghost-CLI/commit/f6a34a8))

<a name="1.0.0-beta.5"></a>
# [1.0.0-beta.5](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-beta.4...1.0.0-beta.5) (2017-07-06)

### Bug Fixes

* **config-error:** cleanup config error and add error help property ([16c8203](https://github.com/TryGhost/Ghost-CLI/commit/16c8203))
* **linux:** ensure directory permissions are still changed if ghost user exists ([b0407da](https://github.com/TryGhost/Ghost-CLI/commit/b0407da))
* **log:** only load running environment if ghost is running ([81c1b87](https://github.com/TryGhost/Ghost-CLI/commit/81c1b87))
* **migrations:** don't log to any file during migrations ([85d40c6](https://github.com/TryGhost/Ghost-CLI/commit/85d40c6))
* **mysql:** cleanup promise structure of mysql extension ([860cf18](https://github.com/TryGhost/Ghost-CLI/commit/860cf18)), closes [#191](https://github.com/TryGhost/Ghost-CLI/issues/191)
* **prompt:** respect `--no-prompt` option in other areas ([fb7e4f7](https://github.com/TryGhost/Ghost-CLI/commit/fb7e4f7)), closes [#276](https://github.com/TryGhost/Ghost-CLI/issues/276) [#280](https://github.com/TryGhost/Ghost-CLI/issues/280)
* **ssl:** ensure acme is executable by anyone on the system ([1064731](https://github.com/TryGhost/Ghost-CLI/commit/1064731))
* **ssl:** ensure ssl setup works using the --sslemail flag ([c51ca5b](https://github.com/TryGhost/Ghost-CLI/commit/c51ca5b)), closes [#283](https://github.com/TryGhost/Ghost-CLI/issues/283)
* **systemd:** ensure isRunning accounts for activating status as well ([0f20c6f](https://github.com/TryGhost/Ghost-CLI/commit/0f20c6f))

### Features

* **linux:** add linux user extension ([5f3b0b8](https://github.com/TryGhost/Ghost-CLI/commit/5f3b0b8)), closes [#189](https://github.com/TryGhost/Ghost-CLI/issues/189)
* **mysql:** mysql user creation extension (#269) ([78f8439](https://github.com/TryGhost/Ghost-CLI/commit/78f8439))
* **ssl:** refactor ssl setup to use acme.sh rather than greenlock ([52cdcab](https://github.com/TryGhost/Ghost-CLI/commit/52cdcab))
* **ui:** add mail config message after installation (#278) ([8aac988](https://github.com/TryGhost/Ghost-CLI/commit/8aac988))
* **ui:** add new ui logVerbose method ([09ec161](https://github.com/TryGhost/Ghost-CLI/commit/09ec161))

<a name="1.0.0-beta.4"></a>
# [1.0.0-beta.4](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-beta.3...1.0.0-beta.4) (2017-07-05)

### Bug Fixes

* **config:** fix config environment handling ([0a75eb7](https://github.com/TryGhost/Ghost-CLI/commit/0a75eb7)), closes [#265](https://github.com/TryGhost/Ghost-CLI/issues/265)
* **doctor:** actually fix stack check errors ([1f5b631](https://github.com/TryGhost/Ghost-CLI/commit/1f5b631)), closes [#260](https://github.com/TryGhost/Ghost-CLI/issues/260)
* **doctor:** improve error handling in system stack checks ([3f508a0](https://github.com/TryGhost/Ghost-CLI/commit/3f508a0)), closes [#260](https://github.com/TryGhost/Ghost-CLI/issues/260)
* **instance:** don't prompt for templates if prompts are disabled ([3c64dd5](https://github.com/TryGhost/Ghost-CLI/commit/3c64dd5))
* **log:** output as many lines as possible if n > file lines ([3c56f2e](https://github.com/TryGhost/Ghost-CLI/commit/3c56f2e)), closes [#221](https://github.com/TryGhost/Ghost-CLI/issues/221)
* **setup:** ensure we only skip tasks that should be skipped ([caa440e](https://github.com/TryGhost/Ghost-CLI/commit/caa440e))
* **systemd:** ensure systemd service file is created before starting ([19d79e7](https://github.com/TryGhost/Ghost-CLI/commit/19d79e7)), closes [#262](https://github.com/TryGhost/Ghost-CLI/issues/262)
* **tests:** fix config acceptance tests & config command ([1958d63](https://github.com/TryGhost/Ghost-CLI/commit/1958d63))
* **ui:** log LTS warning when `config.js` file is found (#273) ([3e54db0](https://github.com/TryGhost/Ghost-CLI/commit/3e54db0))

### Features

* **nginx:** add `client_max_body_size` to nginx def. config (#272) ([b04e7db](https://github.com/TryGhost/Ghost-CLI/commit/b04e7db)), closes [#231](https://github.com/TryGhost/Ghost-CLI/issues/231)
* **setup:** allow running of multiple stages ([dbe7263](https://github.com/TryGhost/Ghost-CLI/commit/dbe7263))
* **setup:** allow setup stages to depend on other setup stages having run ([57587a6](https://github.com/TryGhost/Ghost-CLI/commit/57587a6)), closes [#261](https://github.com/TryGhost/Ghost-CLI/issues/261)
* **ui:** add troubleshooting link to errors (#275) ([f5bbff7](https://github.com/TryGhost/Ghost-CLI/commit/f5bbff7))

<a name="1.0.0-beta.3"></a>
# [1.0.0-beta.3](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-beta.2...1.0.0-beta.3) (2017-07-03)

### Bug Fixes

* **extensions:** remove unecessary getters from systemd and nginx extensions ([f5f6e05](https://github.com/TryGhost/Ghost-CLI/commit/f5f6e05))
* **instance:** clean up config usage around application (#254) ([22c804c](https://github.com/TryGhost/Ghost-CLI/commit/22c804c))
* **setup:** reset setup default to true ([7c4cdf3](https://github.com/TryGhost/Ghost-CLI/commit/7c4cdf3))
* **systemd:** fix is-enabled error handling in systemd process manager ([ff6cfba](https://github.com/TryGhost/Ghost-CLI/commit/ff6cfba))

### Features

* **nginx:** check dns entry exists before attempting ssl setup ([049f351](https://github.com/TryGhost/Ghost-CLI/commit/049f351))
* **nginx:** move letsencrypt to its own file, add ssl renew command ([b4eb57a](https://github.com/TryGhost/Ghost-CLI/commit/b4eb57a))
* **nginx:** setup ssl renew cron script ([c60cc75](https://github.com/TryGhost/Ghost-CLI/commit/c60cc75))
* **process:** add enable/disable support ([1ef28bf](https://github.com/TryGhost/Ghost-CLI/commit/1ef28bf)), closes [#248](https://github.com/TryGhost/Ghost-CLI/issues/248)
* **process:** improve restart flow ([3e17cfe](https://github.com/TryGhost/Ghost-CLI/commit/3e17cfe))

<a name="1.0.0-beta.2"></a>
# [1.0.0-beta.2](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-beta.1...1.0.0-beta.2) (2017-07-02)

### Bug Fixes

* **extensions:** return base extension class instance if no subclass is found ([af27274](https://github.com/TryGhost/Ghost-CLI/commit/af27274))
* **extensions:** use correct option to search npm root for extensions ([df049e0](https://github.com/TryGhost/Ghost-CLI/commit/df049e0))
* **instance:** save cliConfig if running is found to be false ([96a3536](https://github.com/TryGhost/Ghost-CLI/commit/96a3536))

### Features

* **ssl:** use Mozilla SSL cipher suite (#252) ([c5091df](https://github.com/TryGhost/Ghost-CLI/commit/c5091df)), closes [#230](https://github.com/TryGhost/Ghost-CLI/issues/230)

<a name="1.0.0-beta.1"></a>
# [1.0.0-beta.1](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.19...1.0.0-beta.1) (2017-06-30)

### Bug Fixes

* **config:** make configPath correct for ip option ([9b96937](https://github.com/TryGhost/Ghost-CLI/commit/9b96937))
* **config:** save config files with 2-space indentation ([cf7bc54](https://github.com/TryGhost/Ghost-CLI/commit/cf7bc54)), closes [#229](https://github.com/TryGhost/Ghost-CLI/issues/229)
* **debug:** normalize debug file path ([e4bfc7c](https://github.com/TryGhost/Ghost-CLI/commit/e4bfc7c))
* **help:** 🎨 improve options output (#246) ([4fb1a5c](https://github.com/TryGhost/Ghost-CLI/commit/4fb1a5c))
* **restart:** make restart command be less stupid ([77cb8d9](https://github.com/TryGhost/Ghost-CLI/commit/77cb8d9))
* **system:** don't use Array.includes b/c node 4 doesn't have it ([9023971](https://github.com/TryGhost/Ghost-CLI/commit/9023971))
* **ui:** extract database migrations into a task ([f052df6](https://github.com/TryGhost/Ghost-CLI/commit/f052df6))
* **ui:** improve custom renderer cleanup ([da3bac6](https://github.com/TryGhost/Ghost-CLI/commit/da3bac6))
* **ui:** make the log method work better with spinners ([15443b1](https://github.com/TryGhost/Ghost-CLI/commit/15443b1))
* **valid-install:** fix error message when CLI is run inside a ghost clone ([bfbf0ae](https://github.com/TryGhost/Ghost-CLI/commit/bfbf0ae))

### Features

* **cli:** swap out commander for yargs parsing ([793715b](https://github.com/TryGhost/Ghost-CLI/commit/793715b)), closes [#179](https://github.com/TryGhost/Ghost-CLI/issues/179)
* **config:** accept mail configuration options (#244) ([19c905b](https://github.com/TryGhost/Ghost-CLI/commit/19c905b))
* **extensions:** services are dead, long live extensions ([85819ae](https://github.com/TryGhost/Ghost-CLI/commit/85819ae)), closes [#146](https://github.com/TryGhost/Ghost-CLI/issues/146)
* **process:** update running check to call process manager ([2f01ad0](https://github.com/TryGhost/Ghost-CLI/commit/2f01ad0)), closes [#207](https://github.com/TryGhost/Ghost-CLI/issues/207)
* **stop:** allow ghost instance to be stopped by name ([ed4320f](https://github.com/TryGhost/Ghost-CLI/commit/ed4320f)), closes [#217](https://github.com/TryGhost/Ghost-CLI/issues/217)
* **system:** system & interface api ([0f703c3](https://github.com/TryGhost/Ghost-CLI/commit/0f703c3)), closes [#219](https://github.com/TryGhost/Ghost-CLI/issues/219) [#203](https://github.com/TryGhost/Ghost-CLI/issues/203) [#170](https://github.com/TryGhost/Ghost-CLI/issues/170)
* **template:** add template method to instance class ([23e24bf](https://github.com/TryGhost/Ghost-CLI/commit/23e24bf))
* **ui:** add ability to output to stderr ([86a9eeb](https://github.com/TryGhost/Ghost-CLI/commit/86a9eeb)), closes [#218](https://github.com/TryGhost/Ghost-CLI/issues/218)
* **ui:** add command line arg to disable prompts ([e7c6c6a](https://github.com/TryGhost/Ghost-CLI/commit/e7c6c6a))
* **ui:** add confirm shorthand method ([bbb7945](https://github.com/TryGhost/Ghost-CLI/commit/bbb7945))
* **ui:** add custom listr renderer and move listr to ui class ([47be79b](https://github.com/TryGhost/Ghost-CLI/commit/47be79b)), closes [#181](https://github.com/TryGhost/Ghost-CLI/issues/181)
* **version:** add custom version command ([8d96035](https://github.com/TryGhost/Ghost-CLI/commit/8d96035))

<a name="1.0.0-alpha.19"></a>
# [1.0.0-alpha.19](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.18...1.0.0-alpha.19) (2017-06-23)

### Bug Fixes

* **local-process:** don't throw an error if .ghostpid doesn't exist ([d437e86](https://github.com/TryGhost/Ghost-CLI/commit/d437e86)), closes [#208](https://github.com/TryGhost/Ghost-CLI/issues/208)
* **uninstall:** actually fix uninstall this time ([5d89600](https://github.com/TryGhost/Ghost-CLI/commit/5d89600))
* **uninstall:** don't screw up global instance config on uninstall ([169f561](https://github.com/TryGhost/Ghost-CLI/commit/169f561)), closes [#220](https://github.com/TryGhost/Ghost-CLI/issues/220)

### Features

* **casper:** update casper version during ghost update ([008c393](https://github.com/TryGhost/Ghost-CLI/commit/008c393))
* **ui:** show sudo command before it is run ([9f92199](https://github.com/TryGhost/Ghost-CLI/commit/9f92199)), closes [#164](https://github.com/TryGhost/Ghost-CLI/issues/164)

<a name="1.0.0-alpha.18"></a>
# [1.0.0-alpha.18](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.17...1.0.0-alpha.18) (2017-06-13)

### Bug Fixes

* **config:** ip address not configured when specified as option (#209) ([201dbbf](https://github.com/TryGhost/Ghost-CLI/commit/201dbbf))
* **local:** allow limited customization of local installation ([cf21285](https://github.com/TryGhost/Ghost-CLI/commit/cf21285)), closes [#206](https://github.com/TryGhost/Ghost-CLI/issues/206)
* **uninstall:** remove instance from global config on `ghost uninstall` ([5f7f18a](https://github.com/TryGhost/Ghost-CLI/commit/5f7f18a)), closes [#205](https://github.com/TryGhost/Ghost-CLI/issues/205)
* **yarn:** update execa path handling and observer error catching ([5e10fd0](https://github.com/TryGhost/Ghost-CLI/commit/5e10fd0))

### Features

* **ssl:** allow SSL email to be provided via option, skip prompts (#195) ([8eef01e](https://github.com/TryGhost/Ghost-CLI/commit/8eef01e))

<a name="1.0.0-alpha.17"></a>
# [1.0.0-alpha.17](https://github.com/TryGhost/Ghost-CLI/compare/1.0.0-alpha.16...1.0.0-alpha.17) (2017-05-06)

### Bug Fixes

* **ls:** don't allow dots in process name ([59fb3d2](https://github.com/TryGhost/Ghost-CLI/commit/59fb3d2)), closes [#184](https://github.com/TryGhost/Ghost-CLI/issues/184)
* **run:** make command descriptions clearer ([f0af011](https://github.com/TryGhost/Ghost-CLI/commit/f0af011)), closes [#185](https://github.com/TryGhost/Ghost-CLI/issues/185)
* **nginx:** add server_name directive to nginx ssl block ([22be390](https://github.com/TryGhost/Ghost-CLI/commit/22be390a57f0be725121e9294b93a995eba3eb27)), closes [#186](https://github.com/TryGhost/Ghost-CLI/issues/186)

### Features

* **ui:** support an error of "false" that exits without logging ([a98995d](https://github.com/TryGhost/Ghost-CLI/commit/a98995d))
* **uninstall:** add `ghost uninstall` command ([f15a6a6](https://github.com/TryGhost/Ghost-CLI/commit/f15a6a6)), closes [#187](https://github.com/TryGhost/Ghost-CLI/issues/187)

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
