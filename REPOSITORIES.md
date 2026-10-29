# Repository map

| Component | User result | First proof | Status |
| --- | --- | --- | --- |
| shell | Run and supervise a process without shell interpolation | Timeout, output, stop, and exit behavior are tested | First release |
| core | Manage named local services from a browser and HTTP API | Start the demo, read output, stop it | First release |
| hosts | Register and inspect remote machines | Remote agent handshake and host status | Proposed |
| deploy | Build and release an application | Reproducible deployment with rollback | Proposed |
| metrics | Observe CPU, memory, disk, and application health | Time series and alerts for one host | Proposed |
| network | Route traffic, domains, and TLS | One public service with safe certificate renewal | Proposed |
| storage | Manage volumes, backups, and restores | Verified backup and restore | Proposed |
| secrets | Deliver scoped runtime secrets | Rotation and audit trail | Proposed |
| jobs | Schedule and inspect background work | Retry and cancellation | Proposed |
| providers | Use outside infrastructure when selected | One provider adapter alongside self-hosted operation | Proposed |

Components are split when they have a stable contract and a useful independent demo. Avoid creating empty repositories to make the map look complete. A future component can stay inside core until its contract is clear.

