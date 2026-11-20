#!/usr/bin/env node
/**
 * Crea (o promueve) el primer administrador del panel.
 *
 *   ADMIN_EMAIL=dueño@tubarberia.cl ADMIN_PASSWORD='una-clave-segura' npm run db:seed-admin
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (lee .env.local si existe).
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Administrador";

if (!url || !key) {
  console.error("✗ Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!email || !password || password.length < 10) {
  console.error("✗ Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 10 caracteres)");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

let userId;
const { data, error } = await sb.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: name },
});
if (error) {
  if (!/already|registered|exists/i.test(error.message)) {
    console.error("✗", error.message);
    process.exit(1);
  }
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 });
  userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  console.log("• El usuario ya existía; se le asignará el rol admin.");
} else {
  userId = data.user.id;
}
if (!userId) {
  console.error("✗ No se pudo encontrar el usuario");
  process.exit(1);
}

const { error: pErr } = await sb.from("profiles").upsert({ id: userId, email, full_name: name, role: "admin" });
if (pErr) {
  console.error("✗", pErr.message);
  process.exit(1);
}
console.log(`✓ Administrador listo: ${email}. Ingresa en /admin/login`);
