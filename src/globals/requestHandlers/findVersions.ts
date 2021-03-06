import { Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { PayloadRequest } from '../../express/types';
import { TypeWithID } from '../../collections/config/types';
import { PaginatedDocs } from '../../mongoose/types';
import { SanitizedGlobalConfig } from '../config/types';

export default function findVersions(global: SanitizedGlobalConfig) {
  async function handler<T extends TypeWithID = any>(req: PayloadRequest, res: Response, next: NextFunction): Promise<Response<PaginatedDocs<T>> | void> {
    try {
      let page;

      if (typeof req.query.page === 'string') {
        const parsedPage = parseInt(req.query.page, 10);

        if (!Number.isNaN(parsedPage)) {
          page = parsedPage;
        }
      }

      const options = {
        req,
        globalConfig: global,
        where: req.query.where,
        page,
        limit: req.query.limit,
        sort: req.query.sort,
        depth: req.query.depth,
      };

      const result = await this.operations.globals.findVersions(options);

      return res.status(httpStatus.OK).json(result);
    } catch (error) {
      return next(error);
    }
  }

  const findVersionsandler = handler.bind(this);

  return findVersionsandler;
}
