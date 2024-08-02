/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require('path')
import { type Request, type Response, type NextFunction } from 'express'

module.exports = function serveKeyFiles () {
  return ({ params }: Request, res: Response, next: NextFunction) => {
    const file = params.file

    // Canonicalize the path to prevent directory traversal
    const resolvedPath = path.resolve('encryptionkeys', file)
    const intendedPath = path.resolve('encryptionkeys')

    if (resolvedPath.startsWith(intendedPath) && path.basename(file) === file) {
      res.sendFile(resolvedPath)
    } else {
      res.status(403)
      next(new Error('Invalid file path!'))
    }
  }
}
