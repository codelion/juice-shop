/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require('path')
import { type Request, type Response, type NextFunction } from 'express'
import fs = require('fs')

module.exports = function serveLogFiles () {
  return ({ params }: Request, res: Response, next: NextFunction) => {
    const file = params.file

    if (!file.includes('/')) {
      const filePath = path.resolve('logs', file)
      const logsDir = path.resolve('logs')

      if (filePath.startsWith(logsDir)) {
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (err) {
            res.status(404)
            next(new Error('File not found'))
          } else {
            res.sendFile(filePath)
          }
        })
      } else {
        res.status(403)
        next(new Error('Invalid file path'))
      }
    } else {
      res.status(403)
      next(new Error('File names cannot contain forward slashes!'))
    }
  }
}
