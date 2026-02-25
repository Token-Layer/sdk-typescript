import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";

const SOURCE_SPEC = resolve(
  process.cwd(),
  "..",
  "..",
  "api-docs",
  "openapi.yaml",
);
const OUTPUT_SPEC = resolve(
  process.cwd(),
  "src",
  "generated",
  "token-layer-openapi.yaml",
);

const doc = YAML.parse(readFileSync(SOURCE_SPEC, "utf8"));
const requiredPaths = ["/token-layer"];
const optionalPaths = ["/info"];

for (const path of requiredPaths) {
  if (!doc?.paths?.[path]) {
    throw new Error(`Path ${path} not found in ${SOURCE_SPEC}`);
  }
}

const includedPaths = [
  ...requiredPaths,
  ...optionalPaths.filter((path) => Boolean(doc?.paths?.[path])),
];

const refsToProcess = [];
const seenRefs = new Set();

function addRef(ref) {
  if (typeof ref !== "string" || !ref.startsWith("#/components/")) return;
  if (seenRefs.has(ref)) return;
  seenRefs.add(ref);
  refsToProcess.push(ref);
}

function scanForRefs(value) {
  if (Array.isArray(value)) {
    for (const item of value) scanForRefs(item);
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "$ref" && typeof child === "string") {
        addRef(child);
      } else {
        scanForRefs(child);
      }
    }
  }
}

function getByRef(ref, root) {
  const parts = ref.replace(/^#\//, "").split("/");
  let current = root;
  for (const part of parts) {
    current = current?.[part];
  }
  return current;
}

function setByRef(ref, targetRoot, value) {
  const parts = ref.replace(/^#\//, "").split("/");
  let current = targetRoot;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

const selectedPathEntries = Object.fromEntries(
  includedPaths.map((path) => [path, doc.paths[path]]),
);

for (const pathItem of Object.values(selectedPathEntries)) {
  scanForRefs(pathItem);
}

if (doc.security) {
  scanForRefs(doc.security);
}

while (refsToProcess.length > 0) {
  const ref = refsToProcess.shift();
  const resolved = getByRef(ref, doc);
  if (resolved === undefined) continue;

  scanForRefs(resolved);
}

const nextDoc = {
  openapi: doc.openapi,
  info: doc.info,
  servers: doc.servers,
  paths: selectedPathEntries,
  components: {},
};

for (const ref of seenRefs) {
  const resolved = getByRef(ref, doc);
  if (resolved !== undefined) {
    setByRef(ref, nextDoc, resolved);
  }
}

writeFileSync(OUTPUT_SPEC, YAML.stringify(nextDoc), "utf8");
console.log(`Wrote token-layer spec: ${OUTPUT_SPEC}`);
