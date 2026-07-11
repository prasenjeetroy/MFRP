# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository is currently empty of source code. It contains only a `README.md`:

```
# MFRP
MyFirstRealSFDCProject
```

The name ("MyFirstRealSFDCProject") indicates this is intended to become a Salesforce (SFDC) project, but no Salesforce project structure (`sfdx-project.json`, `force-app/`, metadata, Apex classes, LWC/Aura components, etc.), build tooling, or tests have been added yet.

There are no build, lint, or test commands to document because no code or tooling exists in the repository.

## Working in this repository

- Before assuming any framework, build system, or file layout, check whether it has actually been added — do not assume standard Salesforce DX conventions until an `sfdx-project.json` or equivalent appears.
- Once a real project scaffold is added (e.g. via `sf project generate` or similar), update this file with the actual directory layout, deploy/retrieve commands, and test commands (e.g. Apex test running via `sf apex run test`, LWC Jest tests via `npm test`) rather than assuming them in advance.
