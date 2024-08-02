/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require('path')
import { type Request, type Response, type NextFunction } from 'express'

module.exports = function serveQuarantineFiles () {
  return ({ params, query }: Request, res: Response, next: NextFunction) => {
    const file = params.file

    const quarantinePath = path.resolve('ftp/quarantine/')
    const resolvedPath = path.resolve(quarantinePath, file)

    if (!resolvedPath.startsWith(quarantinePath)) {
      res.status(403)
      next(new Error('Invalid file path!'))
    } else {
      res.sendFile(resolvedPath)
    }
  }
}
