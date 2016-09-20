# Ghost-CLI

[![ghost-cli npm](https://travis-ci.org/TryGhost/Ghost-CLI.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost-CLI)
[![Build status](https://ci.appveyor.com/api/projects/status/nsq2yxgbgigm0d96?svg=true)](https://ci.appveyor.com/project/acburdine/ghost-cli)
[![ghost-cli dependencies](https://david-dm.org/TryGhost/Ghost-CLI.svg)](https://david-dm.org/TryGhost/Ghost-CLI)

> Just a CLI manager (for a blogging platform)

## Installing

```sh
npm install -g ghost-cli
```

## Usage:

```sh
ghost <command>
```

#### NOTE: This CLI is not designed to work with any Ghost versions < 1.0.0

## Commands

#### `ghost install [version]`

Installs a particular version of Ghost. If no version is specified, the CLI will install the latest available version.

## Developers

*Note: you must have [Git](https://git-scm.com/) installed*

1. Fork this repo
2. `git clone https://github.com/<your-username>/Ghost-CLI path/to/your/workspace`
3. `cd path/to/your/workspace`
4. `npm install`

You can run the cli one of two ways:

- Manually:
    - from the ghost-cli directory: `./bin/ghost <command>`
- Using `npm link`:
    - from the ghost-cli directory: `npm link`
    - anywhere on your system: `ghost <command>`

#### Running tests

```sh
npm test
```

## Looking for ghost-cli <= 0.0.2?

The npm version of ghost-cli <= 0.0.2 can be found [here](https://github.com/jeffdonthemic/ghost-cli). Any versions of Ghost-CLI > 1.0.0-alpha.1 are part of this project.
