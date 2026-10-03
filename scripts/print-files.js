const fs = require("fs")
const path = require("path")

const args = process.argv.slice(2)

// Intercept help flags before running the script
if (args.includes("--help") || args.includes("-h")) {
  printHelp()
  process.exit(0)
}

const targetDir = args[0] || "."
const includePattern = args[1]
const excludePattern = args[2]

/**
 * Prints the documentation and usage instructions for the CLI script.
 */
function printHelp() {
  console.log(`
Print Nested Files - CLI Utility

Usage: 
  node printFiles.js [directory] [include_pattern] [exclude_pattern]

Description:
  Recursively reads files in a directory and prints their contents to the console,
  preceded by a header containing the file's full path. 
  Note: Automatically skips 'node_modules' and '.git' directories.

Arguments:
  directory         The target directory to scan (default: '.')
  include_pattern   Only print files ending with this string (e.g., '.js', '.txt')
  exclude_pattern   Skip files ending with this string (e.g., '.test.js', '.min.js')

Options:
  -h, --help        Show this help documentation and exit

Examples:
  node printFiles.js .                    Scan current directory
  node printFiles.js ./src .js            Scan './src' for '.js' files
  node printFiles.js ./src .js .test.js   Scan './src' for '.js', excluding '.test.js'
    `)
}

/**
 * Recursively scans a directory and processes files based on include/exclude patterns.
 *
 * @param {string} dir - The path to the directory to scan.
 */
function processDirectory(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message)
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue
      processDirectory(fullPath)
    } else if (entry.isFile()) {
      if (includePattern && !entry.name.endsWith(includePattern)) continue
      if (excludePattern && entry.name.endsWith(excludePattern)) continue

      printFile(fullPath)
    }
  }
}

/**
 * Reads a file's content and prints it to stdout with a formatted path header.
 *
 * @param {string} filePath - The full path of the file to read and print.
 */
function printFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8")

    console.log("\n==================================================")
    console.log(`File: ${filePath}`)
    console.log("==================================================\n")

    console.log(content)
  } catch (err) {
    console.error(`\n[!] Error reading file ${filePath}:`, err.message)
  }
}

// Start execution
console.log(`Scanning directory: ${targetDir}`)
if (includePattern)
  console.log(`Including files ending with: ${includePattern}`)
if (excludePattern)
  console.log(`Excluding files ending with: ${excludePattern}`)

processDirectory(targetDir)
