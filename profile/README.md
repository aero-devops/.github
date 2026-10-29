<p align="center"><img src="https://raw.githubusercontent.com/aero-devops/.github/main/assets/org-banner.png" alt="Plate 1, Pressure: the word Aero held in moving air, bright where the air rushes past it, dark where it stalls, with soft vortices behind" width="100%"></p>

# Aero

Aero is a set of tools for running and observing applications on infrastructure you choose. It is growing from a working local control plane into separate components for the rest of the operations stack.

The first pair is:

- **[Shell](https://github.com/aero-devops/shell)** starts and supervises a process, reports its output, and stops it when asked.
- **[Core](https://github.com/aero-devops/core)** gives those operations a local HTTP API and a browser dashboard for named services.

Together, they can run a service on one machine and show what it is doing. The [repository map](https://github.com/aero-devops/.github/blob/main/REPOSITORIES.md) records the next components under consideration.

Every Aero image is a plate computed from a model of moving air: tone, not lines, with each part of Aero drawn by what it does. See the [design system](https://github.com/aero-devops/.github/blob/main/DESIGN_SYSTEM.md).

To try it, clone both repositories side by side and follow the [Core quick start](https://github.com/aero-devops/core#run-the-demo).
