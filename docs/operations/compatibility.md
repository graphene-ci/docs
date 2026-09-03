---
sidebar_position: 6
title: Compatibility and limits
sidebar_label: Compatibility
---

# Compatibility and limits

This is the currently asserted compatibility surface. Absence from the table
means no support range has been established, not that the combination is known
to work.

| Area | Current contract |
|---|---|
| Pipeline examples and resource libraries | Go 1.26.5 modules |
| Pipeline SDK and agent modules | declare Go 1.25.7; current examples require newer Go |
| Server | Go 1.26.5 module |
| Server-side materialization | built-in Go runtime reports 1.26 |
| Self-built worker image | Linux/amd64 only |
| Machine agent | Linux; `runc` default, `exec` development runtime |
| Agent service | generated installer supports systemd; other init systems require manual service wiring |
| Development control plane | Docker with Compose and access to the Docker socket |
| Studio development | Node.js 22.23.1; web renderer plus Electron packaging commands |
| Kubernetes library | native Go API types; no published Kubernetes/provider version range |

There is no versioned compatibility promise yet between independently released
server, agent, pipeline SDK, Studio and generated Management API bindings. Keep
their revisions together when testing a deployment and regenerate Studio
bindings from the target server contract.

## Known functional limits

- `dev` is not implemented; local planning works, execution needs a server.
- Production deployment, HA, backup/restore and upgrade procedures are not
  shipped.
- Git source trees are read-only.
- A manual start under `Queue` is refused while another run is active; the
  pending slot belongs to automatic triggers.
- List watch in `graphenectl` polls; observation streams and run watch are push.
- Permanently lost agent machines cannot yet be buried through supported CLI.
- External KMS/Vault secret lifecycle is not available.

Check [Current state](../start/current-state.md) before evaluating a design and
[Security](security.md) before connecting real infrastructure.
