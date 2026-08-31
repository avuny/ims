// scripts/generate-openapi.ts
import { writeFileSync, mkdirSync } from "fs"
import { dirname } from "path"
import { app } from "../src/routes.js"
const outputPath = "./openapi/openapi.json"

// make sure the directory exists
mkdirSync(dirname(outputPath), { recursive: true })

const spec = app.getOpenAPIDocument({
  openapi: "3.0.0",
  info: {
    title: "IMS API",
    version: "1.0.0",
  },
})

writeFileSync(outputPath, JSON.stringify(spec, null, 2), "utf-8")

console.log("OpenAPI spec generated at", outputPath)
