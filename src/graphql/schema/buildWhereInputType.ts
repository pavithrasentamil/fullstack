/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-use-before-define */
import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLString,
} from 'graphql';

import { GraphQLJSON } from 'graphql-type-json';

import { DateTimeResolver, EmailAddressResolver } from 'graphql-scalars';
import {
  optionIsObject,
  ArrayField,
  CheckboxField,
  CodeField,
  DateField,
  EmailField,
  Field,
  FieldWithSubFields,
  GroupField,
  NumberField,
  RadioField,
  RelationshipField,
  RichTextField,
  RowField,
  SelectField,
  TextareaField,
  TextField,
  UploadField,
  PointField,
  FieldAffectingData,
  fieldAffectsData,
  fieldHasSubFields,
  fieldIsPresentationalOnly,
} from '../../fields/config/types';
import formatName from '../utilities/formatName';
import combineParentName from '../utilities/combineParentName';
import withOperators from './withOperators';
import { operators } from './operators';
import buildInputObject from './buildInputObject';

// buildWhereInputType is similar to buildObjectType and operates
// on a field basis with a few distinct differences.
//
// 1. Everything needs to be a GraphQLInputObjectType or scalar / enum
// 2. Relationships, groups, repeaters and flex content are not
//    directly searchable. Instead, we need to build a chained pathname
//    using dot notation so Mongo can properly search nested paths.

const fieldToSchemaMap = (parentName: string) => ({
  number: (field: NumberField) => {
    const type = GraphQLFloat;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, ...operators.comparison],
      ),
    };
  },
  text: (field: TextField) => {
    const type = GraphQLString;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, 'like'],
      ),
    };
  },
  email: (field: EmailField) => {
    const type = EmailAddressResolver;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, 'like'],
      ),
    };
  },
  textarea: (field: TextareaField) => {
    const type = GraphQLString;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, 'like'],
      ),
    };
  },
  richText: (field: RichTextField) => {
    const type = GraphQLJSON;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, 'like'],
      ),
    };
  },
  code: (field: CodeField) => {
    const type = GraphQLString;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, 'like'],
      ),
    };
  },
  radio: (field: RadioField) => ({
    type: withOperators(
      field,
      new GraphQLEnumType({
        name: `${combineParentName(parentName, field.name)}_Input`,
        values: field.options.reduce((values, option) => {
          if (optionIsObject(option)) {
            return {
              ...values,
              [formatName(option.value)]: {
                value: option.value,
              },
            };
          }

          return {
            ...values,
            [formatName(option)]: {
              value: option,
            },
          };
        }, {}),
      }),
      parentName,
      [...operators.equality, 'like'],
    ),
  }),
  date: (field: DateField) => {
    const type = DateTimeResolver;
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, ...operators.comparison, 'like'],
      ),
    };
  },
  point: (field: PointField) => {
    const type = GraphQLList(GraphQLFloat);
    return {
      type: withOperators(
        field,
        type,
        parentName,
        [...operators.equality, ...operators.comparison, ...operators.geo],
      ),
    };
  },
  relationship: (field: RelationshipField) => {
    let type = withOperators(
      field,
      GraphQLString,
      parentName,
      [...operators.equality, ...operators.contains],
    );

    if (Array.isArray(field.relationTo)) {
      type = new GraphQLInputObjectType({
        name: `${combineParentName(parentName, field.name)}_Relation`,
        fields: {
          relationTo: {
            type: new GraphQLEnumType({
              name: `${combineParentName(parentName, field.name)}_Relation_RelationTo`,
              values: field.relationTo.reduce((values, relation) => ({
                ...values,
                [formatName(relation)]: {
                  value: relation,
                },
              }), {}),
            }),
          },
          value: { type: GraphQLString },
        },
      });
    }

    if (field.hasMany) {
      return {
        type: new GraphQLList(type),
      };
    }

    return { type };
  },
  upload: (field: UploadField) => ({
    type: withOperators(
      field,
      GraphQLString,
      parentName,
      [...operators.equality],
    ),
  }),
  checkbox: (field: CheckboxField) => ({
    type: withOperators(
      field,
      GraphQLBoolean,
      parentName,
      [...operators.equality],
    ),
  }),
  select: (field: SelectField) => ({
    type: withOperators(
      field,
      new GraphQLEnumType({
        name: `${combineParentName(parentName, field.name)}_Input`,
        values: field.options.reduce((values, option) => {
          if (typeof option === 'object' && option.value) {
            return {
              ...values,
              [formatName(option.value)]: {
                value: option.value,
              },
            };
          }

          if (typeof option === 'string') {
            return {
              ...values,
              [option]: {
                value: option,
              },
            };
          }

          return values;
        }, {}),
      }),
      parentName,
      [...operators.equality, ...operators.contains],
    ),
  }),
  array: (field: ArrayField) => recursivelyBuildNestedPaths(parentName, field),
  group: (field: GroupField) => recursivelyBuildNestedPaths(parentName, field),
  row: (field: RowField) => field.fields.reduce((rowSchema, rowField) => {
    const getFieldSchema = fieldToSchemaMap(parentName)[rowField.type];

    if (getFieldSchema) {
      const rowFieldSchema = getFieldSchema(rowField);

      if (fieldHasSubFields(rowField)) {
        return [
          ...rowSchema,
          ...rowFieldSchema,
        ];
      }

      if (fieldAffectsData(rowField)) {
        return [
          ...rowSchema,
          {
            key: rowField.name,
            type: rowFieldSchema,
          },
        ];
      }
    }


    return rowSchema;
  }, []),
});

export const recursivelyBuildNestedPaths = (parentName: string, field: FieldWithSubFields & FieldAffectingData) => {
  const nestedPaths = field.fields.reduce((nestedFields, nestedField) => {
    if (!fieldIsPresentationalOnly(nestedField)) {
      const getFieldSchema = fieldToSchemaMap(parentName)[nestedField.type];
      const nestedFieldName = fieldAffectsData(nestedField) ? `${field.name}__${nestedField.name}` : undefined;

      if (getFieldSchema) {
        const fieldSchema = getFieldSchema({
          ...nestedField,
          name: nestedFieldName,
        });

        if (Array.isArray(fieldSchema)) {
          return [
            ...nestedFields,
            ...fieldSchema,
          ];
        }

        return [
          ...nestedFields,
          {
            key: nestedFieldName,
            type: fieldSchema,
          },
        ];
      }
    }

    return nestedFields;
  }, []);

  return nestedPaths;
};

const buildWhereInputType = (name: string, fields: Field[], parentName: string): GraphQLInputObjectType => {
  // This is the function that builds nested paths for all
  // field types with nested paths.

  const fieldTypes = fields.reduce((schema, field) => {
    if (!fieldIsPresentationalOnly(field) && !field.hidden) {
      const getFieldSchema = fieldToSchemaMap(parentName)[field.type];

      if (getFieldSchema) {
        const fieldSchema = getFieldSchema(field);

        if (fieldHasSubFields(field)) {
          return {
            ...schema,
            ...(fieldSchema.reduce((subFields, subField) => ({
              ...subFields,
              [formatName(subField.key)]: subField.type,
            }), {})),
          };
        }

        return {
          ...schema,
          [formatName(field.name)]: fieldSchema,
        };
      }
    }

    return schema;
  }, {});

  fieldTypes.id = {
    type: withOperators(
      { name: 'id' } as FieldAffectingData,
      GraphQLJSON,
      parentName,
      [...operators.equality, ...operators.contains],
    ),
  };

  const fieldName = formatName(name);

  return buildInputObject(fieldName, fieldTypes);
};

export default buildWhereInputType;
