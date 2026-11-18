// Package queue is a delayed job queue on Redis.
//
// Layout (the `{notif}` tag keeps every key of the queue in one slot, so the
// scripts also work on a Redis Cluster):
//
//	{notif}:due            sorted set  job id -> the time it should run (ms)
//	{notif}:inflight       sorted set  job id -> when its lease ends (ms)
//	{notif}:job:<id>       string      the job as JSON
//	{notif}:event:<uid>    set         the ids of the jobs for one event
//	{notif}:sent:<id>      string      marker: this job was sent (14 days)
//	{notif}:dead           list        jobs that gave up, newest first
//
// The API side (apps/api/src/modules/notifications/notification.queue.ts)
// writes the same layout. Every change is one Lua script, so a crash can never
// leave a job half moved.
//
// A job is delivered at least once. Together with the idempotency key sent to
// the mail provider, the person gets one email.
package queue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/karmacirclecommunity/karmacircle/apps/notification-worker/internal/job"
)

const (
	keyDue      = "{notif}:due"
	keyInflight = "{notif}:inflight"
	keyDead     = "{notif}:dead"
	jobPrefix   = "{notif}:job:"
	eventPrefix = "{notif}:event:"
	sentPrefix  = "{notif}:sent:"

	jobTTL  = 30 * 24 * time.Hour
	setTTL  = 60 * 24 * time.Hour
	sentTTL = 14 * 24 * time.Hour
	deadMax = 1000
)

// ErrPoison is returned with the raw job when it cannot be read.
var ErrPoison = errors.New("unreadable job")

var enqueueScript = redis.NewScript(`
if redis.call("EXISTS", KEYS[2]) == 1 or redis.call("EXISTS", KEYS[3]) == 1 then return 0 end
redis.call("SET", KEYS[2], ARGV[2], "EX", ARGV[4])
redis.call("ZADD", KEYS[1], ARGV[3], ARGV[1])
redis.call("SADD", KEYS[4], ARGV[1])
redis.call("EXPIRE", KEYS[4], ARGV[5])
return 1
`)

// Moves the earliest job that is due to the in-flight set and hands it over.
// A due id whose job was cancelled is dropped and the next one is tried.
var claimScript = redis.NewScript(`
while true do
  local ids = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", ARGV[1], "LIMIT", 0, 1)
  if #ids == 0 then return false end
  local id = ids[1]
  redis.call("ZREM", KEYS[1], id)
  local raw = redis.call("GET", ARGV[3] .. id)
  if raw then
    redis.call("ZADD", KEYS[2], ARGV[2], id)
    return { id, raw }
  end
end
`)

var ackScript = redis.NewScript(`
redis.call("ZREM", KEYS[1], ARGV[1])
redis.call("DEL", KEYS[2])
redis.call("SREM", KEYS[3], ARGV[1])
redis.call("SET", KEYS[4], "1", "EX", ARGV[2])
return 1
`)

// Puts a failed job back on the queue for a later time, unless it was
// cancelled while it was being sent.
var retryScript = redis.NewScript(`
redis.call("ZREM", KEYS[1], ARGV[1])
if redis.call("EXISTS", KEYS[3]) == 0 then return 0 end
redis.call("SET", KEYS[3], ARGV[2], "KEEPTTL")
redis.call("ZADD", KEYS[2], ARGV[3], ARGV[1])
return 1
`)

var deadScript = redis.NewScript(`
redis.call("ZREM", KEYS[1], ARGV[1])
redis.call("DEL", KEYS[2])
if KEYS[3] ~= "" then redis.call("SREM", KEYS[3], ARGV[1]) end
redis.call("LPUSH", KEYS[4], ARGV[2])
redis.call("LTRIM", KEYS[4], 0, tonumber(ARGV[3]) - 1)
return 1
`)

