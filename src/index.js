const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8" }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "POST") return json({ ok: false, message: "POST only" }, 405);
    if (url.pathname === "/admin/create") {
      if (request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`)
        return json({ ok: false, message: "Unauthorized" }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid JSON" }, 400); }
      const key = String(body.key || "").trim();
      if (!/^[A-Z0-9-]{12,80}$/.test(key)) return json({ ok: false, message: "Key format invalid" }, 400);
      const id = env.LICENSES.idFromName(key);
      return env.LICENSES.get(id).fetch("https://license.internal/create", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, maxServers: 3, active: true })
      });
    }
    if (url.pathname === "/admin/revoke") {
      if (request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`)
        return json({ ok: false, message: "Unauthorized" }, 401);
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid JSON" }, 400); }
      const key = String(body.key || "").trim();
      const id = env.LICENSES.idFromName(key);
      return env.LICENSES.get(id).fetch("https://license.internal/revoke", { method: "POST" });
    }
    if (url.pathname === "/verify") {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid JSON" }, 400); }
      const key = String(body.key || "").trim();
      const serverId = String(body.serverId || "").trim();
      if (!key || !serverId || serverId.length > 100) return json({ ok: false, message: "Missing key/serverId" }, 400);
      const id = env.LICENSES.idFromName(key);
      return env.LICENSES.get(id).fetch("https://license.internal/verify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, serverId, plugin: String(body.plugin || "") })
      });
    }
    return json({ ok: false, message: "Not found" }, 404);
  }
};

// One Durable Object per license key. DO requests are serialized, so two simultaneous
// activations cannot both exceed the three-server limit.
export class LicenseRecord {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/create") {
      const existing = await this.ctx.storage.get("record");
      if (existing) return json({ ok: false, message: "KEY_ALREADY_EXISTS" }, 409);
      const data = await request.json();
      await this.ctx.storage.put("record", { active: true, maxServers: 3, servers: [], key: data.key });
      return json({ ok: true, message: "Key created", maxServers: 3 });
    }
    const record = await this.ctx.storage.get("record");
    if (!record) return json({ ok: false, message: "KEY_NOT_FOUND" }, 404);
    if (path === "/revoke") {
      record.active = false;
      await this.ctx.storage.put("record", record);
      return json({ ok: true, message: "Key revoked" });
    }
    if (path === "/verify") {
      if (!record.active) return json({ ok: false, message: "KEY_REVOKED" }, 403);
      const verifyBody = await request.json();
      if (verifyBody.plugin !== "MonayZGuardV2") return json({ ok: false, message: "PLUGIN_MISMATCH" }, 403);
      const { serverId } = verifyBody;
      if (!record.servers.includes(serverId)) {
        if (record.servers.length >= record.maxServers)
          return json({ ok: false, message: "SERVER_LIMIT_REACHED (3)" }, 403);
        record.servers.push(serverId);
        await this.ctx.storage.put("record", record);
      }
      return json({ ok: true, message: "LICENSE_VALID", serversUsed: record.servers.length, maxServers: 3 });
    }
    return json({ ok: false, message: "Not found" }, 404);
  }
}
