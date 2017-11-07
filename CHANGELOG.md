# Ghost-CLI Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
