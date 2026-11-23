MONAYZGUARD LICENSE WORKER

1) Cai Node.js + Wrangler: npm install -g wrangler
2) Dang nhap: npx wrangler login
3) Trong thu muc license-worker: npx wrangler secret put ADMIN_TOKEN
   Nhap mot chuoi bi mat dai, khong chia se cho khach.
4) Deploy: npx wrangler deploy
5) Tao KEY (thay URL va ADMIN_TOKEN):
   curl -X POST https://TEN-WORKER.workers.dev/admin/create \
     -H "Authorization: Bearer ADMIN_TOKEN" -H "Content-Type: application/json" \
     -d '{"key":"MZG-ABCD-EFGH-IJKL"}'
6) Thu hoi KEY:
   curl -X POST https://TEN-WORKER.workers.dev/admin/revoke \
     -H "Authorization: Bearer ADMIN_TOKEN" -H "Content-Type: application/json" \
     -d '{"key":"MZG-ABCD-EFGH-IJKL"}'

Moi KEY duoc gioi han toi da 3 server ID khac nhau. Durable Object xu ly tung KEY rieng va tuan tu hoa cac lan kich hoat. Khong xoa file plugins/MonayZGuardV2/server-id.txt neu muon giu nguyen dang ky server.
