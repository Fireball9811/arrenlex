import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const apiDir = path.join(root, "app", "api")
const skipFiles = new Set([
  path.normalize("app/api/auth/login/route.ts"),
])

const COUNT_FILES = new Set([
  path.normalize("app/api/mantenimiento/count/route.ts"),
  path.normalize("app/api/intake/count/route.ts"),
  path.normalize("app/api/solicitudes-visita/count/route.ts"),
])

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (ent.name === "route.ts") acc.push(p)
  }
  return acc
}

function rel(p) {
  return path.normalize(path.relative(root, p))
}

function addApiAuthImport(content) {
  if (content.includes("@/lib/auth/api-auth")) return content
  const lines = content.split("\n")
  let lastImport = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) lastImport = i
  }
  const importLine =
    'import { getApiAuth, requireApiAuth, isApiAuth } from "@/lib/auth/api-auth"'
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, importLine)
  } else {
    lines.unshift(importLine)
  }
  return lines.join("\n")
}

function trimApiAuthImport(content, needs) {
  const { getApiAuth, requireApiAuth, isApiAuth } = needs
  const names = []
  if (getApiAuth) names.push("getApiAuth")
  if (requireApiAuth) names.push("requireApiAuth")
  if (isApiAuth) names.push("isApiAuth")
  if (names.length === 0) {
    return content.replace(
      /import \{ getApiAuth, requireApiAuth, isApiAuth \} from "@\/lib\/auth\/api-auth"\n?/,
      ""
    )
  }
  return content.replace(
    /import \{ getApiAuth, requireApiAuth, isApiAuth \} from "@\/lib\/auth\/api-auth"/,
    `import { ${names.join(", ")} } from "@/lib/auth/api-auth"`
  )
}

function removeUnusedCreateClient(content) {
  if (content.includes("createClient(")) return content
  return content
    .replace(
      /import \{ createClient \} from "@\/lib\/supabase\/server"\n/,
      ""
    )
    .replace(
      /import \{ createClient \} from '@\/lib\/supabase\/server'\n/,
      ""
    )
}

function removeUnusedGetUserRole(content) {
  if (content.includes("getUserRole(")) return content
  return content
    .replace(/import \{ getUserRole(, type UserRole)? \} from "@\/lib\/auth\/role"\n/, "")
    .replace(/import \{ type UserRole, getUserRole \} from "@\/lib\/auth\/role"\n/, "")
    .replace(/, getUserRole/g, "")
    .replace(/getUserRole, /g, "")
}

function removeUnusedIsAdminRole(content) {
  if (content.includes("isAdminRole(")) return content
  return content.replace(/import \{ isAdminRole \} from "@\/lib\/auth\/role"\n/, "")
}

// Pattern: auth + getUserRole (401 variants)
const AUTH_ROLE_PATTERNS = [
  // multiline with braces
  /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n\s*\n\s*const role = await getUserRole\(supabase, user\)/g,
  // single line getUser
  /const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\n\s*const role = await getUserRole\(supabase, user\)/g,
  // user: null variant
  /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ user: null \}, \{ status: 401 \}\)\s*\n\s*\}/g,
  // auth only no role - multiline
  /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\s*\{ error: "[^"]*" \},\s*\n\s*\{ status: 401 \}\s*\n\s*\)\s*\n\s*\}/g,
  /const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\s*\{ error: "[^"]*" \},\s*\n\s*\{ status: 401 \}\s*\n\s*\)\s*\n\s*\}/g,
  // try block wrapped
  /const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*console\.log\("[^"]*"\)\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\}/g,
]

const COUNT_PATTERN =
  /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ count: 0 \}\)\s*\n\s*\}\s*\n\s*\n\s*const role = await getUserRole\(supabase, user\)/g

const REQUIRE_BLOCK =
  "const authResult = await requireApiAuth()\n  if (!isApiAuth(authResult)) return authResult\n  const { userId, role, supabase, user } = authResult"

const GET_AUTH_BLOCK =
  "const auth = await getApiAuth()\n  if (!auth) {\n    return NextResponse.json({ count: 0 })\n  }\n  const { userId, role, supabase, user } = auth"

const REQUIRE_NO_ROLE =
  "const authResult = await requireApiAuth()\n  if (!isApiAuth(authResult)) return authResult\n  const { userId, supabase, user } = authResult"

