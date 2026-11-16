import http from "node:http";
import { createApp } from "../../src/app";

/**
 * The Express app wrapped in an HTTP server that is already listening on
 * 127.0.0.1, for Supertest (`request(app)`).
 *
 * Why not hand Supertest the bare Express app: it would call `listen(0)` itself,
 * which binds the wildcard address, and then connect to `127.0.0.1:<port>`. On
 * macOS another process can already hold that same port on 127.0.0.1 only (each
 * `mongodb-memory-server` does, and so can a local proxy or dev server), the
 * kernel allows the wildcard bind anyway, and the request lands on the wrong
 * process. That shows up as an occasional `404`, `501` or a foreign JSON error
 * body in a random test, more often the more test files run in parallel. Binding
 * 127.0.0.1 explicitly makes the kernel pick a port nobody holds there.
 *
 * The server is closed after the test file's last test.
 */
export function buildTestApp() {
  const server = http.createServer(createApp());

  // `listen` is asynchronous; Supertest reads `address()` when a request is
  // made, which is always after the test file has started running tests.
  const ready = new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  beforeAll(() => ready);
  afterAll(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  );

  return server;
}
