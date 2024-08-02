/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'path'
import * as utils from '../utils'
import logger from '../logger'
import { copyFile, access } from 'fs/promises'
import { glob } from 'glob'
import { createHash } from 'crypto'

const exists = async (p: string) => await access(p).then(() => true).catch(() => false)

const sanitizePath = (userInput: string) => {
  const finalPath = path.resolve(userInput);
  const normalizedPath = path.normalize(finalPath);
  if (!normalizedPath.startsWith(path.resolve('.'))) {
    throw new Error('Invalid path: Path traversal detected');
  }
  return normalizedPath;
};

const restoreOverwrittenFilesWithOriginals = async () => {
  await copyFile(sanitizePath('data/static/legal.md'), sanitizePath('ftp/legal.md'))

  if (await exists(sanitizePath('frontend/dist'))) {
    await copyFile(
      sanitizePath('data/static/owasp_promo.vtt'),
      sanitizePath('frontend/dist/frontend/assets/public/videos/owasp_promo.vtt')
    )
  }

  try {
    const files = await glob(sanitizePath('data/static/i18n/*.json'))
    await Promise.all(
      files.map(async (filename: string) => {
        await copyFile(filename, sanitizePath(path.join('i18n/', path.basename(filename))))
      })
    )
  } catch (err) {
    logger.warn('Error listing JSON files in /data/static/i18n folder: ' + utils.getErrorMessage(err))
  }
}

export default restoreOverwrittenFilesWithOriginals
