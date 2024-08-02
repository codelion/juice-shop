/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path from 'path'
import * as utils from '../utils'
import logger from '../logger'
import { copyFile, access } from 'fs/promises'
import { glob } from 'glob'

const exists = async (filePath: string) => await access(filePath).then(() => true).catch(() => false)

const isValidPath = (base: string, target: string) => {
  const targetPath = path.normalize(target).replace(/^(\.\.(\/|\\|$))+/, '');
  return targetPath && targetPath.startsWith(base);
}

const restoreOverwrittenFilesWithOriginals = async () => {
  const baseDir = path.resolve('data/static');
  const ftpDir = path.resolve('ftp');
  const frontendDistDir = path.resolve('frontend/dist');
  const i18nDir = path.resolve('i18n');

  const filePaths = [
    ['legal.md', ftpDir],
    ['owasp_promo.vtt', path.resolve(frontendDistDir, 'frontend/assets/public/videos')]
  ];

  for (const [filename, destinationDir] of filePaths) {
    const srcPath = path.resolve(baseDir, filename);
    const destPath = path.resolve(destinationDir, filename);
    if (isValidPath(baseDir, srcPath) && isValidPath(destinationDir, destPath)) {
      await copyFile(srcPath, destPath);
    }
  }

  if (await exists(frontendDistDir)) {
    const promoFileSrc = path.resolve(baseDir, 'owasp_promo.vtt');
    const promoFileDest = path.resolve(frontendDistDir, 'frontend/assets/public/videos/owasp_promo.vtt');
    if (isValidPath(baseDir, promoFileSrc) && isValidPath(frontendDistDir, promoFileDest)) {
      await copyFile(promoFileSrc, promoFileDest);
    }
  }

  try {
    const files = await glob(path.resolve(baseDir, 'i18n/*.json'));
    await Promise.all(
      files.map(async (filename: string) => {
        const destFilename = path.join(i18nDir, path.basename(filename));
        if (isValidPath(baseDir, filename) && isValidPath(i18nDir, destFilename)) {
          await copyFile(filename, destFilename);
        }
      })
    );
  } catch (err) {
    logger.warn('Error listing JSON files in /data/static/i18n folder: ' + utils.getErrorMessage(err));
  }
}

export default restoreOverwrittenFilesWithOriginals
