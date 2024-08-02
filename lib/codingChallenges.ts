import fs from 'fs/promises'
import path from 'path'
import logger from './logger'

export const SNIPPET_PATHS = Object.freeze(['./server.ts', './routes', './lib', './data', './data/static/web3-snippets', './frontend/src/app', './models'])

interface FileMatch {
  path: string
  content: string
}

interface CachedCodeChallenge {
  snippet: string
  vulnLines: number[]
  neutralLines: number[]
}

import path from 'path'
import fs from 'fs/promises'
import { FileMatch } from './types'
import logger from './logger'

const path = require('path')

const isValidPath = (inputPath) => {
  const sanitizedInputPath = path.normalize(inputPath).replace(/^(\.\.[\/\\])+/, '')
  const resolvedPath = path.resolve(sanitizedInputPath)
  return resolvedPath.startsWith(path.resolve(process.cwd()))
}

import path from 'path'
import fs from 'fs/promises'
import { logger } from './logger'

export const findFilesWithCodeChallenges = async (paths: readonly string[]): Promise<FileMatch[]> => {
  const matches = []
  for (const currPath of paths) {
    if (!isValidPath(currPath) || isPathTraversal(currPath)) {
      logger.warn(`Invalid path detected: ${currPath}`)
      continue
    }

    const resolvedPath = path.normalize(currPath);

    try {
      const stat = await fs.lstat(resolvedPath)
      if (stat.isDirectory()) {
        const files = await fs.readdir(resolvedPath)
        const moreMatches = await findFilesWithCodeChallenges(
          files.map(file => path.resolve(resolvedPath, file)).filter(isValidPath)
        )
        matches.push(...moreMatches)
      } else {
        const code = await fs.readFile(resolvedPath, 'utf8')
        if (
          // strings are split so that it doesn't find itself...
          code.includes('// vuln-code' + '-snippet start') ||
          code.includes('# vuln-code' + '-snippet start')
        ) {
          matches.push({ path: resolvedPath, content: code })
        }
      }
    } catch (e) {
      logger.warn(`File ${currPath} could not be read. it might have been moved or deleted. If coding challenges are contained in the file, they will not be available.`)
    }
  }

  return matches
}

const isValidPath = (path: string) => {
  // implement your existing validation logic here
  return true
}

const isPathTraversal = (inputPath: string) => {
  const normalizedPath = path.normalize(inputPath)
  return normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath) || normalizedPath.includes('..')
}

function getCodeChallengesFromFile (file: FileMatch) {
  const fileContent = file.content

  // get all challenges which are in the file by a regex capture group
  const challengeKeyRegex = /[/#]{0,2} vuln-code-snippet start (?<challenges>.*)/g
  const challenges = [...fileContent.matchAll(challengeKeyRegex)]
    .flatMap(match => match.groups?.challenges?.split(' ') ?? [])
    .filter(Boolean)

  return challenges.map((challengeKey) => getCodingChallengeFromFileContent(fileContent, challengeKey))
}

function validateChallengeKey(challengeKey: string) {
  const validKeyPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validKeyPattern.test(challengeKey)) {
    throw new Error('Invalid challengeKey format.');
  }
}

function getCodingChallengeFromFileContent (source: string, challengeKey: string) {
  validateChallengeKey(challengeKey);
  const snippets = source.match(/[/#]{0,2} vuln-code-snippet start.*[\s\S]*vuln-code-snippet end.*[\s\S]+/g)
  if (snippets == null) {
    throw new BrokenBoundary('Broken code snippet boundaries for: ' + challengeKey)
  }
  let snippet = snippets[0] // TODO Currently only a single code snippet is supported
  snippet = snippet.replace(/\s?[/#]{0,2} vuln-code-snippet start.*[\r\n]{0,2}/g, '')
  snippet = snippet.replace(/\s?[/#]{0,2} vuln-code-snippet end.*/g, '')
  snippet = snippet.replace(/.*[/#]{0,2} vuln-code-snippet hide-line[\r\n]{0,2}/g, '')
  snippet = snippet.replace(/.*[/#]{0,2} vuln-code-snippet hide-start([\s\S])*[/#]{0,2} vuln-code-snippet hide-end[\r\n]{0,2}/g, '')
  snippet = snippet.trim()

  let lines = snippet.split('\r\n')
  if (lines.length === 1) lines = snippet.split('\n')
  if (lines.length === 1) lines = snippet.split('\r')
  const vulnLines = []
  const neutralLines = []
  const vulnLinePattern = /vuln-code-snippet vuln-line.*[\s\S]+/g
  const neutralLinePattern = /vuln-code-snippet neutral-line.*[\s\S]+/g

  for (let i = 0; i < lines.length; i++) {
    if (vulnLinePattern.exec(lines[i]) != null) {
      vulnLines.push(i + 1)
    } else if (neutralLinePattern.exec(lines[i]) != null) {
      neutralLines.push(i + 1)
    }
  }
  snippet = snippet.replace(/\s?[/#]{0,2} vuln-code-snippet vuln-line.*/g, '')
  snippet = snippet.replace(/\s?[/#]{0,2} vuln-code-snippet neutral-line.*/g, '')
  return { challengeKey, snippet, vulnLines, neutralLines }
}

class BrokenBoundary extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'BrokenBoundary'
    this.message = message
  }
}

// dont use directly, use getCodeChallenges getter
let _internalCodeChallenges: Map<string, CachedCodeChallenge> | null = null
export async function getCodeChallenges (): Promise<Map<string, CachedCodeChallenge>> {
  if (_internalCodeChallenges === null) {
    _internalCodeChallenges = new Map<string, CachedCodeChallenge>()
    const filesWithCodeChallenges = await findFilesWithCodeChallenges(SNIPPET_PATHS)
    for (const fileMatch of filesWithCodeChallenges) {
      for (const codeChallenge of getCodeChallengesFromFile(fileMatch)) {
        _internalCodeChallenges.set(codeChallenge.challengeKey, {
          snippet: codeChallenge.snippet,
          vulnLines: codeChallenge.vulnLines,
          neutralLines: codeChallenge.neutralLines
        })
      }
    }
  }
  return _internalCodeChallenges
}
