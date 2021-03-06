/* eslint-disable no-param-reassign */
export default function findByID(collection) {
  async function resolver(_, args, context) {
    if (args.locale) context.req.locale = args.locale;
    if (args.fallbackLocale) context.req.fallbackLocale = args.fallbackLocale;

    const options = {
      collection,
      id: args.id,
      req: context.req,
      draft: args.draft,
    };

    const result = await this.operations.collections.findByID(options);

    return result;
  }

  const findByIDResolver = resolver.bind(this);
  return findByIDResolver;
}
