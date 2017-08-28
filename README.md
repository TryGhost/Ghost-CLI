# Ghost-CLI

[![TravisCI Status](https://travis-ci.org/TryGhost/Ghost-CLI.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost-CLI)
[![Appveyor Status](https://ci.appveyor.com/api/projects/status/drkas41sgvbdn9ca?svg=true)](https://ci.appveyor.com/project/acburdine/ghost-cli)
[![Coverage Status](https://coveralls.io/repos/github/TryGhost/Ghost-CLI/badge.svg?branch=master)](https://coveralls.io/github/TryGhost/Ghost-CLI?branch=master)
[![npm version](https://img.shields.io/npm/v/ghost-cli.svg)](https://npmjs.com/package/ghost-cli/)
[![ghost-cli dependencies](https://david-dm.org/TryGhost/Ghost-CLI.svg)](https://david-dm.org/TryGhost/Ghost-CLI)

> Just a CLI manager (for a blogging platform)

## Basic Setup

- `npm install -g ghost-cli@latest`
- `ghost install` (for an production linux setup, including Nginx, SSL, and Systemd)
- `ghost install local` (for a local setup, useful for theme development/testing)

#### NOTE: This CLI is not designed to work with any Ghost versions < 1.0.0

## Documentation

- [Complete Setup Guide](https://docs.ghost.org/docs/install)
- [Command Reference](https://docs.ghost.org/v1/docs/ghost-cli)
- [Troubleshooting Guide](https://docs.ghost.org/v1/docs/troubleshooting#section-cli-errors)

## Developer Setup (for contributing)

*Note: you must have [Git](https://git-scm.com/) installed*

1. Fork this repo
2. `git clone https://github.com/<your-username>/Ghost-CLI path/to/your/workspace`
3. `cd path/to/your/workspace`
4. `yarn install`

To run the CLI for testing:

- `yarn link`
- `ghost <command>` (can run anywhere on the system)

#### Running tests

```sh
yarn test
```

## Looking for ghost-cli <= 0.0.2?

The npm version of ghost-cli <= 0.0.2 can be found [here](https://github.com/jeffdonthemic/ghost-cli). Any versions of Ghost-CLI > 1.0.0-alpha.1 are part of this project.

# Copyright & License

Copyright (c) 2016-2017 Ghost Foundation - Released under the [MIT license](LICENSE).
