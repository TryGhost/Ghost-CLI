# Ghost-CLI

[![TravisCI Status](https://travis-ci.org/TryGhost/Ghost-CLI.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost-CLI)
[![Appveyor Status](https://ci.appveyor.com/api/projects/status/drkas41sgvbdn9ca?svg=true)](https://ci.appveyor.com/project/acburdine/ghost-cli)
[![Coverage Status](https://coveralls.io/repos/github/TryGhost/Ghost-CLI/badge.svg?branch=master)](https://coveralls.io/github/TryGhost/Ghost-CLI?branch=master)
[![npm version](https://img.shields.io/npm/v/ghost-cli.svg)](https://npmjs.com/package/ghost-cli/)
[![ghost-cli dependencies](https://david-dm.org/TryGhost/Ghost-CLI.svg)](https://david-dm.org/TryGhost/Ghost-CLI)

## Basic Setup

- `npm install -g ghost-cli@latest`
- `ghost install` (for a production linux setup, including Nginx, SSL, and Systemd)
- `ghost install local` (for a local setup, useful for theme development/testing)

#### NOTE: This CLI is not designed to work with any Ghost versions < 1.0.0

## Documentation

- [Complete Setup Guide](https://docs.ghost.org/install/ubuntu/)
- [Command Reference](https://docs.ghost.org/api/ghost-cli/)
- [Knowledgebase](https://docs.ghost.org/api/ghost-cli/knowledgebase/)
- [Forum](https://forum.ghost.org)

## Project Goals

The objective of the Ghost CLI project is to make setting up and maintaining a Ghost site as straight forward as possible for people who do not want to use Ghost(Pro). 

Ghost-CLI is aimed at people who are comfortable in a command line environment, and therefore some technical knowledge is assumed. The design goal of Ghost CLI was to make it possible to install or update Ghost in a single command. 

In order to keep these goals obtainable & maintainable by Ghost's small team, we have a recommended system stack that Ghost-CLI works with, and minimal configuration options.

### Recommended stack

We officially recommend the stack [described here](https://docs.ghost.org/install/ubuntu/) for production installs.

The team behind Ghost CLI _only_ supports this stack. This restriction is very deliberate, as every additional option for configuration or divergent piece of code required to support an additional environment creates exponential complexity and maintenance overhead. 

Our primary focus for the project is ensuring that everyone that uses the recommended system stack is able to **install**, **configure**, **start**, **stop**, **restart**, **update** & **list** their Ghost sites. This includes developing better testing to ensure we are able to prevent regressions, and stabilising the code to ensure that edge cases within the recommended stack are accounted for.

The secondary focus is on improving the CLI itself. We want to ensure that the UI, configuration options, flags, flows, prompts, messages and other behaviours are working for both manual and programmatic use. This also includes improving the documentation to make it easy to use the tool, discover advanced options & debug any common issues.

**Anything that falls outside of these two areas is not being actively worked on at present.**

## Triaging & prioritisation

- Issues which affect many users with our recommended stack are given first priority
- Issues which affect small numbers of users are prioritised based on the impact vs the difficulty - i.e. quick fixes will be prioritised, complex issues may be closed and labelled with `later` & `recommended-stack`.
- Issues around documented & understood environment or configuration issues will be closed and labelled with `known-issue`, users will be directed to the docs & forum. 
- Issues that request modifications in order to support other stacks stack will be closed and labelled with `later` & `other-stack`. 
- Issues proposing new features or enhancements will be labelled as such, and in most cases also closed with `later`.

## Help & Support

We aren't able to provide support in GitHub, but we do keep track of common issues with the `known-issue` label and regularly update documentation & error messages to be clearer.

The documentation for Ghost-CLI can be found at https://docs.ghost.org/api/ghost-cli/. Community support can be found in our [forum](https://forum.ghost.org).


## Developer Setup (for contributing)

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

# Copyright & License

Copyright (c) 2016-2019 Ghost Foundation - Released under the [MIT license](LICENSE). Ghost and the Ghost Logo are trademarks of Ghost Foundation Ltd. Please see our [trademark policy](https://ghost.org/trademark/) for info on acceptable usage.
