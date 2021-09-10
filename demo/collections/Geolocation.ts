/* eslint-disable no-param-reassign */
import { CollectionConfig } from '../../src/collections/config/types';

const validateFieldTransformAction = (hook: string, value) => {
  if (value !== undefined && value !== null && !Array.isArray(value)) {
    console.error(hook, value);
    throw new Error('Field transformAction should convert value to array [x, y] and not { coordinates: [x, y] }');
  }
  return value;
};

const Geolocation: CollectionConfig = {
  slug: 'geolocation',
  labels: {
    singular: 'Geolocation',
    plural: 'Geolocations',
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeRead: [
      (operation) => operation.doc,
    ],
    beforeChange: [
      (operation) => {
        // eslint-disable-next-line no-param-reassign,operator-assignment
        operation.data.beforeChange = !operation.data.location?.coordinates;
        return operation.data;
      },
    ],
    afterRead: [
      (operation) => {
        const { doc } = operation;
        doc.afterReadHook = !doc.location?.coordinates;
        return doc;
      },
    ],
    afterChange: [
      (operation) => {
        const { doc } = operation;
        doc.afterChangeHook = !doc.location?.coordinates;
        return doc;
      },
    ],
    afterDelete: [
      (operation) => {
        const { doc } = operation;
        operation.doc.afterDeleteHook = !doc.location?.coordinates;
        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'location',
      type: 'point',
      label: 'Location',
      hooks: {
        beforeValidate: [({ value }) => validateFieldTransformAction('beforeValidate', value)],
        beforeChange: [({ value }) => validateFieldTransformAction('beforeChange', value)],
        afterChange: [({ value }) => validateFieldTransformAction('afterChange', value)],
        afterRead: [({ value }) => validateFieldTransformAction('afterRead', value)],
      },
    },
    {
      name: 'localizedPoint',
      type: 'point',
      label: 'Localized Point',
      localized: true,
      hooks: {
        beforeValidate: [({ value }) => validateFieldTransformAction('beforeValidate', value)],
        beforeChange: [({ value }) => validateFieldTransformAction('beforeChange', value)],
        afterChange: [({ value }) => validateFieldTransformAction('afterChange', value)],
        afterRead: [({ value }) => validateFieldTransformAction('afterRead', value)],
      },
    },
    {
      name: 'points',
      type: 'array',
      hooks: {
        beforeChange: [
          ({ value }) => (value ? (value as {location: number[]}[]).map((point) => (
            // TODO: this should work
            { location: [point[0] + 1, point[1] + 1] }
            // instead of the above, the transformActions from a parent level hook does not work as expected
            // the below is necessary to set point data because child point data isn't being transformed correctly:
            // {
            //   location: {
            //     type: 'Point',
            //     coordinates: [
            //       point.location[0] + 1,
            //       point.location[1] + 1,
            //     ],
            //   },
            // }
          )) : null),
        ],
      },
      fields: [
        {
          name: 'location',
          type: 'point',
          label: 'Location',
          hooks: {
            beforeValidate: [({ value }) => validateFieldTransformAction('beforeValidate', value)],
            beforeChange: [({ value }) => validateFieldTransformAction('beforeChange', value)],
            afterChange: [({ value }) => validateFieldTransformAction('afterChange', value)],
            afterRead: [({ value }) => validateFieldTransformAction('afterRead', value)],
          },
        },
      ],
    },
  ],
};

export default Geolocation;
