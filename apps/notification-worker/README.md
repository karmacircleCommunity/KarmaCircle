# Notification worker

A small Go service that sends the emails that wait on a Redis queue: a reminder a day before an event, and a notice when an event changes or is cancelled.
The API decides who needs an email and puts one job per person on the queue.
This worker takes the jobs off, writes the email, sends it, and deals with whatever goes wrong.

## Why a queue

Sending mail inside the request that caused it means a slow or failing mail provider makes the organizer's "Save" slow or fail, and a reminder for tomorrow cannot be sent from a request that happened last week.
With a queue the API only writes a small job (a few milliseconds), and the worker sends it at the right time, again if the provider fails, and never twice.

```
 API (Node)                       Redis                          worker (Go)                 provider
    |  join / leave / edit / cancel |                                |                           |
    |  one job per person --------->|  {notif}:due  (by run time)    |                           |
    |                               |<-------- claim (Lua) ----------|                           |
    |                               |  {notif}:inflight (leased)     |  render, then send ------>|
    |                               |<-------- ack / retry / dead ---|  Idempotency-Key = job id |
```

## What the API queues

| When | Job | Runs at | Job id |
|---|---|---|---|
| Someone joins | `event_reminder` | 24 hours before the start (not queued if that moment has passed) | `reminder:<event>:<registration>:<start in seconds>` |
| Someone leaves | removes their reminder | | |
| The start, end, place, format or link changes | `event_changed` for everyone registered, and the reminders are rebuilt so none says the old time or place | now | `changed:<event>:<registration>:<edit time in ms>` |
| The organizer cancels | `event_cancelled` for everyone registered, and the reminders are removed | now | `cancelled:<event>:<registration>` |

The job is a snapshot (event name, start, zone, place), so the worker needs no database.
The shape is `internal/job/job.go`, and `testdata/contract/*.json` are examples built by the API's code: the API's tests check that it still builds exactly these, and the worker's tests check that it can still read and render them.

## What it guarantees, and what it does not

- **No double queueing.** A job id that is already queued, or was already sent in the last 14 days, is not queued again, so a repeated request or a retried hook adds nothing.
- **No double sending, as far as the provider allows.** Every attempt sends the job id as the `Idempotency-Key`. If the answer is lost and the job is retried, or a worker dies after sending and before saying so, the provider recognises the repeat. (Resend documents a window of about 24 hours for these keys; check its current docs.) Without a provider that honours the key the guarantee is "at least once".
- **A worker that dies loses nothing.** A job is leased for a minute. A job whose lease ends without an answer is given to another worker and counts as an attempt, so a job that keeps killing its worker ends up dead instead of looping.
- **Failures are told apart.** A busy provider, a timeout, a network error or `429`/`5xx` is retried after 30 s, 1 min, 2 min and so on up to 30 min, with some random spread, and a `Retry-After` from the provider is respected. A refused address or a rejected request (`4xx`) is not retried. After 6 attempts, or on a refusal, the job goes to the dead letter list with the reason, and the dead count shows on the health endpoint.
- **Stale mail is not sent.** A reminder or change notice for an event that has already started is dropped. A cancellation notice is always sent.
- **A cancelled job is not sent**, unless the worker already had it in hand at that moment: the API cannot take back an email that is being sent.
- **The queue lives in Redis.** Use a Redis with persistence switched on (check the plan you pick: some free tiers keep data in memory only). If it is lost, unsent reminders are lost; registrations are not, and the next join or edit queues again. Reminders are not rebuilt from the database automatically.

## Run it

```bash
cd apps/notification-worker
REDIS_URL=redis://localhost:6379 SITE_URL=http://localhost:3000 go run ./cmd/notification-worker
```

Without `RESEND_API_KEY` it only writes each email to its log (with the recipient's domain, not the address), so a laptop never sends real mail.
The API needs the same `REDIS_URL`; it queues jobs only when that is set.
With Docker: `docker compose -f docker-compose.local.yml --profile notifications up -d` from the repository root.

| Variable | Default | Meaning |
|---|---|---|
| `REDIS_URL` | required | `redis://` or `rediss://`. The API's value. |
| `SITE_URL` | required | The web app's public address, for the links in emails. |
| `RESEND_API_KEY` | none | Set it to send for real. |
| `EMAIL_FROM` | required with the key | For example `KarmaCircle <hello@example.org>`. |
| `RESEND_BASE_URL` | `https://api.resend.com` | For tests. |
| `PORT` | `8081` | Health endpoint. |
| `WORKER_CONCURRENCY` | `4` | Emails in hand at once. |
| `POLL_INTERVAL` | `1s` | Wait when the queue is empty. |
| `LEASE` | `1m` | How long a worker may hold a job. |
| `MAX_ATTEMPTS` | `6` | |
| `BACKOFF_BASE`, `BACKOFF_MAX` | `30s`, `30m` | |

`GET /healthz` answers `200` with `{ status, redis, sender, queue: { due, inflight, dead, oldestDueSeconds }, sinceStart: { sent, retried, dead, expired } }`, or `503` when Redis does not answer.
Alert on `queue.dead` going above zero, and on `queue.oldestDueSeconds` that keeps growing (the worker is not keeping up or is down).
The worker also logs the queue once a minute.
`notification-worker healthcheck` asks the running process for `/healthz` and exits 0 or 1: it is the container's health check, because the runtime image has no shell or curl.
A job carries the `requestId` of the API request that queued it (optional, plain characters only), and every log line for the job has it as `request_id`, so one search finds the API's log and the worker's.
On `SIGTERM` it stops taking jobs, finishes the emails it holds, and exits.

## Tests

```bash
go vet ./... && go test -race ./...
```

They use a real Redis: `REDIS_TEST_URL` when set (CI starts one, and runs `go test -p 1`, because packages share database 15), otherwise a throwaway `redis-server` if installed, otherwise the Redis tests are skipped and say so.
They cover the queue (one claim per job under 8 competing workers, leases, reaping, cancelled jobs, the dead list), the worker (retry with the same key, refusals, running out of attempts, rate limits, poison jobs, expired reminders, a dead worker, a graceful stop), the provider client against a fake server, the emails (time zones, escaping, header injection) and the health endpoint.

## Not done yet

- Organizer announcements to everyone who joined (the rest of PG-18).
- The join confirmation email and the organizer's "someone joined" notice still go out from the API directly, once, with no retry (O-6).
- Reminders live only in Redis.
- No unsubscribe link. These are emails about an event the person chose to join, but a real deployment should let people opt out.
