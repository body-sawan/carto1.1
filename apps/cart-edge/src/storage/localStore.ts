import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CartSession } from "@carto/shared";

export class LocalStore {
  constructor(private readonly filePath: string) {}

  async loadSession(): Promise<CartSession | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as CartSession;
    } catch {
      return null;
    }
  }

  async saveSession(session: CartSession): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(session, null, 2), "utf8");
  }

  async clearSession(): Promise<void> {
    await rm(this.filePath, { force: true });
  }
}
