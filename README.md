# frp-cli

A lightweight npm wrapper around the **FRP client ([repo](https://github.com/fatedier/frp))**.

This package automatically downloads the appropriate `frpc` binary for your platform at install time, so you can use `frpc` directly without manually downloading or managing binaries.

---

## Installation

Global:
```bash
npm i -g frp-cli
````

Local project dependency:

```bash
npm i -D frp-cli
```

The installer will download `frpc` into:

```
./bin/native/
```

---

## Usage

```bash
frpc -c ./frpc.ini
```

Examples:

```bash
frpc --version
frpc -c ./frpc.ini --log_level=info
```

---

## Updating `frpc`

The package includes a helper command to re-download the newest (or chosen) version of `frpc`:

```bash
frpc-update
```

Download a specific version:

```bash
frpc-update --version 0.65.0
```

Force using `curl` (useful in locked-down networks):

```bash
FRPC_USE_CURL=1 frpc-update
```

Use a custom FRP releases repository (fork/self-hosted):

```bash
frpc-update --repo=myfork/frp
```

> Updating clears `bin/native/` and installs the new binary cleanly.

---

## How It Works

1. On install or update:

   * The script determines your OS + CPU architecture.
   * Fetches the matching release archive from GitHub.
   * Extracts `frpc`.
   * Stores it at:

     ```
     bin/native/frpc-<platform>-<arch>[.exe]
     ```

2. The `frpc` launcher selects the correct binary at runtime and executes it.

---

## Supported Platforms

| OS      | Architectures   |
| ------- | --------------- |
| Linux   | x64, arm64, arm |
| macOS   | x64, arm64      |
| Windows | x64, arm64      |

---

## Environment Variables (Installation-time)

| Variable                | Purpose                            | Example                                 |
| ----------------------- | ---------------------------------- | --------------------------------------- |
| `FRP_VERSION`           | Pin FRP version instead of latest  | `FRP_VERSION=0.65.0 npm i frp-cli`      |
| `GITHUB_TOKEN`          | Avoid GitHub API rate limiting     | `GITHUB_TOKEN=ghp_xxx npm i frp-cli`    |
| `FRPC_SKIP_POSTINSTALL` | Skip binary download               | `FRPC_SKIP_POSTINSTALL=1 npm i frp-cli` |
| `FRPC_USE_CURL`         | Force using `curl` for downloading | `FRPC_USE_CURL=1 npm i frp-cli`         |
| `FRP_REPO`              | Use a different FRP release repo   | `FRP_REPO=myfork/frp npm i frp-cli`     |

---

## Environment Variables (Runtime)

| Variable              | Purpose                         | Example                                      |
| --------------------- | ------------------------------- | -------------------------------------------- |
| `FRPC_FORCE_PLATFORM` | Override platform detection     | `FRPC_FORCE_PLATFORM=linux frpc -c frpc.ini` |
| `FRPC_FORCE_ARCH`     | Override architecture detection | `FRPC_FORCE_ARCH=arm64 frpc -c frpc.ini`     |

Expected values:

* `FRPC_FORCE_PLATFORM`: `linux`, `darwin`, `win32`
* `FRPC_FORCE_ARCH`: `x64`, `arm64`, `arm`

---

## Uninstall

Global:

```bash
npm uninstall -g frp-cli
```

Local:

```bash
npm remove -D frp-cli
```
