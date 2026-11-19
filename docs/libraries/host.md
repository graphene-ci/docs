---
sidebar_position: 4
title: Host
sidebar_label: Host
---

# Host

The host library turns machine settings into resources: kernel parameters,
`/sys` attributes, directories and systemd units on an agent's machine. Each
setting is a record in the tree. Its finalize puts the machine back the way the
record found it, so a run that changes a machine only through these records
leaves the machine in its base state when its cascade runs.

```go
import hostlib "github.com/graphene-ci/library/host"

db := pipeline.NewAgent(ctx, "db")
hostlib.Sysctl(ctx, db, "db", map[string]string{
    "vm.swappiness":      "10",
    "net.core.somaxconn": "4096",
})
hostlib.Sysfs(ctx, db, "/sys/kernel/mm/transparent_hugepage/enabled", "never")
hostlib.UnitState(ctx, db, "unattended-upgrades.service", hostlib.UnitMasked)
data := hostlib.Dir(ctx, db, "/data/pg", hostlib.DirAccess{Mode: 0o700, UID: 999, GID: 999})
path := data.Ready(ctx).Path // bind-mount it into the database container
```

| Constructor | While the record lives | On removal |
|---|---|---|
| `Sysctl(ctx, agent, name, values)` | values are live and in `/etc/sysctl.d/90-graphene-<record>.conf` | the drop-in is deleted and every key gets its prior value back |
| `Sysfs(ctx, agent, path, value)` | the attribute holds `value` | the prior value is written back |
| `Dir(ctx, agent, path, access)` | the directory exists with the given mode and owner | the directory is deleted with its contents |
| `Unit(ctx, agent, name, content)` | the unit file is in `/etc/systemd/system`, enabled and started | the unit is stopped, disabled and its file deleted |
| `UnitState(ctx, agent, name, want)` | an existing unit is held `UnitStopped`, `UnitDisabled` or `UnitMasked` | the unit's prior state comes back: unmasked, enabled, started as it was |
| `Mount(ctx, agent, MountRequest{...})` | the device is mounted at the mountpoint through a systemd mount unit (survives a reboot) | the filesystem is unmounted and the unit deleted; the data stays |

`Unit` is ready only once the unit is active: `systemctl enable --now` exits 0
even when the start fails, so the record checks. A oneshot service needs
`RemainAfterExit=yes` to count as running.

## Disks

`Mount` names the device, best by its `/dev/disk/by-id` name: the agent's
facts list every physical disk with its ids, size, model and serial. With
`Format: true` it creates the filesystem only on a **blank** device; a
device carrying anything — another filesystem, a partition table — is refused
with `host_conflict`, never formatted over. Removal never wipes. On a machine
someone else prepared, `Check: true` only verifies that the device is mounted
there with that type, and changes nothing, now or on removal:

```go
data := hostlib.Mount(ctx, db, hostlib.MountRequest{
    Device:     "/dev/disk/by-id/nvme-SAMSUNG_MZQL23T8HCLS-00A07_S64HNE0R123456",
    Mountpoint: "/data",
    FSType:     "xfs",               // ext4, xfs or btrfs
    Options:    []string{"noatime"},
    Format:     true,                // only a blank device
})
```

## Claims

A record claims what it changes in a small file under
`/var/lib/graphene-host/claims` on the machine. The claim stores the prior
value before anything changes, so a record whose initialization was cut short
still restores the machine. Two records cannot hold the same sysctl key, sysfs
attribute, directory or unit: the second one fails with the stable error type
`host_conflict`. The same code refuses a `Dir` whose path already exists and a
`Unit` whose file already exists. A record never owns data it did not create.

`sysctl --system` is not a restore: a key that no file names keeps its current
value. That is why the record writes each prior value back.

## Removal

Removing a setting retries a transient failure for up to two minutes and then
lets the record go, so a machine that is already gone cannot block a cascade.
A directory is first renamed into `.graphene-trash` beside it, which is instant
whatever the size, and then deleted. The deletion may take up to two hours with
a heartbeat; whatever a purge cut short stays in the trash, never under the
record's path.

## Limits

- A `Sysfs` value does not survive a reboot. A `Sysctl` value does, through its
  drop-in.
- `UnitState` changes vendor units, the ones shipped under `/usr/lib/systemd`.
  systemd cannot mask a unit whose file lives in `/etc/systemd/system`.
- `UnitMasked` on a unit that does not exist yet masks it anyway, so nothing
  installed later starts it while the record lives.
- An `EnvironmentFile` that a `Unit` names is a [File](file.md) resource.
- File-system paths stay inside the machine root: a symlink that points outside
  the machine fails the record instead of letting it write there. A symlink
  planted where a record writes a file is replaced, not followed, and a
  directory swapped for a symlink fails the record instead of changing the
  link's target.
- `Dir` needs Linux 5.6 or newer: the kernel itself resolves the directory
  without symlinks (`openat2`) before its mode and owner change.

An owned agent owns its host records, so they go with the agent. On an attached
agent they belong to the run and are removed when the run ends, unless
transferred.

## Tests

`host/hosttest` models the declarations for [local pipeline tests](../sdk/testing.md):
each setting becomes a ready record under its owner, and nothing touches a
machine.
