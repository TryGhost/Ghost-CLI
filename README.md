# Ghost-CLI

[![ghost-cli npm](https://travis-ci.org/TryGhost/Ghost-CLI.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost-CLI)
[![Build status](https://ci.appveyor.com/api/projects/status/nsq2yxgbgigm0d96?svg=true)](https://ci.appveyor.com/project/acburdine/ghost-cli)
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

#### Testing the update behavior with the demo app

- Follow the installation instructions above
- Run `ghost install 0.1.1` (without that argument it will install the latest version)
- Make sure you choose the option to start your app
- Visit "https://localhost:2368/" in your browser (add "/about/" to that to view the version)
- Run `ghost update` within your ghost install directory
- Reload the "about" page to see the new version number (and visit "/bad/" to see some new features :smile:)

#### Running tests

```sh
npm test
```