// Like retry, but only when the lease it saw has not been renewed or taken
// by someone else since, so two reapers cannot both requeue one job.
var requeueScript = redis.NewScript(`
local score = redis.call("ZSCORE", KEYS[1], ARGV[1])
if (not score) or tonumber(score) ~= tonumber(ARGV[2]) then return 0 end
redis.call("ZREM", KEYS[1], ARGV[1])
if redis.call("EXISTS", KEYS[3]) == 0 then return 0 end
redis.call("SET", KEYS[3], ARGV[3], "KEEPTTL")
redis.call("ZADD", KEYS[2], ARGV[4], ARGV[1])
return 1
`)

// Queue is the worker's view of the queue.
type Queue struct {
	rdb *redis.Client
	now func() time.Time
}

// New returns a Queue on a Redis client.
func New(rdb *redis.Client) *Queue {
	return &Queue{rdb: rdb, now: time.Now}
}

func ms(t time.Time) int64 { return t.UnixMilli() }

// Enqueue adds a job. It returns false, without changing anything, when a job
// with that id is already queued or was already sent.
func (q *Queue) Enqueue(ctx context.Context, j job.Job) (bool, error) {
	if err := j.Validate(); err != nil {
		return false, err
	}
	raw, err := json.Marshal(j)
	if err != nil {
		return false, err
	}
	added, err := enqueueScript.Run(ctx, q.rdb,
		[]string{keyDue, jobPrefix + j.ID, sentPrefix + j.ID, eventPrefix + j.Event.UID},
		j.ID, string(raw), ms(j.RunAt), int(jobTTL.Seconds()), int(setTTL.Seconds())).Int()
	return added == 1, err
}

// Claimed is a job handed to a worker. It is the worker's until Lease ends.
type Claimed struct {
	ID string
	// Raw is the job exactly as it was stored.
	Raw []byte
}

// Claim takes the earliest due job and leases it. It returns nil when nothing
// is due.
func (q *Queue) Claim(ctx context.Context, lease time.Duration) (*Claimed, error) {
	now := q.now()
	res, err := claimScript.Run(ctx, q.rdb, []string{keyDue, keyInflight},
		ms(now), ms(now.Add(lease)), jobPrefix).StringSlice()
	if errors.Is(err, redis.Nil) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &Claimed{ID: res[0], Raw: []byte(res[1])}, nil
}

// Ack records a job as sent and removes it.
func (q *Queue) Ack(ctx context.Context, j job.Job) error {
	return ackScript.Run(ctx, q.rdb,
		[]string{keyInflight, jobPrefix + j.ID, eventPrefix + j.Event.UID, sentPrefix + j.ID},
		j.ID, int(sentTTL.Seconds())).Err()
}

// Retry puts a job back to run again at runAt, with its attempt count and
// last error already updated in j.
func (q *Queue) Retry(ctx context.Context, j job.Job, runAt time.Time) error {
	raw, err := json.Marshal(j)
	if err != nil {
		return err
	}
	return retryScript.Run(ctx, q.rdb,
		[]string{keyInflight, keyDue, jobPrefix + j.ID}, j.ID, string(raw), ms(runAt)).Err()
}

// DeadEntry is what is kept about a job that gave up.
type DeadEntry struct {
	ID       string    `json:"id"`
	Reason   string    `json:"reason"`
	FailedAt time.Time `json:"failedAt"`
	// Job is the job as it was stored, as text, because it may not be valid JSON.
	Job string `json:"job"`
}

// Dead moves a job to the dead letter list with the reason. eventUID may be
// empty when the job could not be read.
func (q *Queue) Dead(ctx context.Context, id, eventUID string, raw []byte, reason string) error {
	entry, err := json.Marshal(DeadEntry{ID: id, Reason: reason, FailedAt: q.now().UTC(), Job: string(raw)})
	if err != nil {
		return err
	}
	setKey := ""
	if eventUID != "" {
		setKey = eventPrefix + eventUID
	}
	return deadScript.Run(ctx, q.rdb,
		[]string{keyInflight, jobPrefix + id, setKey, keyDead}, id, string(entry), deadMax).Err()
}

