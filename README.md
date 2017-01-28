# Ghost-CLI

[![ghost-cli npm](https://travis-ci.org/TryGhost/Ghost-CLI.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost-CLI)
[![Build status](https://ci.appveyor.com/api/projects/status/nsq2yxgbgigm0d96?svg=true)](https://ci.appveyor.com/project/acburdine/ghost-cli)
[![Coverage Status](https://coveralls.io/repos/github/TryGhost/Ghost-CLI/badge.svg?branch=master)](https://coveralls.io/github/TryGhost/Ghost-CLI?branch=master)
[![npm](https://img.shields.io/npm/v/ghost-cli.svg)](https://npmjs.com/package/ghost-cli/)
[![ghost-cli dependencies](https://david-dm.org/TryGhost/Ghost-CLI.svg)](https://david-dm.org/TryGhost/Ghost-CLI)

> Just a CLI manager (for a blogging platform)

## Installing

1. Install [Yarn](https://yarnpkg.com) first: [Installation Guide](https://yarnpkg.com/en/docs/install)

2. `yarn global add ghost-cli`

---

## Usage:

```sh
ghost <command>
```

#### NOTE: This CLI is not designed to work with any Ghost versions < 1.0.0

---

## Commands

#### `ghost install [version]`

Installs a particular version of Ghost. If no version is specified, the CLI will install the latest available version.

###### `ghost install local`

Running `ghost install local` is a quick way to set up a development version of ghost on your local environment. This can be useful for theme/adapter development.

---

## Developers

*Note: you must have [Git](https://git-scm.com/) installed*

1. Fork this repo
2. `git clone https://github.com/<your-username>/Ghost-CLI path/to/your/workspace`
3. `cd path/to/your/workspace`
4. `yarn install`

You can run the cli one of two ways:

- Manually:
    - from the ghost-cli directory: `./bin/ghost <command>`
- Using `yarn link`:
    - from the ghost-cli directory: `yarn link`
    - anywhere on your system: `ghost <command>`

#### Running tests

```sh
yarn test
```

## Looking for ghost-cli <= 0.0.2?

The npm version of ghost-cli <= 0.0.2 can be found [here](https://github.com/jeffdonthemic/ghost-cli). Any versions of Ghost-CLI > 1.0.0-alpha.1 are part of this project.

# Copyright & License

Copyright (c) 2016-2017 Ghost Foundation - Released under the [MIT license](LICENSE).