function migrateFile(filePath) {
  const r = rel(filePath)
  if (skipFiles.has(r)) return { status: "skipped", reason: "auth/login excluded" }
  let content = fs.readFileSync(filePath, "utf8")
  if (!content.includes("supabase.auth.getUser")) return null

  const isCount = COUNT_FILES.has(r)
  const original = content

  // Count pattern C
  if (isCount) {
    content = content.replace(COUNT_PATTERN, GET_AUTH_BLOCK)
  }

  // Auth + role patterns (repeat until no more matches)
  let prev
  do {
    prev = content
    content = content.replace(
      /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n\s*\n\s*const role = await getUserRole\(supabase, user\)/g,
      REQUIRE_BLOCK
    )
    content = content.replace(
      /const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\n\s*const role = await getUserRole\(supabase, user\)/g,
      REQUIRE_BLOCK
    )
    // getUserRole after other code (generar-pdf)
    content = content.replace(
      /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n\s*\n([\s\S]*?)const role = await getUserRole\(supabase, user\)/g,
      (m, middle) =>
        `${REQUIRE_BLOCK}\n\n${middle.trim()}\n\n  // role from authResult`
    )
  } while (content !== prev && content.includes("supabase.auth.getUser"))

  // Fix generar-pdf style - need manual if comment left
  content = content.replace(/\n\n  \/\/ role from authResult/g, "")

  // Auth only (no getUserRole immediately after)
  content = content.replace(
    /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse.json\(\{ user: null \}, \{ status: 401 \}\)\s*\n\s*\}/g,
    REQUIRE_NO_ROLE
  )
  content = content.replace(
    /const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\s*\{ error: "[^"]*" \},\s*\n\s*\{ status: 401 \}\s*\n\s*\)\s*\n\s*\}/g,
    REQUIRE_NO_ROLE
  )
  content = content.replace(
    /const supabase = await createClient\(\)\s*\n\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*console\.log\("[^"]*"\)\s*\n\s*return NextResponse\.json\(\{ error: "[^"]*" \}, \{ status: 401 \}\)\s*\n\s*\}/g,
    REQUIRE_NO_ROLE
  )

  // isAdminRole -> role === "admin"
  content = content.replace(/await isAdminRole\(supabase, user\.id\)/g, 'role === "admin"')
  content = content.replace(/await isAdminRole\(supabase, userId\)/g, 'role === "admin"')
  // perfiles pattern: isAdmin before role - need role from auth first
  content = content.replace(
    /const isAdmin = await isAdminRole\(supabase, user\.id\)/g,
    'const isAdmin = role === "admin"'
  )
  content = content.replace(
    /const isAdmin = role === "admin"\s*\n\s*if \(user\.id !== id && !isAdmin\)/g,
    "if (userId !== id && role !== \"admin\")"
  )
  // simplify after above - remove isAdmin var if only used once
  content = content.replace(
    /const isAdmin = role === "admin"\s*\n\s*if \([^)]+\)/g,
    (m) => m
  )

  if (!content.includes("supabase.auth.getUser") && content !== original) {
    const needs = {
      getApiAuth: content.includes("getApiAuth("),
      requireApiAuth: content.includes("requireApiAuth("),
      isApiAuth: content.includes("isApiAuth("),
    }
    if (needs.getApiAuth || needs.requireApiAuth || needs.isApiAuth) {
      content = addApiAuthImport(content)
      content = trimApiAuthImport(content, needs)
    }
    content = removeUnusedCreateClient(content)
    content = removeUnusedGetUserRole(content)
    content = removeUnusedIsAdminRole(content)
    fs.writeFileSync(filePath, content)
    return { status: "modified" }
  }

  if (content.includes("supabase.auth.getUser")) {
    return { status: "needs_manual", content: original }
  }
  return null
}

const files = walk(apiDir)
const habeas = path.join(root, "lib", "habeas-data", "route-auth.ts")
if (fs.existsSync(habeas)) files.push(habeas)

const results = { modified: [], skipped: [], needsManual: [] }

for (const f of files) {
  const r = migrateFile(f)
  if (!r) continue
  if (r.status === "modified") results.modified.push(rel(f))
  else if (r.status === "skipped") results.skipped.push({ file: rel(f), reason: r.reason })
  else if (r.status === "needs_manual") results.needsManual.push(rel(f))
}

// habeas-data special migration
const habeasPath = path.join(root, "lib", "habeas-data", "route-auth.ts")
if (fs.existsSync(habeasPath)) {
  let c = fs.readFileSync(habeasPath, "utf8")
  if (c.includes("supabase.auth.getUser")) {
    c = c.replace(
      /const supabase = await createClient\(\)\s*\n\s*const \{\s*\n\s*data: \{ user \},\s*\n\s*\} = await supabase\.auth\.getUser\(\)\s*\n\s*\n\s*if \(!user\) \{\s*\n\s*return \{ ok: false, response: NextResponse\.json\(\{ error: "No autorizado" \}, \{ status: 401 \}\) \}\s*\n\s*\}\s*\n\s*\n\s*const role = await getUserRole\(supabase, user\)/,
      `const authResult = await requireApiAuth()\n  if (!isApiAuth(authResult)) {\n    return { ok: false, response: authResult }\n  }\n  const { userId, role, supabase } = authResult`
    )
    c = c.replace(/userId: user\.id/g, "userId")
    if (!c.includes("@/lib/auth/api-auth")) {
      c = c.replace(
        'import { NextResponse } from "next/server"',
        'import { NextResponse } from "next/server"\nimport { requireApiAuth, isApiAuth } from "@/lib/auth/api-auth"'
      )
    }
    if (!c.includes("createClient(")) {
      c = c.replace(/import \{ createClient \} from "@\/lib\/supabase\/server"\n/, "")
    }
    if (!c.includes("getUserRole(")) {
      c = c.replace(/import \{ getUserRole, type UserRole \} from "@\/lib\/auth\/role"/, 'import { type UserRole } from "@/lib/auth/role"')
    }
    fs.writeFileSync(habeasPath, c)
    if (!results.modified.includes(rel(habeasPath))) results.modified.push(rel(habeasPath))
    const idx = results.needsManual.indexOf(rel(habeasPath))
    if (idx >= 0) results.needsManual.splice(idx, 1)
  }
}

console.log(JSON.stringify(results, null, 2))