// DeadLetters lists the newest dead jobs.
func (q *Queue) DeadLetters(ctx context.Context, limit int64) ([]DeadEntry, error) {
	rows, err := q.rdb.LRange(ctx, keyDead, 0, limit-1).Result()
	if err != nil {
		return nil, err
	}
	out := make([]DeadEntry, 0, len(rows))
	for _, row := range rows {
		var entry DeadEntry
		if err := json.Unmarshal([]byte(row), &entry); err == nil {
			out = append(out, entry)
		}
	}
	return out, nil
}

// Reaped says what ReapExpired did.
type Reaped struct {
	Requeued int
	Dead     int
}

// ReapExpired finds jobs whose lease ended without an answer (the worker died
// or hung) and gives them to someone else. That counts as an attempt, so a
// job that keeps killing its worker ends up dead instead of looping for ever.
func (q *Queue) ReapExpired(ctx context.Context, maxAttempts int, retryIn time.Duration) (Reaped, error) {
	var result Reaped
	now := q.now()
	expired, err := q.rdb.ZRangeByScoreWithScores(ctx, keyInflight, &redis.ZRangeBy{
		Min: "-inf", Max: fmt.Sprint(ms(now)), Count: 100,
	}).Result()
	if err != nil {
		return result, err
	}
	for _, entry := range expired {
		id := entry.Member.(string)
		raw, err := q.rdb.Get(ctx, jobPrefix+id).Bytes()
		if errors.Is(err, redis.Nil) {
			q.rdb.ZRem(ctx, keyInflight, id)
			continue
		}
		if err != nil {
			return result, err
		}
		parsed, perr := job.Parse(raw)
		if perr != nil {
			if err := q.Dead(ctx, id, "", raw, "unreadable job: "+perr.Error()); err != nil {
				return result, err
			}
			result.Dead++
			continue
		}
		parsed.Attempts++
		parsed.LastError = "the worker did not answer before its lease ended"
		if parsed.Attempts >= maxAttempts {
			if err := q.Dead(ctx, id, parsed.Event.UID, raw, parsed.LastError); err != nil {
				return result, err
			}
			result.Dead++
			continue
		}
		updated, err := json.Marshal(parsed)
		if err != nil {
			return result, err
		}
		moved, err := requeueScript.Run(ctx, q.rdb,
			[]string{keyInflight, keyDue, jobPrefix + id},
			id, int64(entry.Score), string(updated), ms(now.Add(retryIn))).Int()
		if err != nil {
			return result, err
		}
		if moved == 1 {
			result.Requeued++
		}
	}
	return result, nil
}

// Stats is a snapshot for monitoring.
type Stats struct {
	Due      int64 `json:"due"`
	Inflight int64 `json:"inflight"`
	Dead     int64 `json:"dead"`
	// OldestDueSeconds is how late the most overdue job is. Zero when nothing
	// is overdue. A number that keeps growing means the worker is not keeping up.
	OldestDueSeconds int64 `json:"oldestDueSeconds"`
}

// Stats reads the sizes of the queue.
func (q *Queue) Stats(ctx context.Context) (Stats, error) {
	var s Stats
	var err error
	if s.Due, err = q.rdb.ZCard(ctx, keyDue).Result(); err != nil {
		return s, err
	}
	if s.Inflight, err = q.rdb.ZCard(ctx, keyInflight).Result(); err != nil {
		return s, err
	}
	if s.Dead, err = q.rdb.LLen(ctx, keyDead).Result(); err != nil {
		return s, err
	}
	oldest, err := q.rdb.ZRangeWithScores(ctx, keyDue, 0, 0).Result()
	if err != nil {
		return s, err
	}
	if len(oldest) == 1 {
		if late := (ms(q.now()) - int64(oldest[0].Score)) / 1000; late > 0 {
			s.OldestDueSeconds = late
		}
	}
	return s, nil
}

// Ping checks the connection.
func (q *Queue) Ping(ctx context.Context) error { return q.rdb.Ping(ctx).Err() }
