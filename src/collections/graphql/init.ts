import { DateTimeResolver } from 'graphql-scalars';
import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLInt,
} from 'graphql';

import formatName from '../../graphql/utilities/formatName';
import buildPaginatedListType from '../../graphql/schema/buildPaginatedListType';
import { BaseFields } from './types';
import { getCollectionIDType } from '../../graphql/schema/buildMutationInputType';
import { buildVersionCollectionFields } from '../../versions/buildCollectionFields';

function registerCollections(): void {
  const {
    findVersions, findVersionByID, restoreVersion,
    create, find, findByID, deleteResolver, update,
  } = this.graphQL.resolvers.collections;

  const {
    login, logout, me, init, refresh, forgotPassword, resetPassword, verifyEmail, unlock,
  } = this.graphQL.resolvers.collections.auth;

  Object.keys(this.collections).forEach((slug) => {
    const collection = this.collections[slug];
    const {
      config: {
        labels: {
          singular,
          plural,
        },
        fields,
        timestamps,
      },
    } = collection;

    const singularLabel = formatName(singular);
    let pluralLabel = formatName(plural);

    // For collections named 'Media' or similar,
    // there is a possibility that the singular name
    // will equal the plural name. Append `all` to the beginning
    // of potential conflicts

    if (singularLabel === pluralLabel) {
      pluralLabel = `all${singularLabel}`;
    }

    collection.graphQL = {};

    const idField = fields.find(({ name }) => name === 'id');
    const idType = getCollectionIDType(collection.config);

    const baseFields: BaseFields = {};

    const whereInputFields = [
      ...fields,
    ];

    if (!idField) {
      baseFields.id = { type: idType };
      whereInputFields.push({
        name: 'id',
        type: 'text',
      });
    }

    if (timestamps) {
      baseFields.createdAt = {
        type: new GraphQLNonNull(DateTimeResolver),
      };

      baseFields.updatedAt = {
        type: new GraphQLNonNull(DateTimeResolver),
      };

      whereInputFields.push({
        name: 'createdAt',
        label: 'Created At',
        type: 'date',
      });

      whereInputFields.push({
        name: 'updatedAt',
        label: 'Updated At',
        type: 'date',
      });
    }

    collection.graphQL.type = this.buildObjectType(
      singularLabel,
      fields,
      singularLabel,
      baseFields,
    );

    collection.graphQL.whereInputType = this.buildWhereInputType(
      singularLabel,
      whereInputFields,
      singularLabel,
    );

    if (collection.config.auth) {
      fields.push({
        name: 'password',
        label: 'Password',
        type: 'text',
        required: true,
      });
    }

    collection.graphQL.mutationInputType = new GraphQLNonNull(this.buildMutationInputType(
      singularLabel,
      fields,
      singularLabel,
    ));

    collection.graphQL.updateMutationInputType = new GraphQLNonNull(this.buildMutationInputType(
      `${singularLabel}Update`,
      fields.filter((field) => field.name !== 'id'),
      `${singularLabel}Update`,
      true,
    ));

    this.Query.fields[singularLabel] = {
      type: collection.graphQL.type,
      args: {
        id: { type: idType },
        draft: { type: GraphQLBoolean },
        ...(this.config.localization ? {
          locale: { type: this.types.localeInputType },
          fallbackLocale: { type: this.types.fallbackLocaleInputType },
        } : {}),
      },
      resolve: findByID(collection),
    };

    this.Query.fields[pluralLabel] = {
      type: buildPaginatedListType(pluralLabel, collection.graphQL.type),
      args: {
        where: { type: collection.graphQL.whereInputType },
        draft: { type: GraphQLBoolean },
        ...(this.config.localization ? {
          locale: { type: this.types.localeInputType },
          fallbackLocale: { type: this.types.fallbackLocaleInputType },
        } : {}),
        page: { type: GraphQLInt },
        limit: { type: GraphQLInt },
        sort: { type: GraphQLString },
      },
      resolve: find(collection),
    };

    this.Mutation.fields[`create${singularLabel}`] = {
      type: collection.graphQL.type,
      args: {
        data: { type: collection.graphQL.mutationInputType },
        draft: { type: GraphQLBoolean },
      },
      resolve: create(collection),
    };

    this.Mutation.fields[`update${singularLabel}`] = {
      type: collection.graphQL.type,
      args: {
        id: { type: new GraphQLNonNull(idType) },
        data: { type: collection.graphQL.updateMutationInputType },
        draft: { type: GraphQLBoolean },
        autosave: { type: GraphQLBoolean },
      },
      resolve: update(collection),
    };

    this.Mutation.fields[`delete${singularLabel}`] = {
      type: collection.graphQL.type,
      args: {
        id: { type: new GraphQLNonNull(idType) },
      },
      resolve: deleteResolver(collection),
    };

    if (collection.config.versions) {
      const versionCollectionFields = [
        ...buildVersionCollectionFields(collection.config),
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'createdAt',
          label: 'Created At',
          type: 'date',
        },
        {
          name: 'updatedAt',
          label: 'Updated At',
          type: 'date',
        },
      ];
      collection.graphQL.versionType = this.buildObjectType(
        `${singularLabel}Version`,
        versionCollectionFields,
        `${singularLabel}Version`,
        {},
      );
      this.Query.fields[`version${formatName(singularLabel)}`] = {
        type: collection.graphQL.versionType,
        args: {
          id: { type: GraphQLString },
          ...(this.config.localization ? {
            locale: { type: this.types.localeInputType },
            fallbackLocale: { type: this.types.fallbackLocaleInputType },
          } : {}),
        },
        resolve: findVersionByID(collection),
      };
      this.Query.fields[`versions${pluralLabel}`] = {
        type: buildPaginatedListType(`versions${formatName(pluralLabel)}`, collection.graphQL.versionType),
        args: {
          where: {
            type: this.buildWhereInputType(
              `versions${singularLabel}`,
              versionCollectionFields,
              `versions${singularLabel}`,
            ),
          },
          ...(this.config.localization ? {
            locale: { type: this.types.localeInputType },
            fallbackLocale: { type: this.types.fallbackLocaleInputType },
          } : {}),
          page: { type: GraphQLInt },
          limit: { type: GraphQLInt },
          sort: { type: GraphQLString },
        },
        resolve: findVersions(collection),
      };
      this.Mutation.fields[`restoreVersion${formatName(singularLabel)}`] = {
        type: collection.graphQL.type,
        args: {
          id: { type: GraphQLString },
        },
        resolve: restoreVersion(collection),
      };
    }

    if (collection.config.auth) {
      collection.graphQL.JWT = this.buildObjectType(
        formatName(`${slug}JWT`),
        collection.config.fields.filter((field) => field.saveToJWT).concat([
          {
            name: 'email',
            type: 'email',
            required: true,
          },
          {
            name: 'collection',
            type: 'text',
            required: true,
          },
        ]),
        formatName(`${slug}JWT`),
      );

      this.Query.fields[`me${singularLabel}`] = {
        type: new GraphQLObjectType({
          name: formatName(`${slug}Me`),
          fields: {
            token: {
              type: GraphQLString,
            },
            user: {
              type: collection.graphQL.type,
            },
            exp: {
              type: GraphQLInt,
            },
            collection: {
              type: GraphQLString,
            },
          },
        }),
        resolve: me(slug),
      };

      if (collection.config.auth.maxLoginAttempts > 0) {
        this.Mutation.fields[`unlock${singularLabel}`] = {
          type: new GraphQLNonNull(GraphQLBoolean),
          args: {
            email: { type: new GraphQLNonNull(GraphQLString) },
          },
          resolve: unlock(collection),
        };
      }

      this.Query.fields[`initialized${singularLabel}`] = {
        type: GraphQLBoolean,
        resolve: init(collection),
      };

      this.Mutation.fields[`login${singularLabel}`] = {
        type: new GraphQLObjectType({
          name: formatName(`${slug}LoginResult`),
          fields: {
            token: {
              type: GraphQLString,
            },
            user: {
              type: collection.graphQL.type,
            },
            exp: {
              type: GraphQLInt,
            },
          },
        }),
        args: {
          email: { type: GraphQLString },
          password: { type: GraphQLString },
        },
        resolve: login(collection),
      };

      this.Mutation.fields[`logout${singularLabel}`] = {
        type: GraphQLString,
        resolve: logout(collection),
      };

      this.Mutation.fields[`forgotPassword${singularLabel}`] = {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
          email: { type: new GraphQLNonNull(GraphQLString) },
          disableEmail: { type: GraphQLBoolean },
          expiration: { type: GraphQLInt },
        },
        resolve: forgotPassword(collection),
      };

      this.Mutation.fields[`resetPassword${singularLabel}`] = {
        type: new GraphQLObjectType({
          name: formatName(`${slug}ResetPassword`),
          fields: {
            token: { type: GraphQLString },
            user: { type: collection.graphQL.type },
          },
        }),
        args: {
          token: { type: GraphQLString },
          password: { type: GraphQLString },
        },
        resolve: resetPassword(collection),
      };

      this.Mutation.fields[`verifyEmail${singularLabel}`] = {
        type: GraphQLBoolean,
        args: {
          token: { type: GraphQLString },
        },
        resolve: verifyEmail(collection),
      };

      this.Mutation.fields[`refreshToken${singularLabel}`] = {
        type: new GraphQLObjectType({
          name: formatName(`${slug}Refreshed${singularLabel}`),
          fields: {
            user: {
              type: collection.graphQL.JWT,
            },
            refreshedToken: {
              type: GraphQLString,
            },
            exp: {
              type: GraphQLInt,
            },
          },
        }),
        args: {
          token: { type: GraphQLString },
        },
        resolve: refresh(collection),
      };
    }
  });
}

export default registerCollections;
