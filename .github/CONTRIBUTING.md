# Contributing to Ghost-CLI

Welcome to the Ghost-CLI project, and thank you for wanting to get started contributing!

To setup Ghost-CLI for development, please read through the developer setup in the [readme](../README.md).

Read through the list of [open issues](https://github.com/TryGhost/Ghost-CLI/issues), and if you find one that you want to work on, please comment on it so that others will know it's being worked on 😉

Once you've implemented the feature or fixed the issue, please make sure:

- it passes tests (`pnpm test`)
- all commits are squashed into one or two commits
- the commit message follows the format below

Then submit a PR and one of the core team will review it!

## Commit Messages

Ghost-CLI follows the same commit message convention as [Ghost](https://github.com/TryGhost/Ghost/blob/main/.github/CONTRIBUTING.md#commit-messages):

- **1st line:** Max 80 character summary, written in past tense e.g. "Fixed the thing" not "Fixes the thing"
- **2nd line:** [Always blank]
- **3rd line:** `ref <issue link>`, `fixes <issue link>`, `closes <issue link>` or blank
- **4th line:** Why this change was made — the code includes the what, the commit message should describe the context of why

If your change is **user-facing**, prepend the summary with an emoji key. Only commits with one of these emojis end up in the release notes:

- 🔒 Security fix
- ✨ Feature
- 💄 Cosmetic / output change
- 🎨 Improvement / change
- 🐛 Bug fix
- 💡 Anything else flagged to users or whoever is writing release notes

A ✨ commit also bumps the next release to a minor version rather than a patch.

If you have any questions, feel free to drop by our [forum](https://forum.ghost.org)! We'd be happy to help 😄

#### Note: If you wish to implement a new feature, it would be wise to open an issue about it beforehand. That way the Core Team can make comments and ensure that the feature is in the best interests and direction of the CLI.

## Contributor License Agreement

By contributing your code to Ghost you grant the Ghost Foundation a non-exclusive, irrevocable, worldwide, royalty-free, sublicenseable, transferable license under all of Your relevant intellectual property rights (including copyright, patent, and any other rights), to use, copy, prepare derivative works of, distribute and publicly perform and display the Contributions on any licensing terms, including without limitation: (a) open source licenses like the MIT license; and (b) binary, proprietary, or commercial licenses. Except for the licenses granted herein, You reserve all right, title, and interest in and to the Contribution.

You confirm that you are able to grant us these rights. You represent that You are legally entitled to grant the above license. If Your employer has rights to intellectual property that You create, You represent that You have received permission to make the Contributions on behalf of that employer, or that Your employer has waived such rights for the Contributions.

You represent that the Contributions are Your original works of authorship, and to Your knowledge, no other person claims, or has the right to claim, any right in any invention or patent related to the Contributions. You also represent that You are not legally obligated, whether by entering into an agreement or otherwise, in any way that conflicts with the terms of this license.

The Ghost Foundation acknowledges that, except as explicitly described in this Agreement, any Contribution which you provide is on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
