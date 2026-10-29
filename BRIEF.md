# Aero brief

| Decision | Current answer |
| --- | --- |
| Name | Aero |
| GitHub handle | `aero-devops` ([github.com/aero-devops](https://github.com/aero-devops)); `aero` was taken |
| Purpose | Give developers tools for operating applications on infrastructure they control, with room to use outside providers where useful. |
| Audience | Developers who run applications and services |
| Why the repos belong together | Each component covers part of the same application operations workflow; the management app composes them. |
| First repositories | shell and core |
| First working result | Start, stop, inspect, and view recent output from a named service on one local host |
| Maintainer | The creator, initially |
| Visibility | Public by default; individual future repos may be private |
| Website | Local static preview built around the four plates in DESIGN_SYSTEM.md. Domain and hosting undecided. |

## Writing

Explain what an operation does and what the user can inspect afterward. Use ordinary sentences and show a working command or screen before making broad claims. Aero can describe its ambition to cover server operations, while each repo describes only shipped behavior.

Organization description: **Tools for running and observing applications on infrastructure you choose.**

## First launch boundary

The first launch manages processes on the same machine as the Aero server. It has a local dashboard, bounded recent logs, and start and stop controls. Remote hosts, user authentication, Git deployments, reboot persistence, and public routing belong to later components.

The creator chooses the GitHub handle, domain, licenses, visibility, and collaborators. Before a public push, review commit author, remote URL, artwork provenance, privacy, and README claims against the running demo.

