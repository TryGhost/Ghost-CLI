# Ghost-CLI

[![ghost-cli npm](https://travis-ci.org/TryGhost/Ghost-CLI.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost-CLI)
[![ghost-cli dependencies](https://david-dm.org/TryGhost/Ghost-CLI.svg)](https://david-dm.org/TryGhost/Ghost-CLI)

> Just a CLI manager (for a blogging platform)

## Installing

```sh
# Note: this will eventually become npm install -g ghost-cli
npm install -g TryGhost/Ghost-CLI
```

## Usage:

```sh
ghost <command>
```

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
