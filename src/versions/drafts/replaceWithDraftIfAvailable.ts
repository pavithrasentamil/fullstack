import { Payload } from '../..';
import { docHasTimestamps, Where } from '../../types';
import { hasWhereAccessResult } from '../../auth';
import { AccessResult } from '../../config/types';
import { CollectionModel, SanitizedCollectionConfig, TypeWithID } from '../../collections/config/types';
import flattenWhereConstraints from '../../utilities/flattenWhereConstraints';
import sanitizeInternalFields from '../../utilities/sanitizeInternalFields';
import { appendVersionToQueryKey } from './appendVersionToQueryKey';
import { SanitizedGlobalConfig } from '../../globals/config/types';

type Arguments<T> = {
  payload: Payload
  entity: SanitizedCollectionConfig | SanitizedGlobalConfig
  doc: T
  locale: string
  accessResult: AccessResult
}

const replaceWithDraftIfAvailable = async <T extends TypeWithID>({
  payload,
  entity,
  doc,
  locale,
  accessResult,
}: Arguments<T>): Promise<T> => {
  if (docHasTimestamps(doc)) {
    const VersionModel = payload.versions[entity.slug] as CollectionModel;

    let useEstimatedCount = false;
    const queryToBuild: { where: Where } = {
      where: {
        and: [
          {
            parent: {
              equals: doc.id,
            },
          },
          {
            'version._status': {
              equals: 'draft',
            },
          },
          {
            updatedAt: {
              greater_than: doc.updatedAt,
            },
          },
        ],
      },
    };

    if (hasWhereAccessResult(accessResult)) {
      const versionAccessResult = appendVersionToQueryKey(accessResult);
      queryToBuild.where.and.push(versionAccessResult);
    }

    const constraints = flattenWhereConstraints(queryToBuild);
    useEstimatedCount = constraints.some((prop) => Object.keys(prop).some((key) => key === 'near'));
    const query = await VersionModel.buildQuery(queryToBuild, locale);

    let draft = await VersionModel.findOne(query, {}, {
      lean: true,
      useEstimatedCount,
      sort: { updatedAt: 'desc' },
    });

    if (!draft) {
      return doc;
    }

    draft = JSON.parse(JSON.stringify(draft));
    draft = sanitizeInternalFields(draft);

    // Disregard all other draft content at this point,
    // Only interested in the version itself.
    // Operations will handle firing hooks, etc.
    return {
      id: doc.id,
      ...draft.version,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  return doc;
};

export default replaceWithDraftIfAvailable;
