import { randomBytes } from "crypto"
import { hashAdminPassword } from "../lib/admin-auth"

async function readSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Este comando debe ejecutarse en una terminal interactiva")
  }

  process.stdout.write(prompt)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding("utf8")

  return new Promise((resolve, reject) => {
    let value = ""

    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener("data", onData)
      process.stdout.write("\n")
    }

    const onData = (character: string) => {
      if (character === "\u0003") {
        cleanup()
        reject(new Error("Operación cancelada"))
      } else if (character === "\r" || character === "\n") {
        cleanup()
        resolve(value)
      } else if (character === "\u007f") {
        value = value.slice(0, -1)
      } else if (character >= " ") {
        value += character
      }
    }

    process.stdin.on("data", onData)
  })
}

async function main() {
  const username = process.argv[2]?.trim()
  if (!username) {
    throw new Error("Uso: pnpm admin:generate-secrets <usuario>")
  }

  const password = await readSecret("Contraseña administrativa: ")
  const confirmation = await readSecret("Repetir contraseña: ")
  if (password !== confirmation) throw new Error("Las contraseñas no coinciden")

  const passwordHash = await hashAdminPassword(password)
  const sessionSecret = randomBytes(48).toString("base64url")

  process.stdout.write(
    [
      "\nCopiá estos valores a .env.local y a Vercel:",
      `ADMIN_USERNAME=${username}`,
      `ADMIN_PASSWORD_HASH=${passwordHash}`,
      `ADMIN_SESSION_SECRET=${sessionSecret}`,
      "",
    ].join("\n"),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
