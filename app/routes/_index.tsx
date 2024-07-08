import { HttpServerRequest } from '@effect/platform';
import type { MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Effect } from 'effect';
import { makeLoader, RemixArgs } from '~/remix-effect';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

export const loader = makeLoader(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / loader');

    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;

      return { url: request.url, reqId: yield* RemixArgs.requestId };
    }).pipe(Effect.withSpan('/ loader'));
  })
);

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Welcome to Remix Effect</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
